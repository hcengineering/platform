//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2022 Hardcore Engineering Inc.
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
  TxProcessor,
  type Doc,
  type MeasureContext,
  type Tx,
  type TxCreateDoc,
  type TxCUD,
  type TxRemoveDoc,
  type TxUpdateDoc
} from '@hcengineering/core'
import type { Plugin } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'
import rating, { ReactionKind, type DocReaction } from '@hcengineering/rating'
import {
  BaseMiddleware,
  type Middleware,
  type PipelineContext,
  type TxMiddlewareResult
} from '@hcengineering/server-core'

/**
 * @public
 */
export const serverRatingId = 'server-rating' as Plugin

export class RatingMiddleware extends BaseMiddleware {
  static async create (ctx: MeasureContext, context: PipelineContext, next?: Middleware): Promise<Middleware> {
    return new RatingMiddleware(context, next)
  }

  async tx (ctx: MeasureContext, tx: Tx[]): Promise<TxMiddlewareResult> {
    for (const t of tx) {
      if (TxProcessor.isExtendsCUD(t._class)) {
        const cud = t as TxCUD<Doc>

        if (cud.objectClass === rating.class.DocRating || cud.objectClass === rating.class.PersonRating) {
          throw new Error('Direct modifications of ratings are not allowed.')
        }
        const c = rating.class.DocReaction
        if (cud.objectClass === c) {
          // Star/Like,Rate values could only be used one per user.
          switch (cud._class) {
            case core.class.TxCreateDoc:
              // Check for duplicate of like, rate value, Emojii
              await this.validateNewReaction(ctx, cud as TxCreateDoc<DocReaction>)
              break
            case core.class.TxUpdateDoc:
              // Disallow update for Emojii, Star, Like, Usefull
              // Allow only for RateValue
              await this.validateReactionUpdate(ctx, cud as TxUpdateDoc<DocReaction>)
              break
            case core.class.TxRemoveDoc:
              await this.validateReactionRemove(ctx, cud as TxRemoveDoc<DocReaction>)
              break
          }
        }
      }
    }
    return await this.provideTx(ctx, tx)
  }

  private async validateNewReaction (ctx: MeasureContext, create: TxCreateDoc<DocReaction>): Promise<void> {
    if (create.attributes.reactionType !== ReactionKind.Star) {
      // Should allow only one reaction per document per user for Emoji, Like, Usefull
      const current = await this.provideFindAll(ctx, rating.class.DocReaction, {
        attachedTo: create.attachedTo,
        attachedToClass: create.objectClass
      })
      if (
        current.some(
          (it) =>
            it.reactionType === create.attributes.reactionType &&
            (it.value === create.attributes.value ||
              (create.attributes.reactionType === ReactionKind.Emoji && it.emoji === create.attributes.emoji))
        )
      ) {
        throw new Error('Duplicate emoji reaction is not allowed.')
      }
    } else {
      // For stars, we probable need to merge them into one value.
    }
  }

  private async validateReactionUpdate (ctx: MeasureContext, upd: TxUpdateDoc<DocReaction>): Promise<void> {
    if (upd.operations.reactionType !== undefined) {
      throw new Error('Modifications of reaction type are not allowed.')
    }
    // Find current reaction tried to be modified
    const current = (
      await this.provideFindAll(ctx, rating.class.DocReaction, {
        _id: upd.objectId,
        _class: upd.objectClass
      })
    ).shift()
    if (current === undefined) {
      throw new Error('Reaction not found.')
    }
    if (upd.operations.value === undefined || upd.operations.value < 0 || upd.operations.value > 10) {
      throw new Error('Reaction value modification is required.')
    }
  }

  private async validateReactionRemove (ctx: MeasureContext, upd: TxRemoveDoc<DocReaction>): Promise<void> {
    // Find current reaction tried to be modified
    // const current = (
    //   await this.provideFindAll(ctx, rating.class.DocReaction, {
    //     _id: upd.objectId,
    //     _class: upd.objectClass
    //   })
    // ).shift()
    // if (current === undefined) {
    // No error, already removed
    // }
    // if (current.reactionType === ReactionKind.Star) {
    //   throw new Error('Star reactions could not be removed.')
    // }
  }
}

/**
 * @public
 */
export default plugin(serverRatingId, {})
