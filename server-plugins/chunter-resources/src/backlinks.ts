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

import { AnyExtension, getSchema, Node, mergeAttributes } from '@tiptap/core'
import { generateJSON } from '@tiptap/html'
import StarterKit from '@tiptap/starter-kit'
import { Node as ProseMirrorNode } from '@tiptap/pm/model'

import { Backlink } from '@hcengineering/chunter'
import { Class, Data, Doc, Ref } from '@hcengineering/core'

const ReferenceNode = Node.create({
  name: 'reference',
  group: 'inline',
  inline: true,

  addAttributes () {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-id'),
        renderHTML: (attributes) => {
          if (attributes.id !== null) {
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
          if (attributes.objectClass !== null) {
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
          if (attributes.label !== null) {
            return {}
          }

          return {
            'data-label': attributes.label
          }
        }
      }
    }
  },

  parseHTML () {
    return [
      {
        tag: 'span[data-type="reference"]'
      }
    ]
  },

  renderHTML ({ HTMLAttributes }) {
    return ['span', mergeAttributes({ 'data-type': this.name }, this.options.HTMLAttributes, HTMLAttributes)]
  }
})

const extensions: Array<AnyExtension> = [StarterKit, ReferenceNode]
const schema = getSchema(extensions)

export function getBacklinks (
  backlinkId: Ref<Doc>,
  backlinkClass: Ref<Class<Doc>>,
  attachedDocId: Ref<Doc> | undefined,
  content: string
): Array<Data<Backlink>> {
  const json = generateJSON(content, extensions)
  const doc = ProseMirrorNode.fromJSON(schema, json)

  const result: Array<Data<Backlink>> = []

  doc.descendants((node): boolean => {
    if (node.type.name === ReferenceNode.name) {
      const ato = node.attrs.id as Ref<Doc>
      const atoClass = node.attrs.objectClass as Ref<Class<Doc>>
      const e = result.find((e) => e.attachedTo === ato && e.attachedToClass === atoClass)
      if (e === undefined && ato !== attachedDocId && ato !== backlinkId) {
        result.push({
          attachedTo: ato,
          attachedToClass: atoClass,
          collection: 'backlinks',
          backlinkId,
          backlinkClass,
          message: content,
          attachedDocId
        })
      }
    }

    return true
  })

  return result
}
