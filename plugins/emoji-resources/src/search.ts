//
// Copyright © 2026 Hardcore Engineering Inc.
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
import { isCustomEmoji, type EmojiWithGroup } from '@hcengineering/emoji'

/** Minimal number of characters after ':' before emoji suggestions are shown */
export const minEmojiSuggestionQueryLength = 2

const defaultEmojiSuggestionLimit = 10
const shortcodeQueryRegex = /^[\p{L}\p{N}_+-]+$/u

/**
 * Same matching rules as the emoji picker search.
 */
export function emojiMatchesSearch (emoji: EmojiWithGroup, search: string): boolean {
  const query = search.toLowerCase()
  if (isCustomEmoji(emoji)) {
    return emoji.shortcode.toLowerCase().includes(query)
  }
  return (
    (emoji.tags?.some((tag: string) => tag.toLowerCase().startsWith(query)) ?? false) ||
    (emoji.shortcodes?.some((shortcode: string) => shortcode.toLowerCase().startsWith(query)) ?? false) ||
    emoji.label.toLowerCase().includes(query)
  )
}

function getMatchRank (emoji: EmojiWithGroup, query: string): number {
  const shortcodes = isCustomEmoji(emoji) ? [emoji.shortcode] : (emoji.shortcodes ?? [])
  const lowerShortcodes = shortcodes.map((s) => s.toLowerCase())
  if (lowerShortcodes.includes(query)) return 0
  if (lowerShortcodes.some((s) => s.startsWith(query))) return 1
  return 2
}

/**
 * Returns emojis matching the text typed after ':' for the inline emoji suggestion popup.
 * Returns an empty list for queries that are too short or cannot be a shortcode (e.g. emoticons like ':-)'),
 * exact and prefix shortcode matches are listed first.
 */
export function searchEmojisForSuggestion (
  emojis: EmojiWithGroup[],
  query: string,
  limit: number = defaultEmojiSuggestionLimit
): EmojiWithGroup[] {
  if (query.length < minEmojiSuggestionQueryLength || !shortcodeQueryRegex.test(query)) return []
  const lowerQuery = query.toLowerCase()
  return emojis
    .filter((emoji) => emojiMatchesSearch(emoji, lowerQuery))
    .map((emoji, index) => ({ emoji, index, rank: getMatchRank(emoji, lowerQuery) }))
    .sort((a, b) => (a.rank !== b.rank ? a.rank - b.rank : a.index - b.index))
    .slice(0, limit)
    .map(({ emoji }) => emoji)
}
