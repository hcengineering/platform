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
  registerOperationLog,
  updateOperationLog,
  type MeasureContext,
  type Metrics,
  type OperationLog,
  type SessionData,
  type Tx,
  type TxApplyIf
} from '@hcengineering/core'
import type { Middleware, PipelineContext, TxMiddlewareResult } from '@hcengineering/server-core'
import { BaseMiddleware } from '@hcengineering/server-core'

/**
 * Will support apply tx
 * @public
 */
export class ContextNameMiddleware extends BaseMiddleware implements Middleware {
  scopes = new Map<string, Promise<any>>()

  static async create (ctx: MeasureContext, context: PipelineContext, next?: Middleware): Promise<Middleware> {
    return new ContextNameMiddleware(context, next)
  }

  async tx (ctx: MeasureContext, txes: Tx[]): Promise<TxMiddlewareResult> {
    let measureName: string | undefined

    const tx = txes.find((it) => it._class === core.class.TxApplyIf)
    if (tx !== undefined) {
      // We have at least one fineOne, lets' perform each TxApply individually
      if ((tx as TxApplyIf).measureName !== undefined) {
        measureName = (tx as TxApplyIf).measureName
      }
    }

    let op: OperationLog | undefined
    let opLogMetrics: Metrics | undefined

    const result = await ctx.with(
      measureName !== undefined ? `📶 ${measureName}` : 'client-tx',
      { _class: tx?._class },
      async (ctx) => {
        ;({ opLogMetrics, op } = registerOperationLog(ctx))
        return await this.provideTx(ctx as MeasureContext<SessionData>, txes)
      }
    )
    updateOperationLog(opLogMetrics, op)

    return result
  }
}
