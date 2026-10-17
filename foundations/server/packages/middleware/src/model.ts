//
// Copyright © 2022 Hardcore Engineering Inc.
// Copyright © 2026 TraceX SAS.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import core, {
  type Class,
  type Doc,
  type DocumentQuery,
  type FindOptions,
  type FindResult,
  type Hierarchy,
  type LoadModelResponse,
  type MeasureContext,
  type Ref,
  type SessionData,
  type Timestamp,
  type Tx,
  type TxCUD,
  DOMAIN_MODEL,
  DOMAIN_TX,
  withContext
} from '@hcengineering/core'
import { PlatformError, unknownError } from '@hcengineering/platform'
import type {
  Middleware,
  MiddlewareCreator,
  PipelineContext,
  TxAdapter,
  TxMiddlewareResult
} from '@hcengineering/server-core'
import { BaseMiddleware } from '@hcengineering/server-core'
import crypto from 'node:crypto'

const isAccountTx = (it: TxCUD<Doc>): boolean =>
  ['core:class:Account', 'contact:class:PersonAccount'].includes(it.objectClass)

/**
 * @public
 */
export class ModelMiddleware extends BaseMiddleware implements Middleware {
  lastHash: string = ''
  lastHashResponse!: Promise<LoadModelResponse>

  constructor (
    context: PipelineContext,
    next: Middleware | undefined,
    readonly systemTx: Tx[],
    readonly filter?: (h: Hierarchy, model: Tx[]) => Tx[]
  ) {
    super(context, next)
  }

  @withContext('modelAdapter-middleware')
  static async doCreate (
    ctx: MeasureContext,
    context: PipelineContext,
    next: Middleware | undefined,
    systemTx: Tx[],
    filter?: (h: Hierarchy, model: Tx[]) => Tx[]
  ): Promise<Middleware> {
    const middleware = new ModelMiddleware(context, next, systemTx, filter)
    await middleware.init(ctx)
    return middleware
  }

  static create (tx: Tx[], filter?: (h: Hierarchy, model: Tx[]) => Tx[]): MiddlewareCreator {
    return (ctx, context, next) => {
      return this.doCreate(ctx, context, next, tx, filter)
    }
  }

  @withContext('get-model')
  async getUserTx (ctx: MeasureContext, txAdapter: TxAdapter): Promise<Tx[]> {
    const allUserTxes = await ctx.with('fetch-model', {}, (ctx) => txAdapter.getModel(ctx))
    return allUserTxes.filter((it) => !isAccountTx(it as TxCUD<Doc>))
  }

  findAll<T extends Doc>(
    ctx: MeasureContext<SessionData>,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    const d = this.context.hierarchy.findDomain(_class)
    if (d === DOMAIN_MODEL) {
      return this.context.modelDb.findAll(_class, query, options)
    }
    return this.provideFindAll(ctx, _class, query, options)
  }

  // Only needed for a full loadModel, which is rare - an idle pipeline drops it instead of
  // holding megabytes of txs forever. Overridable for tests.
  static modelCacheTtl = 5 * 60 * 1000
  static readonly evictIntervalMs = 60 * 1000
  // Bound on txs held while the cache is gone - a workspace with no clients still gets model
  // txs, and nothing drains the buffer until someone asks for a full model.
  static readonly maxRecentModelTx = 1000

  private userModel: { txs: Tx[], at: number } | undefined
  // Model txs applied while the cache was evicted: lastHash counts them, a fetch may not yet.
  private recentModelTx: Tx[] = []
  private modelFetch: Promise<void> | undefined

  // One timer for every pipeline in the process, started with the first model middleware.
  private static readonly live = new Set<ModelMiddleware>()
  private static evictTimer: NodeJS.Timeout | undefined

  /** Drop every cached user model unused for longer than the TTL, returns how many. */
  static evictExpired (now: number = Date.now()): number {
    let dropped = 0
    for (const m of ModelMiddleware.live) {
      if (m.userModel !== undefined && now - m.userModel.at > ModelMiddleware.modelCacheTtl) {
        m.userModel = undefined
        dropped++
      }
    }
    return dropped
  }

  private static track (m: ModelMiddleware): void {
    ModelMiddleware.live.add(m)
    if (ModelMiddleware.evictTimer === undefined) {
      ModelMiddleware.evictTimer = setInterval(() => {
        ModelMiddleware.evictExpired()
      }, ModelMiddleware.evictIntervalMs)
      ModelMiddleware.evictTimer.unref()
    }
  }

  private static untrack (m: ModelMiddleware): void {
    ModelMiddleware.live.delete(m)
    if (ModelMiddleware.live.size === 0 && ModelMiddleware.evictTimer !== undefined) {
      clearInterval(ModelMiddleware.evictTimer)
      ModelMiddleware.evictTimer = undefined
    }
  }

