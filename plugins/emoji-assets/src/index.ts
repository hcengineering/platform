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
import { loadMetadata } from '@hcengineering/platform'
import emojiPlugin from '@hcengineering/emoji'

const icons = require('../assets/icons.svg') as string // eslint-disable-line
loadMetadata(emojiPlugin.icon, {
  Emoji: `${icons}#emoji`,
  EmojiAdd: `${icons}#emoji-add`,
  Activities: `${icons}#activities`,
  AnimalsAndNature: `${icons}#animals-and-nature`,
  Flags: `${icons}#flags`,
  FoodAndDrink: `${icons}#food-and-drink`,
  FrequentlyUsed: `${icons}#frequently-used`,
  GettingWorkDone: `${icons}#getting-work-done`,
  Objects: `${icons}#objects`,
  Search: `${icons}#search`,
  SmileysAndPeople: `${icons}#smileys-and-people`,
  Symbols: `${icons}#symbols`,
  TravelAndPlaces: `${icons}#travel-and-places`,
  Custom: `${icons}#custom`
})
