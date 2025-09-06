import { writable, derived, get } from 'svelte/store'
import { isCustomEmoji, type EmojiWithGroup } from '@hcengineering/emoji'
import { getCurrentAccount } from '@hcengineering/core'

export const unicodeEmojiStore = writable<EmojiWithGroup[]>([])
export const customEmojiStore = writable<EmojiWithGroup[]>([])
export const searchEmoji = writable<string>('')

export const resultEmojis = derived([unicodeEmojiStore, customEmojiStore, searchEmoji], ([unicode, custom, search]) => {
  return search !== ''
    ? unicode.concat(custom).filter((emoji) => {
      if (isCustomEmoji(emoji)) {
        return emoji.shortcode.toLowerCase().includes(search.toLowerCase())
      }
      return (
        (emoji.tags?.some((tag: string) => tag.toLowerCase().startsWith(search.toLowerCase())) ?? false) ||
          (emoji.shortcodes?.some((shortcode: string) => shortcode.toLowerCase().startsWith(search.toLowerCase())) ??
            false) ||
          emoji.label.toLowerCase().includes(search.toLowerCase())
      )
    })
    : unicode.concat(custom)
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
    console.error('Failed to parse emojis', e)
    return 0
  }
}

export const removeFrequentlyEmojis = (emoji: EmojiWithGroup): void => {
  const hexcode = isCustomEmoji(emoji) ? emoji.shortcode : emoji.hexcode
  if (hexcode === undefined) return

  const frequentlyEmojis = getStoredFrequentlyEmojis()
  if (frequentlyEmojis === undefined) return

  window.localStorage.setItem(
    getEmojisLocalStorageKey(),
    JSON.stringify(frequentlyEmojis.filter((pe) => pe.hexcode !== hexcode))
  )
}
export const addFrequentlyEmojis = (emoji: EmojiWithGroup): void => {
  if (emoji === undefined) return
  const hexcode = isCustomEmoji(emoji) ? emoji.shortcode : emoji.hexcode

  const frequentlyEmojis = getStoredFrequentlyEmojis()
  if (frequentlyEmojis === undefined) {
    window.localStorage.setItem(getEmojisLocalStorageKey(), JSON.stringify([{ hexcode, count: 1 }]))
    return
  }
  const index = frequentlyEmojis.findIndex((pe) => pe.hexcode === hexcode)
  if (index === -1) frequentlyEmojis.push({ hexcode, count: 1 })
  else frequentlyEmojis[index].count++
  frequentlyEmojis.sort((a, b) => b.count - a.count)
  window.localStorage.setItem(getEmojisLocalStorageKey(), JSON.stringify(frequentlyEmojis))
}
export const getFrequentlyEmojis = (): EmojiWithGroup[] | undefined => {
  const frequentlyEmojis = getStoredFrequentlyEmojis()
  if (frequentlyEmojis === undefined) return undefined

  const emojis = get(unicodeEmojiStore).concat(get(customEmojiStore))
  const result: EmojiWithGroup[] = []
  emojis.forEach((emoji: EmojiWithGroup) => {
    if (isCustomEmoji(emoji)) {
      if (frequentlyEmojis.find((pe) => pe.hexcode === emoji.shortcode) !== undefined) result.push(emoji)
    } else {
      frequentlyEmojis.forEach((parsedEmoji: any) => {
        if (parsedEmoji.hexcode === emoji.hexcode) {
          result.push(emoji)
          return
        }
        const skinEmoji = emoji.skins?.find((s) => s.hexcode === parsedEmoji.hexcode)
        if (skinEmoji === undefined) return
        result.push({ ...skinEmoji, key: '' })
      })
    }
  })
  return result
}

function getStoredFrequentlyEmojis (): Array<{ hexcode: string, count: number }> | undefined {
  const frequentlyEmojisKey = getEmojisLocalStorageKey()
  const frequentlyEmojis = window.localStorage.getItem(frequentlyEmojisKey)
  if (frequentlyEmojis === null) return undefined
  try {
    const parsedEmojis: Array<{ hexcode: string, count: number }> = JSON.parse(frequentlyEmojis)
    if (!Array.isArray(parsedEmojis)) return undefined
    return parsedEmojis
  } catch (e) {
    console.error('Failed to parse emojis', e)
    return undefined
  }
}

function getEmojisLocalStorageKey (suffix: string = 'frequently'): string {
  const me = getCurrentAccount()
  return `emojis1.${suffix}.${me.uuid}`
}
