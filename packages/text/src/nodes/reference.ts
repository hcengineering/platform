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

import { Class, Doc, Ref } from '@hcengineering/core'
import { Node, mergeAttributes } from '@tiptap/core'
import { Node as ProseMirrorNode } from '@tiptap/pm/model'

/**
 * @public
 */
export interface Reference {
  objectId: Ref<Doc>
  objectClass: Ref<Class<Doc>>
  parentNode: ProseMirrorNode | null
}

/**
 * @public
 */
export function extractReferences (content: ProseMirrorNode): Array<Reference> {
  const result: Array<Reference> = []

  content.descendants((node, _pos, parent): boolean => {
    if (node.type.name === ReferenceNode.name) {
      const objectId = node.attrs.id as Ref<Doc>
      const objectClass = node.attrs.objectclass as Ref<Class<Doc>>
      const e = result.find((e) => e.objectId === objectId && e.objectClass === objectClass)
      if (e === undefined) {
        result.push({ objectId, objectClass, parentNode: parent })
      }
    }

    return true
  })

  return result
}

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

      objectclass: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-objectclass'),
        renderHTML: (attributes) => {
          if (attributes.objectclass === null) {
            return {}
          }

          return {
            'data-objectclass': attributes.objectclass
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
