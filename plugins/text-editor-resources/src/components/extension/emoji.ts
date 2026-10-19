import { EmojiNode, type EmojiNodeOptions } from '@hcengineering/text'
import {
  emoticonRegex,
  emoticonBeforeSpaceRegex,
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
import { type EditorState, PluginKey } from '@tiptap/pm/state'
import { getBlobRef } from '@hcengineering/presentation'
import { getResource } from '@hcengineering/platform'
import Suggestion, { type SuggestionKeyDownProps, type SuggestionProps } from './suggestion'
import { SvelteRenderer } from '../node-view'
import EmojiSuggestionList from '../EmojiSuggestionList.svelte'
import { isWordLikeEmoticon } from './emoticon'

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

  commands.insertContentAt(range, [getEmojiNodeContent(emoji)])
}

function getEmojiNodeContent (emoji: ExtendedEmoji | string): Record<string, any> {
  if (typeof emoji === 'string' || !isCustomEmoji(emoji)) {
    return {
      type: 'emoji',
      attrs: {
        emoji: typeof emoji === 'string' ? emoji : emoji.emoji,
        kind: 'unicode'
      }
    }
  }
  return {
    type: 'emoji',
    attrs: {
      emoji: `:${emoji.shortcode}:`,
      kind: 'image',
      image: emoji.image
    }
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
          const emoticon = match[match.length - 1]
          if (emoticon === undefined || isWordLikeEmoticon(emoticon)) return null
          handleEmoji(state, range, match, commands, emoticonFn)
        }
      }),
      new InputRule({
        find: emoticonBeforeSpaceRegex,
        handler: ({ state, range, match, commands }) => {
          const emoticon = match[1]
          if (emoticon === undefined || !isWordLikeEmoticon(emoticon)) return null
          const emoji = emoticonFn?.(emoticon)
          if (emoji === undefined || !isValidEmojiPosition(state.doc.resolve(range.from))) return null
          // the typed whitespace is not in the document yet, the range ends right after the emoticon
          commands.insertContentAt({ from: range.to - emoticon.length, to: range.to }, [
            getEmojiNodeContent(emoji),
            { type: 'text', text: match[0].slice(-1) }
          ])
        }
      })
    ]
  },
  addProseMirrorPlugins () {
    let searchFn: ((query: string, limit?: number) => ExtendedEmoji[]) | undefined
    void getResource(emojiPlugin.functions.SearchEmojis).then((res) => {
      searchFn = res
    })
    return [
      Suggestion<ExtendedEmoji>({
        pluginKey: new PluginKey('emoji-suggestion'),
        editor: this.editor,
        char: ':',
        decorationClass: 'emoji-suggestion',
        items: ({ query }) => searchFn?.(query) ?? [],
        allow: ({ state, range }) => {
          if (range.from > state.doc.content.size) return false
          const $from = state.doc.resolve(range.from)
          if ($from.parent.type.spec.code === true) return false
          return isValidEmojiPosition($from) && !$from.marks().some((m) => m.type.name === 'code')
        },
        command: ({ editor, range, props }) => {
          // replace the following space as well, a new one is inserted after the emoji
          const nodeAfter = editor.view.state.selection.$to.nodeAfter
          if (nodeAfter?.text?.startsWith(' ') === true) {
            range.to += 1
          }
          editor
            .chain()
            .focus()
            .insertContentAt(range, [getEmojiNodeContent(props), { type: 'text', text: ' ' }])
            .run()
        },
        render: () => {
          let component: SvelteRenderer | undefined
          let hasItems = false

          const destroy = (): void => {
            component?.destroy()
            component = undefined
          }
          const close = (): void => {
            destroy()
            hasItems = false
          }

          return {
            onStart: (props: SuggestionProps<ExtendedEmoji>) => {
              hasItems = props.items.length > 0
              component = new SvelteRenderer(EmojiSuggestionList, {
                element: document.body,
                props: { ...props, close }
              })
            },
            onUpdate (props: SuggestionProps<ExtendedEmoji>) {
              hasItems = component !== undefined && props.items.length > 0
              component?.updateProps(props)
            },
            onKeyDown (props: SuggestionKeyDownProps) {
              if (props.event.key === 'Escape') {
                // The suggestion plugin cancels itself on Escape (and may already have called onExit),
                // keep the key from also closing the surrounding popup or panel when the list was shown
                if (!hasItems) return false
                props.event.stopPropagation()
                close()
                return true
              }
              return component?.onKeyDown(props) ?? false
            },
            onExit: destroy
          }
        }
      })
    ]
  }
})
