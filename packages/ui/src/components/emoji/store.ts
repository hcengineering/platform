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
import { writable, derived } from 'svelte/store'
import type { EmojiWithGroup } from '.'

export const emojiStore = writable<EmojiWithGroup[]>([])
export const searchEmoji = writable<string>('')

export const resultEmojis = derived([emojiStore, searchEmoji], ([emojis, search]) => {
  return search !== ''
    ? emojis.filter(
      (emoji) =>
        (emoji.tags?.some((tag: string) => tag.toLowerCase().startsWith(search.toLowerCase())) ?? false) ||
          emoji.label.toLowerCase().includes(search.toLowerCase())
    )
    : emojis
})
