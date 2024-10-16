//
// Copyright © 2023, 2024 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { type Editor, type Range } from '@tiptap/core'
import { type TextEditorInlineCommand } from '@hcengineering/text-editor'
import { MarkupNodeType } from '@hcengineering/text'
import type { EditorState } from '@tiptap/pm/state'

import { type CompletionOptions } from '../Completion'
import MentionList from './MentionList.svelte'
import { SvelteRenderer } from './node-view'
import type { SuggestionKeyDownProps, SuggestionProps } from './extension/suggestion'
import InlineCommandsList from './InlineCommandsList.svelte'

export const mInsertTable = [
  {
    label: '2x2',
    rows: 2,
    cols: 2,
    header: false
  },
  {
    label: '3x3',
    rows: 3,
    cols: 3,
    header: false
  },
  {
    label: '2x1',
    rows: 2,
    cols: 1,
    header: false
  },
  {
    label: '5x5',
    rows: 5,
    cols: 5,
    header: false
  },
  {
    label: '1x2',
    rows: 1,
    cols: 2,
    header: false
  },
  {
    label: 'Headed 2x2',
    rows: 2,
    cols: 2,
    header: true
  },
  {
    label: 'Headed 3x3',
    rows: 3,
    cols: 3,
    header: true
  },
  {
    label: 'Headed 2x1',
    rows: 2,
    cols: 1,
    header: true
  },
  {
    label: 'Headed 5x5',
    rows: 5,
    cols: 5,
    header: true
  },
  {
    label: 'Headed 1x2',
    rows: 1,
    cols: 2,
    header: true
  }
]

/**
 * @public
 */
export const completionConfig: Partial<CompletionOptions> = {
  HTMLAttributes: {
    class: 'reference'
  },
  suggestion: {
    items: async () => {
      return []
    },
    render: () => {
      let component: any

      return {
        onStart: (props: SuggestionProps) => {
          component = new SvelteRenderer(MentionList, {
            element: document.body,
            props: {
              ...props,
              close: () => {
                component.destroy()
              }
            }
          })
        },
        onUpdate (props: SuggestionProps) {
          component.updateProps(props)
        },
        onKeyDown (props: SuggestionKeyDownProps) {
          if (props.event.key === 'Escape') {
            props.event.stopPropagation()
          }
          return component.onKeyDown(props)
        },
        onExit () {
          component.destroy()
        }
      }
    }
  }
}

function isStartOfText (start: number, end: number, state: EditorState): boolean {
  const { doc } = state

  if (start < 0 || end > doc.content.size || start > end) {
    return false
  }

  let isContentStart = true

  doc.nodesBetween(start, end, (node) => {
    if (node.type.name !== 'paragraph') {
      isContentStart = false
    }
  })

  return isContentStart
}

/**
 * @public
 */
export function inlineCommandsConfig (
  commands: TextEditorInlineCommand[],
  handleSelect: (item: TextEditorInlineCommand, pos: number, targetItem?: MouseEvent | HTMLElement) => Promise<void>,
  props?: { allowFromStart: boolean }
): Partial<CompletionOptions> {
  return {
    suggestion: {
      allow: ({ state, range, editor }) => {
        if (range.from > editor.state.doc.content.size) return false
        const { $anchor } = state.selection
        const parent = $anchor.parent

        return (
          parent.type.name === 'paragraph' && (props?.allowFromStart !== true || isStartOfText(0, range.from, state))
        )
      },
      items: () => commands,
      command: ({
        editor,
        range,
        props
      }: {
        editor: Editor
        range: Range
        props: { item?: TextEditorInlineCommand }
      }) => {
        if (props.item == null) {
          editor.commands.deleteRange(range)
          return
        }

        if (props.item.type === 'shortcut') {
          editor.commands.deleteRange(range)
        } else if (props.item.type === 'command') {
          // increase range.to by one when the next node is of type "text"
          // and starts with a space character
          const nodeAfter = editor.view.state.selection.$to.nodeAfter
          const overrideSpace = nodeAfter?.text?.startsWith(' ')

          if (overrideSpace !== undefined && overrideSpace) {
            // eslint-disable-next-line
            range.to += 1
          }

          editor
            .chain()
            .focus()
            .insertContentAt(range, [
              {
                type: MarkupNodeType.inlineCommand,
                attrs: { command: props.item.command }
              },
              {
                type: 'text',
                text: ' '
              }
            ])
            .run()
        }

        const { node } = editor.view.domAtPos(range.from)
        const targetElement = node instanceof HTMLElement ? node : undefined

        void handleSelect(props.item, range.from, targetElement)
      },
      render: () => {
        let component: any

        return {
          onStart: (props: SuggestionProps) => {
            component = new SvelteRenderer(InlineCommandsList, {
              element: document.body,
              props: {
                ...props,
                close: () => {
                  component.destroy()
                }
              }
            })
          },
          onUpdate (props: SuggestionProps) {
            component.updateProps(props)
          },
          onKeyDown (props: SuggestionKeyDownProps) {
            if (props.event.key === 'Escape') {
              props.event.stopPropagation()
            }
            return component.onKeyDown(props)
          },
          onExit () {
            component.destroy()
          }
        }
      }
    }
  }
}
