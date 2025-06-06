import { EmojiNode, type EmojiNodeOptions } from '@hcengineering/text'
import {
  emoticonRegex,
  emoticonGlobalRegex,
  shortcodeRegex,
  shortcodeGlobalRegex,
  emojiRegex,
  emojiGlobalRegex,
  type ExtendedEmoji,
  isCustomEmoji
} from '@hcengineering/emoji'
import emojiPlugin from '@hcengineering/emoji'
import { type ResolvedPos } from '@tiptap/pm/model'
import {
  type ExtendedRegExpMatchArray,
  type SingleCommands,
  type Range,
  type PasteRuleMatch,
  InputRule,
  PasteRule
} from '@tiptap/core'
import { type EditorState } from '@tiptap/pm/state'
import { getBlobRef } from '@hcengineering/presentation'
import { getResource } from '@hcengineering/platform'

const invalidMarks = ['link']

function isValidEmojiPosition ($pos: ResolvedPos): boolean {
  const marks = $pos.marks()
  if (marks.some((p) => invalidMarks.includes(p.type.name))) {
    return false
  }
  return true
}

function handleEmoji (
  state: EditorState,
  range: Range,
  match: ExtendedRegExpMatchArray,
  commands: SingleCommands,
  getEmojiFunction: (key: string | undefined) => ExtendedEmoji | string | undefined
): void {
  const $from = state.doc.resolve(range.from)
  if (!isValidEmojiPosition($from)) {
    return
  }

  const emojiString = match.pop()
  if (emojiString === undefined) return
  const emoji = getEmojiFunction(emojiString)
  if (emoji === undefined) return
  if (match.length > 0) range.from = range.to - emojiString.length + 1

  if (typeof emoji === 'string' || !isCustomEmoji(emoji)) {
    commands.insertContentAt(range, [
      {
        type: 'emoji',
        attrs: {
          emoji: typeof emoji === 'string' ? emoji : emoji.emoji,
          kind: 'unicode'
        }
      }
    ])
  } else {
    commands.insertContentAt(range, [
      {
        type: 'emoji',
        attrs: {
          emoji: `:${emoji.shortcode}:`,
          kind: 'image',
          image: emoji.image
        }
      }
    ])
  }
}

function detectPasteEmojis (text: string, regExp: RegExp): PasteRuleMatch[] | null | undefined {
  const matches = text.match(regExp)
  if (matches == null) return null
  let startIndex = 0
  const result: PasteRuleMatch[] = []
  for (let index = 0; index < matches.length; index++) {
    const match = matches[index]
    const matchStart = text.indexOf(match, startIndex)
    const matchEnd = matchStart + match.length
    const prevStartIndex = startIndex
    startIndex = matchEnd
    if (matchStart > prevStartIndex && text[matchStart - 1] !== ' ') {
      continue
    }
    if (matchEnd < text.length) {
      if (index === matches.length - 1 && text[matchEnd] !== ' ') continue
      if (
        index < matches.length - 1 &&
        text.indexOf(matches[index + 1], matchEnd) > matchEnd &&
        text[matchEnd] !== ' '
      ) {
        continue
      }
    }
    result.push({ index: matchStart, text: match })
  }
  return result
}

export const EmojiExtension = EmojiNode.extend<EmojiNodeOptions>({
  addOptions () {
    return {
      getBlobRef: async (file, name, size) => await getBlobRef(file, name, size)
    }
  },
  addPasteRules () {
    let shortCodeFn: (shortcode: string | undefined, skinTone?: number) => ExtendedEmoji | undefined
    let emoticonFn: (key: string | undefined) => ExtendedEmoji | string | undefined
    void getResource(emojiPlugin.functions.GetEmojiByEmoticon).then((res) => {
      emoticonFn = res
    })
    void getResource(emojiPlugin.functions.GetEmojiByShortCode).then((res) => {
      shortCodeFn = res
    })
    return [
      new PasteRule({
        find: (text: string, event?: ClipboardEvent | null) => {
          return detectPasteEmojis(text, shortcodeGlobalRegex)
        },
        handler: ({ state, range, match, commands }) => {
          handleEmoji(state, range, match, commands, shortCodeFn)
        }
      }),
      new PasteRule({
        find: (text: string, event?: ClipboardEvent | null) => {
          return detectPasteEmojis(text, emojiGlobalRegex)
        },
        handler: ({ state, range, match, commands }) => {
          handleEmoji(state, range, match, commands, (emoji: string | undefined) => emoji)
        }
      }),
      new PasteRule({
        find: (text: string, event?: ClipboardEvent | null) => {
          return detectPasteEmojis(text, emoticonGlobalRegex)
        },
        handler: ({ state, range, match, commands }) => {
          handleEmoji(state, range, match, commands, emoticonFn)
        }
      })
    ]
  },
  addInputRules () {
    let shortCodeFn: (shortcode: string | undefined, skinTone?: number) => ExtendedEmoji | undefined
    let emoticonFn: (key: string | undefined) => ExtendedEmoji | string | undefined
    void getResource(emojiPlugin.functions.GetEmojiByEmoticon).then((res) => {
      emoticonFn = res
    })
    void getResource(emojiPlugin.functions.GetEmojiByShortCode).then((res) => {
      shortCodeFn = res
    })
    return [
      new InputRule({
        find: shortcodeRegex,
        handler: ({ state, range, match, commands }) => {
          handleEmoji(state, range, match, commands, shortCodeFn)
        }
      }),
      new InputRule({
        find: emojiRegex,
        handler: ({ state, range, match, commands }) => {
          handleEmoji(state, range, match, commands, (emoji: string | undefined) => emoji)
        }
      }),
      new InputRule({
        find: emoticonRegex,
        handler: ({ state, range, match, commands }) => {
          handleEmoji(state, range, match, commands, emoticonFn)
        }
      })
    ]
  }
})
