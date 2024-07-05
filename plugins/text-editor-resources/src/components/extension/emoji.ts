import { Extension } from '@tiptap/core'
import { type ResolvedPos } from '@tiptap/pm/model'

const emojiReplaceDict = {
  '0:)': '😇',
  '0:-)': '😇',
  '0:-3': '😇',
  '0:3': '😇',
  '0;^)': '😇',
  'O:-)': '😇',
  '3:)': '😈',
  '3:-)': '😈',
  '}:)': '😈',
  '}:-)': '😈',
  '>:)': '😈',
  '>:-)': '😈',
  '>;)': '😈',
  ':-D': '😁',
  ":')": '😂',
  ":'-)": '😂',
  ':)': '😊',
  ':-)': '😄',
  ':^)': '😄',
  ':o)': '😄',
  ':}': '😄',
  '*-)': '😉',
  ':-,': '😉',
  ';)': '😉',
  ';-)': '😉',
  ';-]': '😉',
  ';^)': '😉',
  ':-|': '😐',
  ':-(': '😒',
  ':-<': '😒',
  ':-[': '😒',
  ':-c': '😒',
  '%-)': '😖',
  ':-P': '😜',
  ':-p': '😜',
  ';(': '😜',
  ':-||': '😠',
  ':-.': '😡',
  ':-/': '😡',
  ":'(": '😢',
  ":'-(": '😢',
  ':-O': '😲',
  ':-o': '😲',
  ':-&': '😶',
  ':-X': '😶'
}

const invalidMarks = ['link']

function escapeRegExp (text: string): string {
  return text.replace(/[:[\]{}()*+?.\\^$|#]/g, '\\$&')
}

function isValidEmojiPosition ($pos: ResolvedPos): boolean {
  const marks = $pos.marks()
  if (marks.some((p) => invalidMarks.includes(p.type.name))) {
    return false
  }
  return true
}

export const EmojiExtension = Extension.create({
  addInputRules () {
    return Object.keys(emojiReplaceDict).map((pattern) => {
      return {
        find: new RegExp(`(?:^|\\s)(${escapeRegExp(pattern)})$`),
        handler: ({ state, range, match, commands }) => {
          const $from = state.doc.resolve(range.from)
          if (!isValidEmojiPosition($from)) {
            return
          }
          let replaceRange = range
          if (match[0] !== match[1]) {
            replaceRange = { from: range.from + 1, to: range.to }
          }
          commands.insertContentAt(replaceRange, [
            {
              type: 'text',
              text: emojiReplaceDict[pattern as keyof typeof emojiReplaceDict]
            }
          ])
        }
      }
    })
  }
})
