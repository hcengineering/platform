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
import { mergeAttributes, Node } from '@tiptap/core'

import { getDataAttribute } from './utils'

export interface InlineCommandOptions {
  renderLabel: (props: { options: InlineCommandOptions, node: any }) => string
  suggestion: { char: string }
}

export const InlineCommandNode = Node.create<InlineCommandOptions>({
  name: 'inlineCommand',
  group: 'inline',
  inline: true,

  addAttributes () {
    return {
      command: getDataAttribute('command')
    }
  },

  addOptions () {
    return {
      renderLabel ({ options, node }) {
        return `${options.suggestion.char}${node.attrs.command ?? ''}`
      },
      suggestion: { char: '/' }
    }
  },

  parseHTML () {
    return [
      {
        tag: `span[data-type="${this.name}"]`
      }
    ]
  },

  renderHTML ({ node, HTMLAttributes }) {
    const options = this.options
    return [
      'span',
      mergeAttributes(
        {
          'data-type': this.name
        },
        HTMLAttributes
      ),
      this.options.renderLabel({ options, node })
    ]
  },

  renderText ({ node }) {
    const options = this.options
    return options.renderLabel({ options, node })
  }
})
