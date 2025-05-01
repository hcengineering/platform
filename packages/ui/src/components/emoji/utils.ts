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
import { get } from 'svelte/store'
import type { Emoji, Locale } from 'emojibase'
import { fetchEmojis, fetchMessages } from 'emojibase'
import EMOJI_REGEX from 'emojibase-regex'
import EMOTICON_REGEX from 'emojibase-regex/emoticon'
import SHORTCODE_REGEX from 'emojibase-regex/shortcode'
import { getCurrentAccount } from '@hcengineering/core'
import { deviceOptionsStore as deviceInfo } from '../..'
import type { EmojiWithGroup } from '.'
import { emojiCategories, emojiStore } from '.'

export const emojiRegex = EMOJI_REGEX
export const emojiGlobalRegex = new RegExp(EMOJI_REGEX.source, EMOJI_REGEX.flags + 'g')

export const emoticonRegex = new RegExp(`(?:^|\\s)(${EMOTICON_REGEX.source})$`)
export const emoticonGlobalRegex = new RegExp(`(?<!\\S)${EMOTICON_REGEX.source}(?!\\S)`, EMOTICON_REGEX.flags + 'g')

export const shortcodeRegex = new RegExp(`(?:^|\\s)(${SHORTCODE_REGEX.source})$`)
export const shortcodeGlobalRegex = new RegExp(`(?<!\\S)${SHORTCODE_REGEX.source}(?!\\S)`, SHORTCODE_REGEX.flags + 'g')

let availableEmojis: EmojiWithGroup[]

export async function loadEmojis (lang?: string): Promise<EmojiWithGroup[]> {
  const local = lang ?? get(deviceInfo).language ?? 'en'
  const englishEmojis =
    local === 'en'
      ? await fetchEmojis('en', { version: '15.0', shortcodes: ['iamcal'] })
      : await fetchEmojis('en', { compact: true, version: '15.0', shortcodes: ['iamcal'] })
  const languageEmojis = local === 'en' ? null : await fetchEmojis(local as Locale, { version: '15.0', shortcodes: ['iamcal'] })
  const messages = await fetchMessages(local as Locale)
  const groups = messages.groups
  const groupKeys = new Map<number, string>(groups.map((group, index) => [index, group.key]))

  const categories = new Map<string, string>()
  emojiCategories.forEach((cat) => {
    if (Array.isArray(cat.categories)) cat.categories.forEach((c) => categories.set(c, cat.id))
    else if (typeof cat.categories === 'string') categories.set(cat.categories, cat.id)
  })

  const emojis =
    languageEmojis !== null
      ? languageEmojis.map((langEmoji, index) => {
        return {
          ...langEmoji,
          tags: [...(englishEmojis[index]?.tags ?? []), ...(langEmoji?.tags ?? [])]
        }
      })
      : (englishEmojis as Emoji[])

  return emojis
    .filter((e) => e.group !== 2 && e.group !== undefined)
    .map((e) => {
      return { ...e, key: categories.get(groupKeys.get(e?.group ?? 0) ?? '') ?? '' }
    })
}

export async function updateEmojis (lang?: string): Promise<void> {
  const emojis = await loadEmojis(lang)
  availableEmojis = emojis
  emojiStore.set(emojis)
}

export function getSkinnedEmoji (shortcode: string | undefined, skinTone?: number): Emoji | undefined {
  if (shortcode === undefined) return undefined
  const shortcodeSlice = shortcode.slice(1, -1)
  const matchEmoji = availableEmojis.find((e) => e.shortcodes?.includes(shortcodeSlice))
  if (skinTone === undefined || matchEmoji === undefined) return matchEmoji
  if (skinTone === 0) return matchEmoji
  return matchEmoji.skins === undefined ? undefined : matchEmoji.skins[skinTone - 1]
}

export function getEmojiForShortCode (shortcode: string | undefined): string | undefined {
  if (shortcode === undefined) return undefined
  const shortcodeSlice = shortcode.slice(1, -1)
  const result = availableEmojis.find(e => e.shortcodes?.includes(shortcodeSlice))
  return result === undefined ? undefined : result.emoji
}

export function getEmojiForEmoticon (emoticon: string | undefined): string | undefined {
  if (emoticon === undefined) return undefined
  const result = availableEmojis.find(e => Array.isArray(e.emoticon) ? e.emoticon.includes(emoticon) : e.emoticon === emoticon)
  return result === undefined ? undefined : result.emoji
}

function getEmojisLocalStorageKey (suffix: string = 'frequently'): string {
  const me = getCurrentAccount()
  return `emojis.${suffix}.${me.uuid}`
}

export const removeFrequentlyEmojis = (emoji: EmojiWithGroup): void => {
  const hexcode = emoji.hexcode
  if (hexcode === undefined) return

  const frequentlyEmojisKey = getEmojisLocalStorageKey()
  const frequentlyEmojis = window.localStorage.getItem(frequentlyEmojisKey)
  if (frequentlyEmojis != null) {
    const parsedEmojis = JSON.parse(frequentlyEmojis)
    if (Array.isArray(parsedEmojis)) {
      window.localStorage.setItem(
        frequentlyEmojisKey,
        JSON.stringify(parsedEmojis.filter((pe) => pe.hexcode !== hexcode))
      )
    }
  }
}
export const addFrequentlyEmojis = (emoji: EmojiWithGroup): void => {
  if (emoji === undefined) return
  const hexcode = emoji.hexcode

  const frequentlyEmojisKey = getEmojisLocalStorageKey()
  const frequentlyEmojis = window.localStorage.getItem(frequentlyEmojisKey)
  const empty = frequentlyEmojis == null

  if (!empty) {
    const parsedEmojis = JSON.parse(frequentlyEmojis)
    if (Array.isArray(parsedEmojis)) {
      const index = parsedEmojis.findIndex((pe) => pe.hexcode === hexcode)
      if (index === -1) parsedEmojis.push({ hexcode, count: 1 })
      else parsedEmojis[index].count++
      parsedEmojis.sort((a, b) => b.count - a.count)
      window.localStorage.setItem(frequentlyEmojisKey, JSON.stringify(parsedEmojis))
      return undefined
    }
  }
  window.localStorage.setItem(frequentlyEmojisKey, JSON.stringify([{ hexcode, count: 1 }]))
}
export const getFrequentlyEmojis = (): EmojiWithGroup[] | undefined => {
  const frequentlyEmojisKey = getEmojisLocalStorageKey()
  const frequentlyEmojis = window.localStorage.getItem(frequentlyEmojisKey)
  if (frequentlyEmojis == null) return undefined

  try {
    const parsedEmojis = JSON.parse(frequentlyEmojis)
    if (!Array.isArray(parsedEmojis)) return undefined
    const emojis = get(emojiStore)
    return emojis.filter(e => parsedEmojis.find(pe => pe.hexcode === e.hexcode) !== undefined)
  } catch (e) {
    console.error(e)
    return undefined
  }
}

export const setSkinTone = (skinTone: number): void => {
  const skinToneKey = getEmojisLocalStorageKey('skinTone')
  window.localStorage.setItem(skinToneKey, JSON.stringify(skinTone))
}
export const getSkinTone = (): number => {
  const skinToneKey = getEmojisLocalStorageKey('skinTone')
  const skinTone = window.localStorage.getItem(skinToneKey)
  if (skinTone == null) return 0

  try {
    return JSON.parse(skinTone)
  } catch (e) {
    console.error(e)
    return 0
  }
}
