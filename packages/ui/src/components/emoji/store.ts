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
import type { Emoji } from 'emojibase'
import type { EmojiWithGroup } from '.'

export const emojiStore = writable<EmojiWithGroup[]>([])
export const emojiComponents = writable<Emoji[]>([])
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

export const groupsResultEmojis = derived(resultEmojis, (result) => {
  const keys = new Set(result.map((res) => res?.key ?? ''))
  const groups: string[] = keys?.size > 0 ? [...keys] : ['']
  return {
    emojis: new Map<string, EmojiWithGroup[]>(
      groups.map((group) => {
        return [group, result.filter((res) => res.key === group)]
      })
    ),
    groups
  }
})
