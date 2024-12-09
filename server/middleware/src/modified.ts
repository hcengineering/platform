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

import core, { MeasureContext, Tx, systemAccountEmail, type SessionData, type TxApplyIf } from '@hcengineering/core'
import { BaseMiddleware, Middleware, TxMiddlewareResult, type PipelineContext } from '@hcengineering/server-core'

/**
 * @public
 */
export class ModifiedMiddleware extends BaseMiddleware implements Middleware {
  private constructor (context: PipelineContext, next?: Middleware) {
    super(context, next)
  }

  static async create (
    ctx: MeasureContext,
    context: PipelineContext,
    next: Middleware | undefined
  ): Promise<ModifiedMiddleware> {
    return new ModifiedMiddleware(context, next)
  }

  tx (ctx: MeasureContext<SessionData>, txes: Tx[]): Promise<TxMiddlewareResult> {
    const now = Date.now()
    function updateTx (tx: Tx): void {
      if (tx.modifiedBy !== core.account.System && ctx.contextData.userEmail !== systemAccountEmail) {
        tx.modifiedOn = now
        tx.createdOn = tx.modifiedOn
      }
    }
    for (const tx of txes) {
      updateTx(tx)
      if (tx._class === core.class.TxApplyIf) {
        const atx = tx as TxApplyIf
        atx.txes.forEach(updateTx)
      }
    }
    return this.provideTx(ctx, txes)
  }
}
