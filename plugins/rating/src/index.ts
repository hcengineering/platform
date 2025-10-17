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

import {
  Class,
  Domain,
  Ref,
  type AccountUuid,
  type AttachedDoc,
  type Blob,
  type Doc,
  type PersonId
} from '@hcengineering/core'
import { Asset, IntlString, plugin, Plugin } from '@hcengineering/platform'
import { type AnyComponent } from '@hcengineering/ui/src/types'

// [date, created, updated, deleted, messages, todos, hours]
export type DateCUD = [/* date */ number, /* created */ number, /* updated */ number, /* deleted */ number]

// Automatically calculated document rating.
export interface DocRating extends AttachedDoc {
  // A current document rating
  rating: number

  updates: number // Total number of document updates
  messages: number // Total number of child messages updates.
  children: number // A child updates.

  stars: number // A number of stars earned
  reactions: number // A number of reactions earned
}

export enum ReactionKind {
  Emoji = 0, // Just an emoji reaction, ❤️, 📌, 😊, 😕, 😠, 🤔
  Star = 1, // A paid ⭐ 🌟, or paid negative star  ✭ ✭, value = 1 => star visible for anyone and used for starred, value = 0, visible for anyone, but not shown in starred.
  RateValue = 3 // A rating value from 0 to 10.
}

export interface DocReaction extends AttachedDoc {
  // A reaction type identifier
  reactionType: ReactionKind
  value: number // +1, -1, 0..10 etc.

  emoji?: string
  image?: Ref<Blob>
}

export interface PersonRating extends Doc {
  accountId: AccountUuid

  // A current person rating
  rating: number // Could be re calculated from values.

  // Document authoring statistics
  months: DateCUD[] // Hold per month authoring stats

  // create/update/delete Hold per domain authoring stats
  stats: Record<string, [number, number, number]>

  socialIds: Record<PersonId, number>

  // A special stats, stars on account and stars on documents, commentas authored by person
  starsEarned: number // All author document stars.
  reactionsEarned: number // All author document reactions

  stars: number // Stars spend
  reactions: number // Reactions created

  rageOperations?: number
}

/**
 * @public
 */
export const ratingId = 'rating' as Plugin

export const DOMAIN_RATING_REACTION = 'rating_reaction' as Domain

export const DOMAIN_PERSON_RATING = 'rating_person' as Domain

/**
 * @public
 */
const ratingPlugin = plugin(ratingId, {
  class: {
    DocRating: '' as Ref<Class<DocRating>>,
    PersonRating: '' as Ref<Class<PersonRating>>,
    DocReaction: '' as Ref<Class<DocReaction>>
  },
  icon: {
    Rating: '' as Asset,
    StarYellow: '' as Asset,
    StarRed: '' as Asset,
    StarGreen: '' as Asset,
    StarBlue: '' as Asset
  },
  string: {
    Rating: '' as IntlString,
    RatingWidget: '' as IntlString,
    Level: '' as IntlString,
    MonthOps: '' as IntlString,
    MonthNoOps: '' as IntlString,
    // Shown when the Rating widget has no items to display (empty state)
    RatingWidgetEmpty: '' as IntlString,
    AddStar: '' as IntlString,
    AddStarAria: '' as IntlString
  },
  component: {
    RatingRing: '' as AnyComponent,
    RatingWidget: '' as AnyComponent,
    DocReactionPresenter: '' as AnyComponent,
    RatingActivities: '' as AnyComponent
  },
  ids: {
    RatingWidget: '' as any
  }
})

export default ratingPlugin

export * from './utils'
