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

import core, { type AccountUuid, type PersonId } from '@hcengineering/core'
import { type Builder, Model } from '@hcengineering/model'
import { TAttachedDoc, TDoc } from '@hcengineering/model-core'
import presentation from '@hcengineering/model-presentation'
import {
  DOMAIN_PERSON_RATING,
  DOMAIN_RATING_REACTION,
  type DateCUD,
  type DocReaction,
  type PersonRating,
  type ReactionKind
} from '@hcengineering/rating'
import view from '@hcengineering/view'
import workbench, { WidgetType } from '@hcengineering/workbench'
import { createActions } from './actions'
import rating from './plugin'

export { ratingId } from '@hcengineering/rating'
export { ratingOperation } from './migration'

@Model(rating.class.DocReaction, core.class.Doc, DOMAIN_RATING_REACTION)
export class TDocReaction extends TAttachedDoc implements DocReaction {
  // A reaction type identifier
  reactionType!: ReactionKind
  value!: number // +1, -1, 0..10 etc.
}

@Model(rating.class.PersonRating, core.class.Doc, DOMAIN_PERSON_RATING)
export class TPersonRating extends TDoc implements PersonRating {
  accountId!: AccountUuid

  // A current person rating
  rating!: number // Could be re calculated from values.

  // Document authoring statistics
  months!: DateCUD[] // Hold per month authoring stats
  days!: DateCUD[] // Hold per day authoring stats
  hours!: DateCUD[] // Hold per hour authoring stats

  stats!: Record<string, [number, number, number]> // create/update/delete Hold per domain authoring stats
  socialIds!: Record<PersonId, number>

  rageOperations!: number

  // A special stats, stars on account and stars on documents, commentas authored by person
  starsEarned!: number // All author document stars.
  reactionsEarned!: number // All author document reactions

  // How many messages person created
  messages!: number

  stars!: number // Stars spend
  reactions!: number // Reactions created
}

export * from './migration'

export function createModel (builder: Builder): void {
  builder.createModel(
    // TDocRating,
    TPersonRating,
    TDocReaction
  )

  createActions(builder)

  builder.createDoc(presentation.class.ComponentPointExtension, core.space.Model, {
    extension: view.extensions.EditDocTitleExtension,
    component: rating.component.RatingEditor
  })

  builder.createDoc(
    workbench.class.Widget,
    core.space.Model,
    {
      label: rating.string.RatingWidget,
      type: WidgetType.Fixed,
      icon: rating.icon.Rating,
      component: rating.component.RatingWidget
    },
    rating.ids.RatingWidget
  )
  builder.mixin(rating.class.DocReaction, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: rating.component.DocReactionPresenter
  })
}

export default rating
