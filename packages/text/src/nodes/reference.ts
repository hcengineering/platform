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
import { Class, Doc, Ref } from '@hcengineering/core'

export interface ReferenceNodeProps {
  id: Ref<Doc>
  objectclass: Ref<Class<Doc>>
  label: string
}

export interface ReferenceOptions {
  renderLabel: (props: { options: ReferenceOptions, props: ReferenceNodeProps }) => string
  suggestion: { char?: string }
  HTMLAttributes: Record<string, any>
}

/**
 * @public
 */
export const ReferenceNode = Node.create<ReferenceOptions>({
  name: 'reference',
  group: 'inline',
  inline: true,
  selectable: true,
  atom: true,
  draggable: true,

  addAttributes () {
    return {
      id: getDataAttribute('id'),
      objectclass: getDataAttribute('objectclass'),
      label: getDataAttribute('label')
    }
  },

  addOptions () {
    return {
      renderLabel ({ options, props }) {
        // eslint-disable-next-line
        return `${options.suggestion.char}${props.label ?? props.id}`
      },
      suggestion: { char: '@' },
      HTMLAttributes: {}
    }
  },

  parseHTML () {
    return [
      {
        tag: `span[data-type="${this.name}"]`,
        getAttrs: (el) => {
          const id = (el as HTMLSpanElement).getAttribute('id')?.trim()
          const label = (el as HTMLSpanElement).getAttribute('label')?.trim()
          const objectclass = (el as HTMLSpanElement).getAttribute('objectclass')?.trim()

          if (id == null || label == null || objectclass == null) {
            return false
          }

          return {
            id,
            label,
            objectclass
          }
        }
      }
    ]
  },

  renderHTML ({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(
        {
          'data-type': this.name,
          class: 'antiMention'
        },
        this.options.HTMLAttributes,
        HTMLAttributes
      ),
      this.options.renderLabel({
        options: this.options,
        props: node.attrs as ReferenceNodeProps
      })
    ]
  },

  renderText ({ node }) {
    const options = this.options
    return options.renderLabel({ options, props: node.attrs as ReferenceNodeProps })
  }
})
