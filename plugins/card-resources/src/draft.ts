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

import { type Ref, type Markup } from '@hcengineering/core'
import { type CardSpace, type MasterTag } from '@hcengineering/card'
import { EmptyMarkup } from '@hcengineering/text'
import { getCurrentLocation, type Location } from '@hcengineering/ui'

/**
 * Card draft interface for DraftController
 */
export interface CardDraft {
  title: string
  description: Markup
  type: Ref<MasterTag> | undefined
  space: Ref<CardSpace> | undefined
}

/**
 * Generate a location-specific draft key for card drafts
 */
export function getCardDraftKey (location?: Location): string {
  const currentLocation = location ?? getCurrentLocation()
  const locationKey = currentLocation.path.slice(2).join('.') ?? 'root'
  const fragmentKey =
    currentLocation.fragment != null && currentLocation.fragment !== '' ? `.${currentLocation.fragment}` : ''
  return `card_draft.${locationKey}${fragmentKey}`
}

export function getEmptyCardDraft (): CardDraft {
  return {
    title: '',
    description: EmptyMarkup,
    type: undefined,
    space: undefined
  }
}
