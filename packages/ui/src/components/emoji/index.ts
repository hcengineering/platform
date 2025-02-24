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
import type { IntlString } from '@hcengineering/platform'
import IconFrequentlyUsed from './icons/FrequentlyUsed.svelte'
import IconGettingWorkDone from './icons/GettingWorkDone.svelte'
import IconSmileysAndPeople from './icons/SmileysAndPeople.svelte'
import IconAnimalsAndNature from './icons/AnimalsAndNature.svelte'
import IconFoodAndDrink from './icons/FoodAndDrink.svelte'
import IconTravelAndPlaces from './icons/TravelAndPlaces.svelte'
import IconActivities from './icons/Activities.svelte'
import IconObjects from './icons/Objects.svelte'
import IconSymbols from './icons/Symbols.svelte'
import IconFlags from './icons/Flags.svelte'

import plugin from '../../plugin'
import type { EmojiCategory } from './types'

export * from './types'
export * from './store'
export * from './utils'

export { default as EmojiPopup } from './EmojiPopup.svelte'
export { default as EmojiButton } from './EmojiButton.svelte'

export const emojiCategories: EmojiCategory[] = [
  { id: 'frequently-used', label: plugin.string.FrequentlyUsed, icon: IconFrequentlyUsed },
  {
    id: 'getting-work-done',
    label: plugin.string.GettingWorkDone,
    icon: IconGettingWorkDone,
    emojisString: [
      '2705',
      '1F440',
      '1F64C',
      '1F64F',
      '2795',
      '2796',
      '1F44F',
      '1F4A1',
      '1F3AF',
      '1F44B',
      '1F44D',
      '1F389',
      '0031-FE0F-20E3',
      '0032-FE0F-20E3',
      '0033-FE0F-20E3',
      '1F4E3',
      '26AA',
      '1F535',
      '1F534',
      '1F3CE'
    ]
  },
  {
    id: 'smileys-people',
    label: plugin.string.SmileysAndPeople,
    icon: IconSmileysAndPeople,
    categories: ['smileys-emotion', 'people-body']
  },
  {
    id: 'animals-nature',
    label: plugin.string.AnimalsAndNature,
    icon: IconAnimalsAndNature,
    categories: 'animals-nature'
  },
  { id: 'food-drink', label: plugin.string.FoodAndDrink, icon: IconFoodAndDrink, categories: 'food-drink' },
  { id: 'travel-places', label: plugin.string.TravelAndPlaces, icon: IconTravelAndPlaces, categories: 'travel-places' },
  { id: 'activities', label: plugin.string.Activities, icon: IconActivities, categories: 'activities' },
  { id: 'objects', label: plugin.string.Objects, icon: IconObjects, categories: 'objects' },
  { id: 'symbols', label: plugin.string.Symbols, icon: IconSymbols, categories: 'symbols' },
  { id: 'flags', label: plugin.string.Flags, icon: IconFlags, categories: 'flags' }
]

export const skinTonesCodes = [0x1f3fb, 0x1f3fc, 0x1f3fd, 0x1f3fe, 0x1f3ff]

export const skinTones: Map<number, IntlString> = new Map<number, IntlString>(
  [
    plugin.string.NoTone,
    plugin.string.Light,
    plugin.string.MediumLight,
    plugin.string.Medium,
    plugin.string.MediumDark,
    plugin.string.Dark
  ].map((label, index) => [index, label])
)
