import { EmojiNode, type EmojiNodeOptions } from '@hcengineering/text'
import {
  emoticonRegex,
  emoticonGlobalRegex,
  shortcodeRegex,
  shortcodeGlobalRegex,
  getEmojiForEmoticon,
  getEmojiForShortCode,
  emojiRegex,
  emojiGlobalRegex
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
  getEmojiFunction: (key: string | undefined) => string | undefined
): void {
  const $from = state.doc.resolve(range.from)
  if (!isValidEmojiPosition($from)) {
    return
  }
  const emoji = getEmojiFunction(match.pop())
  if (emoji === undefined) return
  commands.insertContentAt(range, [
    {
      type: 'emoji',
      attrs: { emoji }
    }
  ])
}

export const EmojiExtension = EmojiNode.extend<EmojiNodeOptions>({
  addPasteRules () {
    return [
      new PasteRule({
        find: shortcodeGlobalRegex,
        handler: ({ state, range, match, commands }) => {
          handleEmoji(state, range, match, commands, getEmojiForShortCode)
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
          handleEmoji(state, range, match, commands, getEmojiForEmoticon)
        }
      })
    ]
  },
  addInputRules () {
    return [
      new InputRule({
        find: shortcodeRegex,
        handler: ({ state, range, match, commands }) => {
          handleEmoji(state, range, match, commands, getEmojiForShortCode)
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
          handleEmoji(state, range, match, commands, getEmojiForEmoticon)
        }
      })
    ]
  }
})
