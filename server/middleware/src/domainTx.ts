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
  DOMAIN_TRANSIENT,
  TxProcessor,
  type Doc,
  type Domain,
  type MeasureContext,
  type SessionData,
  type Tx,
  type TxCUD,
  type TxResult
} from '@hcengineering/core'
import { PlatformError, unknownError } from '@hcengineering/platform'
import type { DBAdapterManager, Middleware, PipelineContext, TxMiddlewareResult } from '@hcengineering/server-core'
import { BaseMiddleware } from '@hcengineering/server-core'

/**
 * Will route transactions to domain adapters.
 * @public
 */
export class DomainTxMiddleware extends BaseMiddleware implements Middleware {
  adapterManager!: DBAdapterManager

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
        const objectClass = (tx as TxCUD<Doc>).objectClass
        if (
          objectClass !== core.class.BenchmarkDoc &&
          this.context.hierarchy.findDomain(objectClass) !== DOMAIN_TRANSIENT
        ) {
          txToStore.push(tx)
        }
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

    const domainGroups = new Map<Domain, TxCUD<Doc>[]>()

    const routeToAdapter = async (domain: Domain, txes: TxCUD<Doc>[]): Promise<void> => {
      if (txes.length > 0) {
        // Find all deleted documents

        const adapter = this.adapterManager.getAdapter(domain, true)
        const toDelete = txes.filter((it) => it._class === core.class.TxRemoveDoc).map((it) => it.objectId)

        if (toDelete.length > 0) {
          const toDeleteDocs = await ctx.with(
            'adapter-load',
            { domain },
            async () => await adapter.load(ctx, domain, toDelete),
            { count: toDelete.length }
          )

          for (const ddoc of toDeleteDocs) {
            ctx.contextData.removedMap.set(ddoc._id, ddoc)
          }
        }

        const r = await ctx.with('adapter-tx', { domain }, async (ctx) => await adapter.tx(ctx, ...txes), {
          txes: txes.length
        })

        if (Array.isArray(r)) {
          result.push(...r)
        } else {
          result.push(r)
        }
      }
    }

    for (const tx of txes) {
      const txCUD = TxProcessor.extractTx(tx) as TxCUD<Doc>
      if (!TxProcessor.isExtendsCUD(txCUD._class)) {
        // Skip unsupported tx
        ctx.error('Unsupported transaction', tx)
        continue
      }
      const domain = this.context.hierarchy.getDomain(txCUD.objectClass)

      let group = domainGroups.get(domain)
      if (group === undefined) {
        group = []
        domainGroups.set(domain, group)
      }
      group.push(txCUD)
    }
    for (const [domain, txes] of domainGroups.entries()) {
      await routeToAdapter(domain, txes)
    }
    return result
  }
}
