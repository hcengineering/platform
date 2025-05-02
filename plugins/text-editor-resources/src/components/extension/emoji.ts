import { EmojiNode, type EmojiNodeOptions } from '@hcengineering/text'
import {
  emoticonRegex,
  emoticonGlobalRegex,
  shortcodeRegex,
  shortcodeGlobalRegex,
  getEmojiByEmoticon,
  getEmojiByShortCode,
  emojiRegex,
  emojiGlobalRegex,
  type ExtendedEmoji, isCustomEmoji
} from '@hcengineering/ui'
import { type ResolvedPos } from '@tiptap/pm/model'
import { type ExtendedRegExpMatchArray, type SingleCommands, type Range, InputRule, PasteRule } from '@tiptap/core'
import { type EditorState } from '@tiptap/pm/state'

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
  // TODO: add custom emoji
  const unicodeEmoji = typeof emoji === 'string' ? emoji : (isCustomEmoji(emoji) ? emoji.shortcode : emoji.emoji)
  commands.insertContentAt(range, [
    {
      type: 'emoji',
      attrs: {
        emoji: unicodeEmoji
      }
    }
  ])
}

export const EmojiExtension = EmojiNode.extend<EmojiNodeOptions>({
  addPasteRules () {
    return [
      new PasteRule({
        find: shortcodeGlobalRegex,
        handler: ({ state, range, match, commands }) => {
          handleEmoji(state, range, match, commands, getEmojiByShortCode)
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
          handleEmoji(state, range, match, commands, getEmojiByEmoticon)
        }
      })
    ]
  },
  addInputRules () {
    return [
      new InputRule({
        find: shortcodeRegex,
        handler: ({ state, range, match, commands }) => {
          handleEmoji(state, range, match, commands, getEmojiByShortCode)
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
          handleEmoji(state, range, match, commands, getEmojiByEmoticon)
        }
      })
    ]
  }
})
