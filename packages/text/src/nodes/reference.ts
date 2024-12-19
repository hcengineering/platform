//
// Copyright © 2023 Hardcore Engineering Inc.
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
import { getDataAttribute } from './utils'

export interface ReferenceOptions {
  renderLabel: (props: { options: ReferenceOptions, node: any }) => string
  suggestion: { char: string }
}

/**
 * @public
 */
export const ReferenceNode = Node.create<ReferenceOptions>({
  name: 'reference',
  group: 'inline',
  inline: true,

  addAttributes () {
    return {
      id: getDataAttribute('id'),
      objectclass: getDataAttribute('objectclass'),
      label: getDataAttribute('label'),
      class: { default: null }
    }
  },

  addOptions () {
    return {
      renderLabel ({ options, node }) {
        // eslint-disable-next-line
        return `${options.suggestion.char}${node.attrs.label ?? node.attrs.id}`
      },
      suggestion: { char: '@' }
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
