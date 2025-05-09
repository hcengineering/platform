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
import { type ExtendedRegExpMatchArray, type SingleCommands, type Range, InputRule, PasteRule } from '@tiptap/core'
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
  const emoji = getEmojiFunction(match.pop())
  if (emoji === undefined) return
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
        find: shortcodeGlobalRegex,
        handler: ({ state, range, match, commands }) => {
          handleEmoji(state, range, match, commands, shortCodeFn)
        }
      }),
      new PasteRule({
        find: emojiGlobalRegex,
        handler: ({ state, range, match, commands }) => {
          handleEmoji(state, range, match, commands, (emoji: string | undefined) => emoji)
        }
      }),
      new PasteRule({
        find: emoticonGlobalRegex,
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
