import { Extension } from '@tiptap/core'

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

function escapeRegExp (text: string): string {
  return text.replace(/[:[\]{}()*+?.\\^$|#]/g, '\\$&')
}

export const EmojiExtension = Extension.create({
  addInputRules () {
    return Object.keys(emojiReplaceDict).map((pattern) => {
      return {
        find: new RegExp(`(?:^|\\s)(${escapeRegExp(pattern)})`),
        handler: ({ range, match, commands }) => {
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
