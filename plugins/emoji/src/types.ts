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
import type { Emoji } from 'emojibase'
import type { Blob, Doc, Ref } from '@hcengineering/core'

export { default as Emoji } from 'emojibase'
export type ExtendedEmoji = Emoji | CustomEmoji
export type EmojiWithGroup = ExtendedEmoji & { key: string }
export type TextOrEmoji = string | { emoji: string } | { emoji: string, image: Ref<Blob> }

/** @public */
export interface ParsedTextWithEmojis {
  nodes: TextOrEmoji[]
  emojisOnly: boolean
}

/** @public */
export interface CustomEmoji extends Doc {
  shortcode: string
  image: Ref<Blob>
}

export function isCustomEmoji (emoji: ExtendedEmoji): emoji is CustomEmoji {
  return 'image' in emoji
}
