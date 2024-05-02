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

import core, { MeasureContext, ServerStorage, Tx, TxCreateDoc, Space, TxApplyIf, TxProcessor } from '@hcengineering/core'
import { BroadcastFunc, Middleware, SessionContext, TxMiddlewareResult } from '@hcengineering/server-core'
import { BaseMiddleware } from './base'

/**
 * @public
 */
export class SpaceOwnersMiddleware extends BaseMiddleware implements Middleware {
  private constructor (storage: ServerStorage, next?: Middleware) {
    super(storage, next)
  }

  static async create (
    ctx: MeasureContext,
    broadcast: BroadcastFunc,
    storage: ServerStorage,
    next?: Middleware
  ): Promise<SpaceOwnersMiddleware> {
    return new SpaceOwnersMiddleware(storage, next)
  }

  handleBroadcast (tx: Tx[], targets?: string[]): Tx[] {
    return this.provideHandleBroadcast(tx, targets)
  }

  async tx (ctx: SessionContext, tx: Tx): Promise<TxMiddlewareResult> {
    this.processTx(tx)

    return await this.provideTx(ctx, tx)
  }

  processTx = (tx: Tx): void => {
    if (tx._class === core.class.TxApplyIf) {
      (tx as TxApplyIf).txes.forEach(this.processTx)
      return
    }

    const actualTx = TxProcessor.extractTx(tx)

    if (actualTx.objectSpace !== core.space.Space || actualTx._class !== core.class.TxCreateDoc) {
      return
    }

    const createTx = actualTx as TxCreateDoc<Space>

    if (createTx.attributes.owners !== undefined || !this.storage.hierarchy.isDerived(createTx.objectClass, core.class.Space)) {
      return
    }

    createTx.attributes.owners = [createTx.createdBy as any] // createdBy is not actually optional but filled by the system
  }
}
