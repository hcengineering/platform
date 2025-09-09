import { emojiGlobalRegex, shortcodeGlobalRegex, isCustomEmoji, fetchEmojis, fetchMessages } from '@hcengineering/emoji'
import type {
  EmojiWithGroup,
  ExtendedEmoji,
  Locale,
  Emoji,
  CustomEmoji,
  TextOrEmoji,
  ParsedTextWithEmojis
} from '@hcengineering/emoji'
import { emojiCategories } from './types'
import { unicodeEmojiStore, customEmojiStore, getSkinTone } from './store'
import { get } from 'svelte/store'
import { deviceOptionsStore as deviceInfo } from '@hcengineering/ui'

export function updateCustomEmojis (customEmoji: CustomEmoji[]): void {
  const emoji = customEmoji.map((e) => {
    return { ...e, key: 'custom' }
  })
  customEmojiStore.set(emoji as EmojiWithGroup[])
}

export async function updateUnicodeEmojis (lang?: string): Promise<void> {
  const local = lang ?? get(deviceInfo).language ?? 'en'
  const emojis = await loadUnicodeEmojis(local)
  unicodeEmojiStore.set(emojis)
}

export async function loadUnicodeEmojis (lang: string): Promise<EmojiWithGroup[]> {
  const englishEmojis =
    lang === 'en'
      ? await fetchEmojis('en', { version: '15.0', shortcodes: ['iamcal'] })
      : await fetchEmojis('en', { compact: true, version: '15.0', shortcodes: ['iamcal'] })
  const languageEmojis = lang === 'en' ? null : await fetchEmojis(lang as Locale, { version: '15.0' })
  const messages = await fetchMessages(lang as Locale)
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
          tags: [...(englishEmojis[index]?.tags ?? []), ...(langEmoji?.tags ?? [])],
          shortcodes: [...(englishEmojis[index]?.shortcodes ?? []), ...(langEmoji?.shortcodes ?? [])]
        }
      })
      : (englishEmojis as Emoji.Emoji[])

  return emojis
    .filter((e) => e.group !== 2 && e.group !== undefined)
    .map((e) => {
      return { ...e, key: categories.get(groupKeys.get(e?.group ?? 0) ?? '') ?? '' }
    })
}

export function getEmojiByHexcode (hexcode: string): EmojiWithGroup | undefined {
  return get(unicodeEmojiStore)
    .concat(get(customEmojiStore))
    .find((e) => !isCustomEmoji(e) && e.hexcode === hexcode)
}

export function getEmojiByEmoticon (emoticon: string | undefined): string | undefined {
  if (emoticon === undefined) return undefined
  const matchEmoji = findEmoji(
    (e) => !isCustomEmoji(e) && (Array.isArray(e.emoticon) ? e.emoticon.includes(emoticon) : e.emoticon === emoticon)
  )
  if (matchEmoji === undefined) return undefined
  return !isCustomEmoji(matchEmoji) ? matchEmoji.emoji : undefined
}

export function getUnicodeEmojiByShortCode (shortcode: string | undefined, skinTone?: number): Emoji.Emoji | undefined {
  const emoji = getEmojiByShortCode(shortcode, skinTone)
  if (emoji === undefined || isCustomEmoji(emoji)) return undefined
  return emoji
}

export function getEmojiByShortCode (shortcode: string | undefined, skinTone?: number): ExtendedEmoji | undefined {
  if (shortcode === undefined) return undefined
  const pureShortcode = shortcode.replaceAll(':', '')
  return findEmoji((e) => {
    if (isCustomEmoji(e)) return e.shortcode === pureShortcode
    return e.shortcodes?.includes(pureShortcode)
  }, skinTone)
}

export function getCustomEmoji (shortcode: string | undefined): CustomEmoji | undefined {
  if (shortcode === undefined) return undefined
  const pureShortcode = shortcode.replaceAll(':', '')
  const result = findEmoji((e) => {
    if (isCustomEmoji(e)) return e.shortcode === pureShortcode
    return false
  }) as CustomEmoji
  return result
}

function findEmoji (
  predicate: (e: EmojiWithGroup) => boolean | undefined,
  skinTone?: number
): ExtendedEmoji | undefined {
  const emojis = get(unicodeEmojiStore).concat(get(customEmojiStore))
  const matchEmoji = emojis.find(predicate)
  if (matchEmoji === undefined) return undefined
  if (isCustomEmoji(matchEmoji)) return matchEmoji
  if (skinTone === undefined) skinTone = getSkinTone()
  if (skinTone === 0 || matchEmoji.skins === undefined) return matchEmoji
  return matchEmoji.skins[skinTone - 1]
}

export function getEmojiSkins (emoji: ExtendedEmoji): Emoji.Emoji[] | undefined {
  if (isCustomEmoji(emoji)) return undefined
  return emoji.skins
}

export function parseTextWithEmojis (text: string): ParsedTextWithEmojis {
  const matches = [...text.matchAll(emojiGlobalRegex), ...text.matchAll(shortcodeGlobalRegex)]
  if (matches.length === 0) return { nodes: [text], emojisOnly: false }
  matches.sort((a, b) => a.index - b.index)

  const nodes: TextOrEmoji[] = []
  let emojisOnly: boolean = true

  const pushNode = (node: TextOrEmoji): void => {
    if (typeof node === 'string') {
      if (node !== '') {
        emojisOnly = false
        nodes.push(node)
      }
    } else {
      nodes.push(node)
    }
  }

  let startIndex = 0
  for (let index = 0; index < matches.length; index++) {
    const matchStart = matches[index].index
    pushNode(text.substring(startIndex, matchStart))
    startIndex = matchStart + matches[index][0].length
    const emojiText = text.substring(matches[index].index, startIndex)
    if (emojiText.startsWith(':')) {
      const customEmoji = getCustomEmoji(emojiText)
      if (customEmoji === undefined) {
        pushNode(emojiText)
      } else {
        pushNode({ emoji: emojiText, image: customEmoji.image })
      }
    } else {
      pushNode({ emoji: emojiText })
    }
  }
  pushNode(text.substring(startIndex, text.length))
  return { nodes, emojisOnly }
}
