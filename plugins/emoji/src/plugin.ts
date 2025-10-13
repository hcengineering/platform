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
import { Asset, type IntlString, plugin, type Plugin, Resource } from '@hcengineering/platform'
import { AnyComponent } from '@hcengineering/ui'
import type { Class, Ref, Doc } from '@hcengineering/core'
import { CustomEmoji, ExtendedEmoji, ParsedTextWithEmojis } from './types'

/** @public */
export const emojiId = 'emoji' as Plugin

export const emojiPlugin = plugin(emojiId, {
  ids: {
    CustomEmoji: '' as Ref<Doc>
  },
  class: {
    CustomEmoji: '' as Ref<Class<CustomEmoji>>
  },
  component: {
    EmojiPopup: '' as AnyComponent,
    SettingsEmojiTable: '' as AnyComponent
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
    Dark: '' as IntlString,
    CustomEmojis: '' as IntlString,
    Shortcode: '' as IntlString,
    ShortcodeDescription: '' as IntlString,
    Image: '' as IntlString,
    ImageDescription: '' as IntlString,
    UploadImage: '' as IntlString,
    Preview: '' as IntlString,
    PreviewTextBegin: '' as IntlString,
    PreviewTextEnd: '' as IntlString,
    CreateTitle: '' as IntlString,
    Create: '' as IntlString,
    ImageAspectError: '' as IntlString,
    ShortcodeMatchError: '' as IntlString,
    ShortcodeExistsError: '' as IntlString,
    NewCustomEmojiDialogClose: '' as IntlString,
    NewCustomEmojiDialogCloseNote: '' as IntlString
  },
  icon: {
    Emoji: '' as Asset,
    EmojiAdd: '' as Asset,
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
    TravelAndPlaces: '' as Asset,
    Custom: '' as Asset
  },
  functions: {
    GetEmojiByEmoticon: '' as Resource<(emoticon: string | undefined) => string | undefined>,
    GetEmojiByShortCode: '' as Resource<
    (shortcode: string | undefined, skinTone?: number) => ExtendedEmoji | undefined
    >,
    GetCustomEmoji: '' as Resource<(shortcode: string | undefined, skinTone?: number) => CustomEmoji | undefined>,
    ParseTextWithEmojis: '' as Resource<(text: string) => ParsedTextWithEmojis>
  }
})

export default emojiPlugin
