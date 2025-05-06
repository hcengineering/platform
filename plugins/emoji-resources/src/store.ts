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
    const result: EmojiWithGroup[] = []
    emojis.forEach((emoji: EmojiWithGroup) => {
      if (isCustomEmoji(emoji)) {
        if (parsedEmojis.find(pe => pe.hexcode === emoji.shortcode) !== undefined) result.push(emoji)
      } else {
        parsedEmojis.forEach((parsedEmoji: any) => {
          if (parsedEmoji.hexcode === emoji.hexcode) {
            result.push(emoji)
            return
          }
          const skinEmoji = emoji.skins?.find(s => s.hexcode === parsedEmoji.hexcode)
          if (skinEmoji === undefined) return
          result.push({ ...skinEmoji, key: '' })
        })
      }
    })
    return result
  } catch (e) {
    console.error(e)
    return undefined
  }
}

function getEmojisLocalStorageKey (suffix: string = 'frequently'): string {
  const me = getCurrentAccount()
  return `emojis.${suffix}.${me.uuid}`
}
