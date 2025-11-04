//
// Copyright © 2025 Hardcore Engineering Inc.
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
  type MeasureContext,
  type Tx,
  type SessionData,
  type TxApplyIf,
  type TxCUD,
  type Doc,
  TxProcessor,
  type UserStatus,
  type TxCreateDoc,
  type TxUpdateDoc,
  type Ref
} from '@hcengineering/core'
import {
  BaseMiddleware,
  type Middleware,
  type TxMiddlewareResult,
  type PipelineContext
} from '@hcengineering/server-core'

/**
 * @public
 */
export class UserStatusMiddleware extends BaseMiddleware implements Middleware {
  private constructor (context: PipelineContext, next?: Middleware) {
    super(context, next)
  }

  static async create (
    _: MeasureContext,
    context: PipelineContext,
    next: Middleware | undefined
  ): Promise<UserStatusMiddleware> {
    return new UserStatusMiddleware(context, next)
  }

  tx (ctx: MeasureContext<SessionData>, txes: Tx[]): Promise<TxMiddlewareResult> {
    for (const tx of txes) {
      if (tx._class === core.class.TxApplyIf) {
        const atx = tx as TxApplyIf
        atx.txes.forEach((it) => {
          this.processTx(it)
        })
      } else {
        this.processTx(tx as TxCUD<Doc>)
      }
    }
    return this.provideTx(ctx, txes)
  }

  private processTx (tx: TxCUD<Doc>): void {
    if (tx._class === core.class.TxCreateDoc && tx.objectClass === core.class.UserStatus) {
      const status = TxProcessor.createDoc2Doc(tx as TxCreateDoc<UserStatus>)
      const map = this.context.userStatusMap ?? new Map()
      map.set(status._id, { online: status.online, user: status.user })
      this.context.userStatusMap = map
    } else if (tx._class === core.class.TxUpdateDoc && tx.objectClass === core.class.UserStatus) {
      const uTx = tx as TxUpdateDoc<UserStatus>
      if ('online' in uTx.operations) {
        const current = this.context.userStatusMap?.get(uTx.objectId)
        const online = uTx.operations.online
        if (current !== undefined && online !== undefined) {
          this.context.userStatusMap?.set(uTx.objectId, { online, user: current.user })
        }
      }
    } else if (tx._class === core.class.TxRemoveDoc && tx.objectClass === core.class.UserStatus) {
      this.context.userStatusMap?.delete(tx.objectId as Ref<UserStatus>)
    }
  }
}
