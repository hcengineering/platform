//
// Copyright © 2024 Hardcore Engineering Inc.
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
  type Domain,
  DOMAIN_MODEL,
  groupByArray,
  TxProcessor,
  withContext,
  type Doc,
  type MeasureContext,
  type SessionData,
  type Tx,
  type TxCUD,
  type TxResult
} from '@hcengineering/core'
import { PlatformError, unknownError } from '@hcengineering/platform'
import type {
  DbAdapter,
  DBAdapterManager,
  Middleware,
  PipelineContext,
  TxMiddlewareResult
} from '@hcengineering/server-core'
import { BaseMiddleware } from '@hcengineering/server-core'

/**
 * Will route transactions to domain adapters.
 * @public
 */
export class DomainTxMiddleware extends BaseMiddleware implements Middleware {
  adapterManager!: DBAdapterManager

  @withContext('domainTx-middleware')
  static async create (ctx: MeasureContext, context: PipelineContext, next?: Middleware): Promise<Middleware> {
    const middleware = new DomainTxMiddleware(context, next)
    if (context.adapterManager == null) {
      throw new PlatformError(unknownError('Domain adapter manager should be specified'))
    }
    middleware.adapterManager = context.adapterManager
    return middleware
  }

  async tx (ctx: MeasureContext<SessionData>, txes: Tx[]): Promise<TxMiddlewareResult> {
    const txToStore: Tx[] = []

    for (const tx of txes) {
      if (TxProcessor.isExtendsCUD(tx._class)) {
        txToStore.push(tx)
      }
    }
    let result: TxMiddlewareResult = {}
    if (txToStore.length > 0) {
      result = await this.routeTx(ctx, txToStore)
    }
    // Chain to next, to update all stuff
    await this.provideTx(ctx, txes)
    if (Array.isArray(result) && result.length === 1) {
      return result[0]
    }
    return result
  }

  private async routeTx (ctx: MeasureContext<SessionData>, txes: Tx[]): Promise<TxResult[]> {
    const result: TxResult[] = []

    const adapterGroups = new Map<string, TxCUD<Doc>[]>()

    const routeToAdapter = async (adapter: DbAdapter, txes: TxCUD<Doc>[]): Promise<void> => {
      if (txes.length > 0) {
        // Find all deleted documents
        const toDelete = txes.filter((it) => it._class === core.class.TxRemoveDoc)

        if (toDelete.length > 0) {
          const deleteByDomain = groupByArray(toDelete, (it) => this.context.hierarchy.getDomain(it.objectClass))

          for (const [domain, domainTxes] of deleteByDomain.entries()) {
            if (domain === DOMAIN_MODEL) {
              for (const tx of domainTxes) {
                const ddoc = this.context.modelDb.findObject(tx.objectId)
                if (ddoc !== undefined) {
                  ctx.contextData.removedMap.set(ddoc._id, ddoc)
                }
              }
            } else {
              const todel = await ctx.with(
                'adapter-load',
                {},
                () =>
                  adapter.load(
                    ctx,
                    domain,
                    domainTxes.map((it) => it.objectId)
                  ),
                { count: toDelete.length }
              )

              for (const ddoc of todel) {
                ctx.contextData.removedMap.set(ddoc._id, ddoc)
              }
            }
          }
        }

        const classes = Array.from(new Set(txes.map((it) => it.objectClass)))
        const _classes = Array.from(new Set(txes.map((it) => it._class)))
        const r = await ctx.with('adapter-tx', {}, (ctx) => adapter.tx(ctx, ...txes), {
          txes: txes.length,
          classes,
          _classes
        })

        if (Array.isArray(r)) {
          result.push(...r)
        } else {
          result.push(r)
        }
      }
    }

    const domains = new Set<Domain>()
    for (const tx of txes) {
      const txCUD = tx as TxCUD<Doc>
      if (!TxProcessor.isExtendsCUD(txCUD._class)) {
        // Skip unsupported tx
        ctx.error('Unsupported transaction', tx)
        continue
      }
      const domain = this.context.hierarchy.findDomain(txCUD.objectClass)
      if (domain === undefined) continue
      domains.add(domain)
      const adapterName = this.adapterManager.getAdapterName(domain)

      let group = adapterGroups.get(adapterName)
      if (group === undefined) {
        group = []
        adapterGroups.set(adapterName, group)
      }
      group.push(txCUD)
    }

    // We need to mark domains to set existing
    for (const d of domains) {
      // We need to mark adapter
      this.adapterManager.getAdapter(d, true)
    }

    for (const [adapterName, txes] of adapterGroups.entries()) {
      const adapter = this.adapterManager.getAdapterByName(adapterName, true)
      await routeToAdapter(adapter, txes)
    }
    return result
  }
}