  async close (): Promise<void> {
    ModelMiddleware.untrack(this)
    this.userModel = undefined
    this.recentModelTx = []
    await super.close()
  }

  async init (ctx: MeasureContext): Promise<void> {
    if (this.context.adapterManager == null) {
      throw new PlatformError(unknownError('Adapter manager should be configured'))
    }
    const txAdapter = this.context.adapterManager.getAdapter(DOMAIN_TX, true) as TxAdapter

    const userTx = await this.getUserTx(ctx, txAdapter)
    // Prime the cache with the fetch we just did - the first client will loadModel right away.
    this.userModel = { txs: userTx, at: Date.now() }
    const model = this.systemTx.concat(userTx)
    for (const tx of model) {
      try {
        this.context.hierarchy.tx(tx)
      } catch (err: any) {
        ctx.warn('failed to apply model transaction, skipping', { tx: JSON.stringify(tx), err })
      }
    }
    const fmodel = this.applyFilter(model)
    this.context.modelDb.addTxes(ctx, fmodel, true)

    this.setModel(fmodel)
    // Only once init cannot fail any more: a middleware that threw never reaches the pipeline,
    // so nothing would ever close it and untrack it again.
    ModelMiddleware.track(this)
  }

  private applyFilter (model: Tx[]): Tx[] {
    return this.filter !== undefined ? this.filter(this.context.hierarchy, model) : model
  }

  private addModelTx (tx: Tx): void {
    // A tx the filter drops is never served, so it must not move the hash either.
    if (this.applyFilter([tx]).length === 0) {
      return
    }
    if (!isAccountTx(tx as TxCUD<Doc>)) {
      if (this.userModel !== undefined) {
        this.userModel.txs.push(tx)
        this.userModel.at = Date.now()
      } else {
        // Bounded: the oldest entries are long committed, only recent ones can outrun the DB.
        this.recentModelTx.push(tx)
        if (this.recentModelTx.length > ModelMiddleware.maxRecentModelTx) {
          this.recentModelTx.shift()
        }
      }
    }
    const h = crypto.createHash('sha1')
    h.update(this.lastHash)
    h.update(JSON.stringify(tx))
    const hash = h.digest('hex')
    this.setLastHash(hash)
  }

  private setLastHash (hash: string): void {
    this.lastHash = hash
    this.context.lastHash = this.lastHash
  }

  private setModel (model: Tx[]): void {
    let last = ''
    model.map((it, index) => {
      const h = crypto.createHash('sha1')
      h.update(last)
      h.update(JSON.stringify(it))
      last = h.digest('hex')
      return [last, index]
    })
    this.setLastHash(last)
  }

  async loadModel (ctx: MeasureContext, lastModelTx: Timestamp, hash?: string): Promise<Tx[] | LoadModelResponse> {
    if (hash !== undefined) {
      if (hash === this.lastHash) {
        return {
          full: false,
          hash,
          transactions: []
        }
      }
      return {
        full: true,
        hash: this.lastHash,
        transactions: await this.getModel(ctx)
      }
    }
    return (await this.getModel(ctx)).filter((it) => it.modifiedOn > lastModelTx)
  }

  private async getModel (ctx: MeasureContext): Promise<Tx[]> {
    if (this.userModel === undefined) {
      // Single flight - concurrent loadModels must not fetch twice and overwrite each other.
      this.modelFetch = this.modelFetch ?? this.fetchUserModel(ctx)
      await this.modelFetch
    }
    const cache = this.userModel
    if (cache === undefined) {
      throw new PlatformError(unknownError('Failed to load workspace model'))
    }
    cache.at = Date.now()
    return this.applyFilter(this.systemTx.concat(cache.txs))
  }

  private async fetchUserModel (ctx: MeasureContext): Promise<void> {
    try {
      const txAdapter = this.context.adapterManager?.getAdapter(DOMAIN_TX, true) as TxAdapter
      const txs = await this.getUserTx(ctx, txAdapter)
      // These are in lastHash already but their DB write may not have landed - dropping one
      // would leave clients permanently short of it.
      if (this.recentModelTx.length > 0) {
        const seen = new Set(txs.map((it) => it._id))
        for (const tx of this.recentModelTx) {
          if (!seen.has(tx._id)) txs.push(tx)
        }
        this.recentModelTx = []
      }
      this.userModel = { txs, at: Date.now() }
    } finally {
      this.modelFetch = undefined
    }
  }

  tx (ctx: MeasureContext, tx: Tx[]): Promise<TxMiddlewareResult> {
    const modelTxes = tx.filter((it) => it.objectSpace === core.space.Model)
    if (modelTxes.length > 0) {
      for (const t of modelTxes) {
        this.context.hierarchy.tx(t)
        this.addModelTx(t)
      }
      this.context.modelDb.addTxes(ctx, modelTxes, true)
    }
    return this.provideTx(ctx, tx)
  }
}
