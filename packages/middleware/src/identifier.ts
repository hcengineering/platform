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
  type Doc,
  type MeasureContext,
  type SessionData,
  type Tx,
  type TxCreateDoc,
  TxFactory
} from '@hcengineering/core'
import { type TxMixin } from '@hcengineering/core/src'
import {
  BaseMiddleware,
  type Middleware,
  type PipelineContext,
  type TxMiddlewareResult
} from '@hcengineering/server-core'

/**
 * @public
 */
export class IdentifierMiddleware extends BaseMiddleware implements Middleware {
  private constructor (context: PipelineContext, next?: Middleware) {
    super(context, next)
  }

  static async create (
    ctx: MeasureContext,
    context: PipelineContext,
    next: Middleware | undefined
  ): Promise<IdentifierMiddleware> {
    return new IdentifierMiddleware(context, next)
  }

  async tx (ctx: MeasureContext<SessionData>, txes: Tx[]): Promise<TxMiddlewareResult> {
    for (const tx of txes) {
      if (isTargetTx(tx)) {
        await this.setIdentifiers(ctx, tx as TxCreateDoc<Doc>)
      }
    }
    return await this.provideTx(ctx, txes)
  }

  private async setIdentifiers (
    ctx: MeasureContext<SessionData>,
    tx: TxCreateDoc<Doc> | TxMixin<Doc, Doc>
  ): Promise<void> {
    const attributes = this.context.hierarchy.getAllAttributes(tx.objectClass)
    for (const attr of attributes) {
      if (attr[1].type._class === core.class.TypeIdentifier) {
        const value = (tx.attributes as any)[attr[1].name]
        if ((value == null && tx._class === core.class.TxCreateDoc) || Object.keys(tx.attributes).length === 0) {
          const sequence = (await this.findAll(ctx, core.class.CustomSequence, { of: attr[1].of }))[0]
          if (sequence === undefined) {
            continue
          }
          const factory = new TxFactory(tx.modifiedBy, true)
          const incrementTx = factory.createTxUpdateDoc(
            sequence._class,
            sequence.space,
            sequence._id,
            {
              $inc: { sequence: 1 }
            },
            true
          )
          const incResult = await this.provideTx(ctx, [incrementTx])
          ;(tx.attributes as any)[attr[1].name] = `${sequence.prefix}-${(incResult as any).object.sequence}`
        }
      }
    }
  }
}

function isTargetTx (tx: Tx): boolean {
  return tx._class === core.class.TxCreateDoc || tx._class === core.class.TxMixin
}
