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

/**
 * @public
 */
export const ReferenceNode = Node.create({
  name: 'reference',
  group: 'inline',
  content: 'inline*',
  inline: true,

  addAttributes () {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-id'),
        renderHTML: (attributes) => {
          if (attributes.id === null) {
            return {}
          }

          return {
            'data-id': attributes.id
          }
        }
      },

      objectClass: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-objectclass'),
        renderHTML: (attributes) => {
          if (attributes.objectClass === null) {
            return {}
          }

          return {
            'data-objectclass': attributes.objectClass
          }
        }
      },

      label: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-label'),
        renderHTML: (attributes) => {
          if (attributes.label === null) {
            return {}
          }

          return {
            'data-label': attributes.label
          }
        }
      },

      class: {
        default: null
      }
    }
  },

  parseHTML () {
    return [
      {
        tag: `span[data-type="${this.name}"]`
      }
    ]
  },

  renderHTML ({ HTMLAttributes }) {
    return ['span', mergeAttributes({ 'data-type': this.name }, HTMLAttributes), 0]
  }
})
