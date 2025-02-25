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
import { fetchEmojis, fetchMessages } from 'emojibase'
import type { Emoji, Locale } from 'emojibase'
import { getCurrentAccount } from '@hcengineering/core'
import { deviceOptionsStore as deviceInfo } from '../..'
import { emojiStore, emojiComponents, emojiCategories, skinTonesCodes } from '.'
import type { EmojiWithGroup, EmojiHierarchy } from '.'

export async function loadEmojis (lang?: string): Promise<{
  emojis: EmojiWithGroup[]
  components: Emoji[]
}> {
  const local = lang ?? get(deviceInfo).language ?? 'en'
  const englishEmojis =
    local === 'en'
      ? await fetchEmojis('en', { version: '15.0' })
      : await fetchEmojis('en', { compact: true, version: '15.0' })
  const languageEmojis = local === 'en' ? null : await fetchEmojis(local as Locale, { version: '15.0' })
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

  return {
    emojis: emojis
      .filter((e) => e.group !== 2 && e.group !== undefined)
      .map((e) => {
        return { ...e, key: categories.get(groupKeys.get(e?.group ?? 0) ?? '') ?? '' }
      }),
    components: emojis.filter((e) => e.group === 2)
  }
}

export async function updateEmojis (lang?: string): Promise<void> {
  const { emojis, components } = await loadEmojis(lang)
  emojiStore.set(emojis)
  emojiComponents.set(components)
}

function getEmojisLocalStorageKey (suffix: string = 'frequently'): string {
  const me = getCurrentAccount()
  return `emojis.${suffix}.${me.uuid}`
}

export const removeFrequentlyEmojis = (_hexcode: string): void => {
  const emoji = getEmoji(_hexcode)
  const hexcode = emoji?.parent?.hexcode ?? emoji?.emoji.hexcode
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
export const addFrequentlyEmojis = (_hexcode: string): void => {
  const emoji = getEmoji(_hexcode)
  const hexcode = emoji?.parent?.hexcode ?? emoji?.emoji.hexcode
  if (hexcode === undefined) return

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

    const res: EmojiWithGroup[] = []

    for (const val of parsedEmojis) {
      const map = getEmoji(val.hexcode)
      const emoji = map?.parent ?? map?.emoji
      if (emoji !== undefined) {
        res.push(emoji)
      }
    }

    return res
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
export const generateSkinToneEmojis = (baseEmoji: number | number[]): string[] => {
  const isArray = Array.isArray(baseEmoji)
  return [
    String.fromCodePoint(...(isArray ? baseEmoji : [baseEmoji])),
    ...skinTonesCodes.map((skinTone) => {
      return String.fromCodePoint(...(isArray ? baseEmoji : [baseEmoji]), skinTone)
    })
  ]
}

export const getEmojiMap = (): Map<string, EmojiHierarchy> | undefined => {
  const result = new Map<string, EmojiHierarchy>()
  const emojis = get(emojiStore)

  emojis.forEach((emoji) => {
    result.set(emoji.hexcode, { emoji })
    emoji.skins?.forEach((skin) => result.set(skin.hexcode, { emoji: { ...skin, key: emoji.key }, parent: emoji }))
  })
  return result
}
export const getEmoji = (hexcode: string): EmojiHierarchy | undefined => {
  return getEmojiMap()?.get(hexcode)
}
export const getEmojiCode = (e: number | number[] | string | Emoji | EmojiWithGroup): number | number[] => {
  return typeof e === 'number' || Array.isArray(e)
    ? e
    : (typeof e === 'object' ? e.hexcode : e).split('-').map((h) => parseInt(h, 16))
}
