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
  DOMAIN_TX,
  generateId,
  TxProcessor,
  WorkspaceEvent,
  type Doc,
  type MeasureContext,
  type SessionData,
  type Tx,
  type TxCUD,
  type TxResult,
  type TxWorkspaceEvent
} from '@hcengineering/core'
import { PlatformError, unknownError } from '@hcengineering/platform'
import type { DBAdapterManager, Middleware, PipelineContext, TxMiddlewareResult } from '@hcengineering/server-core'
import { BaseMiddleware } from '@hcengineering/server-core'

/**
 * Will store transactions to tx adapter
 * @public
 */
export class TxMiddleware extends BaseMiddleware implements Middleware {
  adapterManager!: DBAdapterManager
  static async create (ctx: MeasureContext, context: PipelineContext, next?: Middleware): Promise<Middleware> {
    const middleware = new TxMiddleware(context, next)
    if (context.adapterManager == null) {
      throw new PlatformError(unknownError('Adapter manager should be specified'))
    }
    middleware.adapterManager = context.adapterManager
    return middleware
  }

  async init (ctx: MeasureContext): Promise<void> {}

  async tx (ctx: MeasureContext, txes: Tx[]): Promise<TxMiddlewareResult> {
    const txToStore: Tx[] = []
    for (const tx of txes) {
      if (tx.space !== core.space.DerivedTx && TxProcessor.isExtendsCUD(tx._class)) {
        const objectClass = (tx as TxCUD<Doc>).objectClass
        if (
          objectClass !== core.class.BenchmarkDoc &&
          this.context.hierarchy.findDomain(objectClass) !== DOMAIN_TRANSIENT
        ) {
          txToStore.push(tx)
        }
      }
    }
    let txPromise: Promise<TxResult[]> | undefined
    if (txToStore.length > 0) {
      txPromise = ctx.with(
        'domain-tx',
        {},
        (ctx) => this.adapterManager.getAdapter(DOMAIN_TX, true).tx(ctx, ...txToStore),
        {
          count: txToStore.length,
          txes: Array.from(new Set(txToStore.map((it) => it._class)))
        }
      )
      // We need to remember last Tx Id in context, so it will be used during reconnect to track a requirement for refresh.
      this.context.lastTx = txToStore[txToStore.length - 1]._id
      // We need to deliver information to all clients so far.
      const evt: TxWorkspaceEvent = {
        _class: core.class.TxWorkspaceEvent,
        _id: generateId(),
        event: WorkspaceEvent.LastTx,
        modifiedBy: core.account.System,
        modifiedOn: Date.now(),
        objectSpace: core.space.DerivedTx,
        space: core.space.DerivedTx,
        params: {
          lastTx: this.context.lastTx
        }
      }
      ;(ctx.contextData as SessionData).broadcast.txes.push(evt)
    }
    if (txPromise !== undefined) {
      await txPromise
    }
    return await this.provideTx(ctx, txes)
  }
}
