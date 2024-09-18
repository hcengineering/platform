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
  type LoadModelResponse,
  type MeasureContext,
  type Timestamp,
  type Tx,
  DOMAIN_TX
} from '@hcengineering/core'
import { PlatformError, unknownError } from '@hcengineering/platform'
import type { Middleware, PipelineContext, TxAdapter, TxMiddlewareResult } from '@hcengineering/server-core'
import { BaseMiddleware } from '@hcengineering/server-core'
import crypto from 'node:crypto'

/**
 * @public
 */
export class ModelMiddleware extends BaseMiddleware implements Middleware {
  hashes!: Map<string, number> // Hash to position
  lastHash: string = ''
  lastHashResponse!: Promise<LoadModelResponse>
  model!: Tx[]

  static async create (ctx: MeasureContext, context: PipelineContext, next?: Middleware): Promise<Middleware> {
    const middleware = new ModelMiddleware(context, next)
    await middleware.init(ctx)
    return middleware
  }

  async init (ctx: MeasureContext): Promise<void> {
    if (this.context.adapterManager == null) {
      throw new PlatformError(unknownError('Adapter manager should be configured'))
    }
    const txAdapter = this.context.adapterManager.getAdapter(DOMAIN_TX, true) as TxAdapter

    this.model = await ctx.with('get-model', {}, async (ctx) => {
      const model = await ctx.with('fetch-model', {}, (ctx) => txAdapter.getModel(ctx))
      for (const tx of model) {
        try {
          this.context.hierarchy.tx(tx)
        } catch (err: any) {
          ctx.warn('failed to apply model transaction, skipping', { tx: JSON.stringify(tx), err })
        }
      }
      this.context.modelDb.addTxes(ctx, model, false)
      return model
    })

    this.setModel(this.model)
  }

  private addModelTx (tx: Tx): void {
    this.model.push(tx)
    const h = crypto.createHash('sha1')
    h.update(this.lastHash)
    h.update(JSON.stringify(tx))
    const hash = h.digest('hex')
    this.hashes.set(hash, this.model.length - 1)
    this.setLastHash(hash)
  }

  private setLastHash (hash: string): void {
    this.lastHash = hash
    this.lastHashResponse = Promise.resolve({
      full: false,
      hash,
      transactions: []
    })
  }

  private setModel (model: Tx[]): void {
    let last = ''
    this.hashes = new Map(
      model.map((it, index) => {
        const h = crypto.createHash('sha1')
        h.update(last)
        h.update(JSON.stringify(it))
        last = h.digest('hex')
        return [last, index]
      })
    )
    this.setLastHash(last)
  }

  loadModel (ctx: MeasureContext, lastModelTx: Timestamp, hash?: string): Promise<Tx[] | LoadModelResponse> {
    if (hash !== undefined) {
      if (hash === this.lastHash) {
        return this.lastHashResponse
      }
      const pos = this.hashes.get(hash)
      if (pos != null && pos >= 0) {
        return Promise.resolve({
          full: false,
          hash: this.lastHash,
          transactions: this.model.slice(pos + 1)
        })
      }
      return Promise.resolve({
        full: true,
        hash: this.lastHash,
        transactions: [...this.model]
      })
    }
    return Promise.resolve(this.model.filter((it) => it.modifiedOn > lastModelTx))
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
