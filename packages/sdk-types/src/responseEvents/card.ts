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

import type { CardID, CardType, SocialID } from '@hcengineering/communication-types'

import type { BaseResponseEvent } from './common'

export enum CardResponseEventType {
  CardTypeUpdated = 'cardTypeUpdated',
  CardRemoved = 'cardRemoved'
}

export type CardResponseEvent = CardTypeUpdatedEvent | CardRemovedEvent

export interface CardTypeUpdatedEvent extends BaseResponseEvent {
  type: CardResponseEventType.CardTypeUpdated
  card: CardID
  cardType: CardType
  creator: SocialID
  created?: Date
}

export interface CardRemovedEvent extends BaseResponseEvent {
  type: CardResponseEventType.CardRemoved
  card: CardID
}
