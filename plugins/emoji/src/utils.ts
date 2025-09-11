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
import EMOJI_REGEX from 'emojibase-regex'
import EMOTICON_REGEX from 'emojibase-regex/emoticon'
import SHORTCODE_REGEX from 'emojibase-regex/shortcode'

import {
  joinShortcodes,
  Emoji,
  type Locale,
  type CompactEmoji,
  type FetchEmojisExpandedOptions,
  type FetchEmojisOptions,
  type FetchFromCDNOptions,
  type MessagesDataset,
  type ShortcodesDataset
} from 'emojibase'
import emojiPlugin from './plugin'
import { getResource } from '@hcengineering/platform'
import { ParsedTextWithEmojis } from './types'

export const emojiRegex = new RegExp(`(?:^|\\s)(${EMOJI_REGEX.source})$`)
export const emojiGlobalRegex = new RegExp(EMOJI_REGEX.source, EMOJI_REGEX.flags + 'g')

export const emoticonRegex = new RegExp(`(?:^|\\s)(${EMOTICON_REGEX.source})$`)
export const emoticonGlobalRegex = new RegExp(EMOTICON_REGEX.source, EMOTICON_REGEX.flags + 'g')

export const shortcodeRegex = new RegExp(`(?:^|\\s)(${SHORTCODE_REGEX.source})$`)
export const shortcodeGlobalRegex = new RegExp(SHORTCODE_REGEX.source, SHORTCODE_REGEX.flags + 'g')

async function fetchEmojis (locale: Locale, options: FetchEmojisOptions & { compact: true }): Promise<CompactEmoji[]>

async function fetchEmojis (locale: Locale, options?: FetchEmojisOptions & { compact?: false }): Promise<Emoji[]>

async function fetchEmojis (locale: Locale, options: FetchEmojisExpandedOptions = {}): Promise<unknown[]> {
  const { compact = false, shortcodes: presets = [] } = options
  try {
    const emojis = (await import(`emojibase-data/${locale}/${compact ? 'compact' : 'data'}.json`)).default as Emoji[]
    const shortcodes: ShortcodesDataset[] = []

    for (const preset of presets) {
      const shortcodeData = (await import(`emojibase-data/${locale}/shortcodes/${preset}.json`))
        .default as ShortcodesDataset
      shortcodes.push(shortcodeData)
    }

    return joinShortcodes(emojis, shortcodes)
  } catch (e) {
    return compact
      ? await fetchEmojis('en', { ...options, compact: true })
      : await fetchEmojis('en', { ...options, compact: false })
  }
}

async function fetchMessages (locale: Locale, options?: FetchFromCDNOptions): Promise<MessagesDataset> {
  try {
    return (await import(`emojibase-data/${locale}/messages.json`)).default as MessagesDataset
  } catch (e) {
    return await fetchMessages('en', options)
  }
}

async function loadParseEmojisFunction (): Promise<((text: string) => ParsedTextWithEmojis) | undefined> {
  try {
    return await getResource(emojiPlugin.functions.ParseTextWithEmojis)
  } catch (e) {
    console.log('Cannot locate emoji parsing function')
    return undefined
  }
}

export { fetchEmojis, fetchMessages, loadParseEmojisFunction, type Locale }
