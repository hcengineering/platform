//
// Copyright © 2022 Hardcore Engineering Inc.
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

const isUserTx = (it: Tx): boolean =>
  it.modifiedBy !== core.account.System ||
  (it as TxCUD<Doc>).objectClass === 'contact:class:Person' ||
  (it as TxCUD<Doc>).objectClass === 'contact:class:PersonAccount'

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
    readonly systemTx: Tx[]
  ) {
    super(context, next)
  }

  @withContext('modelAdapter-middleware')
  static async doCreate (
    ctx: MeasureContext,
    context: PipelineContext,
    next: Middleware | undefined,
    systemTx: Tx[]
  ): Promise<Middleware> {
    const middleware = new ModelMiddleware(context, next, systemTx)
    await middleware.init(ctx)
    return middleware
  }

  static create (tx: Tx[]): MiddlewareCreator {
    return (ctx, context, next) => {
      return this.doCreate(ctx, context, next, tx)
    }
  }

  @withContext('get-model')
  async getUserTx (ctx: MeasureContext, txAdapter: TxAdapter): Promise<Tx[]> {
    const allUserTxes = await ctx.with('fetch-model', {}, (ctx) => txAdapter.getModel(ctx))
    return allUserTxes.filter((it) => isUserTx(it) && !isAccountTx(it as TxCUD<Doc>))
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

  async init (ctx: MeasureContext): Promise<void> {
    if (this.context.adapterManager == null) {
      throw new PlatformError(unknownError('Adapter manager should be configured'))
    }
    const txAdapter = this.context.adapterManager.getAdapter(DOMAIN_TX, true) as TxAdapter

    const userTx = await this.getUserTx(ctx, txAdapter)
    const model = this.systemTx.concat(userTx)
    for (const tx of model) {
      try {
        this.context.hierarchy.tx(tx)
      } catch (err: any) {
        ctx.warn('failed to apply model transaction, skipping', { tx: JSON.stringify(tx), err })
      }
    }
    this.context.modelDb.addTxes(ctx, model, true)

    this.setModel(model)
  }

  private addModelTx (tx: Tx): void {
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
      const txAdapter = this.context.adapterManager?.getAdapter(DOMAIN_TX, true) as TxAdapter
      return {
        full: true,
        hash: this.lastHash,
        transactions: this.systemTx.concat(await this.getUserTx(ctx, txAdapter))
      }
    }
    const txAdapter = this.context.adapterManager?.getAdapter(DOMAIN_TX, true) as TxAdapter
    return this.systemTx.concat(await this.getUserTx(ctx, txAdapter)).filter((it) => it.modifiedOn > lastModelTx)
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
