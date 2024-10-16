//
// Copyright © 2024 Hardcore Engineering Inc.
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

import { Node, mergeAttributes } from '@tiptap/core'
import { PluginKey } from '@tiptap/pm/state'
import Suggestion, { type SuggestionOptions } from './suggestion'
import { type TextEditorInlineCommand } from '@hcengineering/text-editor'
import { getDataAttribute } from '../../utils'
import { MarkupNodeType } from '@hcengineering/text'

export interface InlineCommandsOptions {
  suggestion: Omit<SuggestionOptions<TextEditorInlineCommand>, 'editor'>
  HTMLAttributes: Record<string, any>
  renderLabel: (props: { options: InlineCommandsOptions, node: any }) => string
}

/*
 * @public
 */
export const InlineCommandsExtension = Node.create<InlineCommandsOptions>({
  name: 'inlineCommand',
  group: 'inline',
  inline: true,

  addOptions () {
    return {
      suggestion: {
        char: '/',
        allowSpaces: true,
        allow: ({ state }) => {
          const { $anchor } = state.selection
          const parent = $anchor.parent
          return parent.type.name === 'paragraph'
        }
      },
      renderLabel ({ options, node }) {
        return `${options.suggestion.char}${node.attrs.command}`
      },
      HTMLAttributes: {}
    }
  },

  addAttributes () {
    return {
      command: getDataAttribute('command')
    }
  },

  parseHTML () {
    return [
      {
        tag: `span[data-type="${MarkupNodeType.inlineCommand}"]`
      }
    ]
  },

  renderHTML ({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(
        {
          'data-type': MarkupNodeType.inlineCommand,
          class: 'inlineCommand'
        },
        this.options.HTMLAttributes,
        HTMLAttributes
      ),
      this.options.renderLabel({
        options: this.options,
        node
      })
    ]
  },

  renderText ({ node }) {
    return this.options.renderLabel({
      options: this.options,
      node
    })
  },

  addKeyboardShortcuts () {
    return {
      Backspace: () =>
        this.editor.commands.command(({ tr, state }) => {
          let isInlineCommand = false
          const { selection } = state
          const { empty, anchor } = selection

          if (!empty) {
            return false
          }

          state.doc.nodesBetween(anchor - 1, anchor, (node, pos) => {
            if (node.type.name === this.name) {
              isInlineCommand = true

              tr.insertText(this.options.suggestion.char ?? '/', pos, pos + node.nodeSize)

              return false
            }
          })

          return isInlineCommand
        })
    }
  },

  addProseMirrorPlugins () {
    return [
      Suggestion({
        pluginKey: new PluginKey(this.name),
        editor: this.editor,
        ...this.options.suggestion
      })
    ]
  }
})
