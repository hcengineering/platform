import { type Editor, type Range, escapeForRegEx } from '@tiptap/core'
import { type EditorState, Plugin, PluginKey, type Transaction } from '@tiptap/pm/state'
import { ReplaceStep } from '@tiptap/pm/transform'
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view'

import { type ResolvedPos } from '@tiptap/pm/model'

export interface Trigger {
  char: string
  allowSpaces: boolean
  allowedPrefixes: string[] | null
  startOfLine: boolean
  $position: ResolvedPos
}

export type SuggestionMatch = {
  range: Range
  query: string
  text: string
} | null

function hasChar (tr: Transaction, char = ''): boolean {
  let isHardStop = false
  let isChar = false
  for (const step of tr.steps) {
    if (step instanceof ReplaceStep) {
      const slice = step.slice

      slice.content.descendants((node, _pos): boolean => {
        if (isHardStop) {
          return false
        }

        if (node.type.isText && node.text !== undefined && node.text !== '') {
          if (char !== '') {
            if (node.text?.includes(char)) {
              isChar = true
              isHardStop = true
              return false
            }
          } else {
            isChar = true
            isHardStop = true
            return false
          }
        }
        return true
      })
    }
  }

  return isChar
}

export function findSuggestionMatch (config: Trigger): SuggestionMatch {
  const { char, allowSpaces, allowedPrefixes, startOfLine, $position } = config

  const escapedChar = escapeForRegEx(char)

  const suffix = new RegExp(`\\s${escapedChar}$`)
  const prefix = startOfLine ? '^' : ''

  // If allowSpaces: true terminates on at least 2 whitespaces
  const regexp = allowSpaces
    ? new RegExp(`${prefix}${escapedChar}[^${escapedChar}]*?(?=\\s{2}|$)`, 'gm')
    : new RegExp(`${prefix}(?:^)?${escapedChar}[^\\s${escapedChar}]*`, 'gm')

  let text
  if ($position.nodeBefore?.isText !== undefined && $position.nodeBefore?.isText) {
    text = $position.nodeBefore.text
  }

  if (text === undefined || text === '') {
    return null
  }

  const textFrom = $position.pos - text.length

  const match: any = Array.from(text.matchAll(regexp)).pop()

  if (match === undefined || match === null || match.input === undefined || match.index === undefined) {
    return null
  }

  // JavaScript doesn't have lookbehinds. This hacks a check that first character
  // is a space or the start of the line
  const matchPrefix = match.input.slice(Math.max(0, match.index - 1), match.index)

  if (allowedPrefixes !== null) {
    const matchPrefixIsAllowed = new RegExp(`^[${allowedPrefixes.join('')}\0]?$`).test(matchPrefix)
    if (!matchPrefixIsAllowed) {
      return null
    }
  }

  /* eslint-disable @typescript-eslint/restrict-plus-operands */
  // The absolute position of the match in the document
  const from: number = textFrom + match.index
  let to: number = from + match[0].length

  // Edge case handling; if spaces are allowed and we're directly in between
  // two triggers
  if (allowSpaces && suffix.test(text.slice(to - 1, to + 1))) {
    match[0] += ' '
    to += 1
  }

  // If the $position is located within the matched substring, return that range
  if (from < $position.pos && to >= $position.pos) {
    return {
      range: {
        from,
        to
      },
      query: match[0].slice(char.length),
      text: match[0]
    }
  }

  return null
}

export interface SuggestionOptions<I = any> {
  pluginKey?: PluginKey
  editor: Editor
  char?: string
  allowSpaces?: boolean
  allowedPrefixes?: string[] | null
  startOfLine?: boolean
  decorationTag?: string
  decorationClass?: string
  command?: (props: { editor: Editor, range: Range, props: I }) => void
  items?: (props: { query: string, editor: Editor }) => I[] | Promise<I[]>
  render?: () => {
    onBeforeStart?: (props: SuggestionProps<I>) => void
    onStart?: (props: SuggestionProps<I>) => void
    onBeforeUpdate?: (props: SuggestionProps<I>) => void
    onUpdate?: (props: SuggestionProps<I>) => void
    onExit?: (props: SuggestionProps<I>) => void
    onKeyDown?: (props: SuggestionKeyDownProps) => boolean
  }
  allow?: (props: { editor: Editor, state: EditorState, range: Range }) => boolean
}

export interface SuggestionProps<I = any> {
  editor: Editor
  range: Range
  query: string
  text: string
  items: I[]
  command: (props: I) => void
  decorationNode: Element | null
  clientRect?: (() => DOMRect | null) | null
}

export interface SuggestionKeyDownProps {
  view: EditorView
  event: KeyboardEvent
  range: Range
}

export const SuggestionPluginKey = new PluginKey('suggestion')

const cancelKeys = ['Escape', 'ArrowLeft', 'ArrowRight']

