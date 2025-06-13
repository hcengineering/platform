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

import type { CardID, AccountID, LabelID, CardType, SocialID } from '@hcengineering/communication-types'
import type { BaseRequestEvent } from './common'

export enum LabelRequestEventType {
  // Internal
  CreateLabel = 'createLabel',
  RemoveLabel = 'removeLabel'
}

export type LabelRequestEvent = CreateLabelEvent | RemoveLabelEvent

// Internal
export interface CreateLabelEvent extends BaseRequestEvent {
  type: LabelRequestEventType.CreateLabel
  labelId: LabelID
  cardId: CardID
  cardType: CardType
  account: AccountID
  socialId: SocialID
  date: Date
}

export interface RemoveLabelEvent extends BaseRequestEvent {
  type: LabelRequestEventType.RemoveLabel
  labelId: LabelID
  cardId: CardID
  account: AccountID
  socialId: SocialID
  date: Date
}
