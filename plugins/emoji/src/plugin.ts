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
import { Asset, type IntlString, plugin, type Plugin } from '@hcengineering/platform'
import { AnyComponent } from '@hcengineering/ui'

/** @public */
export const emojiId = 'emoji' as Plugin

export const emojiPlugin = plugin(emojiId, {
  component: {
    EmojiPopup: '' as AnyComponent
  },
  string: {
    Remove: '' as IntlString,
    SearchResults: '' as IntlString,
    SearchDots: '' as IntlString,
    DefaultSkinTone: '' as IntlString,
    FrequentlyUsed: '' as IntlString,
    GettingWorkDone: '' as IntlString,
    SmileysAndPeople: '' as IntlString,
    AnimalsAndNature: '' as IntlString,
    FoodAndDrink: '' as IntlString,
    TravelAndPlaces: '' as IntlString,
    Activities: '' as IntlString,
    Objects: '' as IntlString,
    Symbols: '' as IntlString,
    Flags: '' as IntlString,
    NoTone: '' as IntlString,
    Light: '' as IntlString,
    MediumLight: '' as IntlString,
    Medium: '' as IntlString,
    MediumDark: '' as IntlString,
    Dark: '' as IntlString
  },
  icon: {
    Activities: '' as Asset,
    AnimalsAndNature: '' as Asset,
    Flags: '' as Asset,
    FoodAndDrink: '' as Asset,
    FrequentlyUsed: '' as Asset,
    GettingWorkDone: '' as Asset,
    Objects: '' as Asset,
    Search: '' as Asset,
    SmileysAndPeople: '' as Asset,
    Symbols: '' as Asset,
    TravelAndPlaces: '' as Asset
  }
})

export default emojiPlugin