export default function Suggestion<I = any> ({
  pluginKey = SuggestionPluginKey,
  editor,
  char = '@',
  allowSpaces = false,
  allowedPrefixes = [' '],
  startOfLine = false,
  decorationTag = 'span',
  decorationClass = 'suggestion',
  command = () => null,
  items = () => [],
  render = () => ({}),
  allow = () => true
}: SuggestionOptions<I>): Plugin<any> {
  let props: SuggestionProps<I> | undefined
  const renderer = render?.()

  const plugin: Plugin<any> = new Plugin<any>({
    key: pluginKey,

    view () {
      return {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        update: async (view, prevState) => {
          const prev = this.key?.getState(prevState)
          const next = this.key?.getState(view.state)

          // See how the state changed
          /* eslint-disable @typescript-eslint/strict-boolean-expressions */
          const moved = prev.active && next.active && prev.range.from !== next.range.from
          const started = !prev.active && next.active
          const stopped = prev.active && !next.active
          const changed = !started && !stopped && prev.query !== next.query
          const handleStart = started || moved
          const handleChange = changed && !moved
          const handleExit = stopped || moved

          // Cancel when suggestion isn't active
          if (!handleStart && !handleChange && !handleExit) {
            return
          }

          const state = handleExit && !handleStart ? prev : next
          /* eslint-disable @typescript-eslint/restrict-template-expressions */
          const decorationNode = view.dom.querySelector(`[data-decoration-id="${state.decorationId}"]`)
          let clientRect
          if (decorationNode !== null) {
            clientRect = () => {
              // because of `items` can be asynchrounous we’ll search for the current decoration node
              const { decorationId } = this.key?.getState(editor.state) // eslint-disable-line
              const currentDecorationNode = view.dom.querySelector(`[data-decoration-id="${decorationId}"]`)
              if (currentDecorationNode !== null) {
                return currentDecorationNode?.getBoundingClientRect()
              }
              return null
            }
          }

          props = {
            editor,
            range: state.range,
            query: state.query,
            text: state.text,
            items: [],
            command: (commandProps) => {
              command({
                editor,
                range: state.range,
                props: commandProps
              })
            },
            decorationNode,
            // virtual node for popper.js or tippy.js
            // this can be used for building popups without a DOM node
            clientRect
          }

          if (handleStart) {
            renderer?.onBeforeStart?.(props)
          }

          if (handleChange) {
            renderer?.onBeforeUpdate?.(props)
          }

          if (handleChange || handleStart) {
            props.items = await items({
              editor,
              query: state.query
            })
          }

          if (handleExit) {
            renderer?.onExit?.(props)
          }

          if (handleChange) {
            renderer?.onUpdate?.(props)
          }

          if (handleStart) {
            renderer?.onStart?.(props)
          }
        },

        destroy: () => {
          if (props == null) {
            return
          }

          renderer?.onExit?.(props)
        }
      }
    },

    state: {
      // Initialize the plugin's internal state.
      init () {
        const state: {
          active: boolean
          range: Range
          query: null | string
          text: null | string
          composing: boolean
          decorationId?: string | null
          specialCharInserted: boolean
          maxRangeTo: number
        } = {
          active: false,
          range: {
            from: 0,
            to: 0
          },
          query: null,
          text: null,
          composing: false,
          specialCharInserted: false,
          maxRangeTo: 0
        }

        return state
      },

      // Apply changes to the plugin state from a view transaction.
      apply (transaction, prev, oldState, state) {
        const { isEditable } = editor
        const { composing } = editor.view
        const { selection } = transaction
        const { empty, from } = selection
        const next = { ...prev }
        const trPluginState = transaction.getMeta(pluginKey)

        if (trPluginState?.forceCancelSuggestion) {
          next.specialCharInserted = false
        }

        next.composing = composing

        // We can only be suggesting if the view is editable, and:
        //   * there is no selection, or
        //   * a composition is active (see: https://github.com/ueberdosis/tiptap/issues/1449)
        if (isEditable && (empty || editor.view.composing)) {
          // Reset active state if we just left the previous suggestion range
          if ((from < prev.range.from || from > prev.range.to) && !composing && !prev.composing) {
            next.active = false
          }

          if (!prev.specialCharInserted) {
            next.specialCharInserted = hasChar(transaction, char)
          }

          if (selection.$from.pos > next.maxRangeTo && transaction.steps.length === 0) {
            next.specialCharInserted = false
          }

          // Make sure special char was inserted by user
          // Before try to make any match
          if (prev.specialCharInserted || next.specialCharInserted) {
            // Try to match against where our cursor currently is
            const match = findSuggestionMatch({
              char,
              allowSpaces,
              allowedPrefixes,
              startOfLine,
              $position: selection.$from
            })
            const decorationId = `id_${Math.floor(Math.random() * 0xffffffff)}`

            // If we found a match, update the current state to show it
            if (match != null && allow({ editor, state, range: match.range })) {
              next.active = true
              next.decorationId = prev.decorationId ? prev.decorationId : decorationId
              next.range = match.range

              if (next.range.to > next.maxRangeTo || transaction.steps.length !== 0) {
                next.maxRangeTo = next.range.to
              }

              next.query = match.query
              next.text = match.text
            } else {
              next.active = false
            }
          } else {
            next.active = false
          }
        } else {
          next.active = false
        }

        // Make sure to empty the range if suggestion is inactive
        if (!next.active) {
          next.decorationId = null
          next.range = { from: 0, to: 0 }
          next.maxRangeTo = 0
          next.query = null
          next.text = null
          next.specialCharInserted = false
        }

        return next
      }
    },

    props: {
      // Call the keydown hook if suggestion is active.
      handleKeyDown (view, event) {
        const { active, range } = plugin.getState(view.state)

        if (!active) {
          return false
        }

        if (cancelKeys.includes(event.key)) {
          const flag = { forceCancelSuggestion: true }

          // It's important to dispatch this state twice
          // Just one state change is not enough to handle all
          // decorators
          view.dispatch(view.state.tr.setMeta(pluginKey, flag))
          view.dispatch(view.state.tr.setMeta(pluginKey, flag))
        }

        return renderer?.onKeyDown?.({ view, event, range }) ?? false
      },

      // Setup decorator on the currently active suggestion.
      decorations (state) {
        const { active, range, decorationId } = plugin.getState(state)

        if (!active) {
          return null
        }

        return DecorationSet.create(state.doc, [
          Decoration.inline(range.from, range.to, {
            nodeName: decorationTag,
            class: decorationClass,
            'data-decoration-id': decorationId
          })
        ])
      }
    }
  })

  return plugin
}
