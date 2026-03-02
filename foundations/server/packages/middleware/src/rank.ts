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
  type TxCreateDoc,
  type TxApplyIf,
  type Doc,
  type Rank,
  type TxMixin,
  type TypeRank,
  SortingOrder
} from '@hcengineering/core'
import { makeRank } from '@hcengineering/rank'
import {
  type Middleware,
  type TxMiddlewareResult,
  type PipelineContext,
  BaseMiddleware
} from '@hcengineering/server-core'

/**
 * Special value to indicate that rank should be auto-generated
 * @public
 */
export const RANK_AUTO = '' as Rank

export class RankMiddleware extends BaseMiddleware implements Middleware {
  private constructor (context: PipelineContext, next?: Middleware) {
    super(context, next)
  }

  static async create (
    ctx: MeasureContext,
    context: PipelineContext,
    next: Middleware | undefined
  ): Promise<RankMiddleware> {
    return new RankMiddleware(context, next)
  }

  async tx (ctx: MeasureContext<SessionData>, txes: Tx[]): Promise<TxMiddlewareResult> {
    for (const tx of txes) {
      await this.processTx(ctx, tx)
    }

    return await this.provideTx(ctx, txes)
  }

  private async processTx (ctx: MeasureContext<SessionData>, tx: Tx): Promise<void> {
    if (tx._class === core.class.TxCreateDoc) {
      await this.setRank(ctx, tx as TxCreateDoc<Doc>)
    } else if (tx._class === core.class.TxApplyIf) {
      const applyTx = tx as TxApplyIf
      for (const atx of applyTx.txes) {
        await this.processTx(ctx, atx)
      }
    }
  }

  private async setRank (ctx: MeasureContext<SessionData>, tx: TxCreateDoc<Doc> | TxMixin<Doc, Doc>): Promise<void> {
    const attributes =
      tx._class === core.class.TxCreateDoc
        ? this.context.hierarchy.getAllAttributes(tx.objectClass)
        : this.context.hierarchy.getOwnAttributes((tx as TxMixin<Doc, Doc>).mixin)

    for (const attr of attributes) {
      if (attr[1].type._class === core.class.TypeRank) {
        const rankAttr = attr[1].name
        const typeRank = attr[1].type as TypeRank

        const rank = (tx.attributes as any)[rankAttr]
        if (rank !== undefined && rank !== RANK_AUTO) {
          continue
        }

        const pos = typeRank.pos ?? 'end'

        // Query for either the first (Beginning) or last (End) document
        const sortOrder = pos === 'end' ? SortingOrder.Descending : SortingOrder.Ascending
        const existingDoc = await this.provideFindAll(
          ctx,
          tx.objectClass,
          { space: tx.objectSpace },
          {
            sort: { [rankAttr]: sortOrder },
            projection: { [rankAttr]: 1 },
            limit: 1
          }
        )

        const lastRank = existingDoc.length > 0 ? (existingDoc[0] as any)[rankAttr] : undefined
        const newRank = pos === 'end' ? makeRank(lastRank, undefined) : makeRank(undefined, lastRank)

        ;(tx.attributes as any)[rankAttr] = newRank
      }
    }
  }
}
