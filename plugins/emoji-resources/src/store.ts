import { writable, derived, get } from 'svelte/store'
import { isCustomEmoji, type EmojiWithGroup } from '@hcengineering/emoji'
import { getCurrentAccount } from '@hcengineering/core'

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

export const removeFrequentlyEmojis = (emoji: EmojiWithGroup): void => {
  const hexcode = isCustomEmoji(emoji) ? emoji.shortcode : emoji.hexcode
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
  const hexcode = isCustomEmoji(emoji) ? emoji.shortcode : emoji.hexcode

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
    return emojis.filter((e) => {
      if (isCustomEmoji(e)) {
        return parsedEmojis.find(pe => pe.hexcode === e.shortcode) !== undefined
      }
      return parsedEmojis.find(pe => pe.hexcode === e.hexcode || e.skins?.find(s => s.hexcode === pe.hexcode) !== undefined) !== undefined
    })
  } catch (e) {
    console.error(e)
    return undefined
  }
}

function getEmojisLocalStorageKey (suffix: string = 'frequently'): string {
  const me = getCurrentAccount()
  return `emojis.${suffix}.${me.uuid}`
}
