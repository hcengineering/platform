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
import { Attrs } from '@tiptap/pm/model'

export interface ReferenceNodeProps {
  id: Ref<Doc>
  objectclass: Ref<Class<Doc>>
  label: string
}

export interface ReferenceOptions {
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

  addAttributes () {
    return {
      id: getDataAttribute('id'),
      objectclass: getDataAttribute('objectclass'),
      label: getDataAttribute('label')
    }
  },

  addOptions () {
    return {
      suggestion: { char: '@' },
      HTMLAttributes: {}
    }
  },

  parseHTML () {
    return [
      {
        priority: 60,
        tag: 'span[data-type="reference"]',
        getAttrs
      },
      {
        priority: 60,
        tag: 'a[data-type="reference"]',
        getAttrs
      }
    ]
  },

  renderHTML ({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(
        {
          'data-type': this.name,
          'data-id': node.attrs.id,
          'data-objectclass': node.attrs.objectclass,
          'data-label': node.attrs.label,
          class: 'antiMention'
        },
        this.options.HTMLAttributes,
        HTMLAttributes
      ),
      `${this.options.suggestion.char}${node.attrs.label ?? node.attrs.id}`
    ]
  }
})

function getAttrs (el: HTMLSpanElement): Attrs | false {
  console.log('getting attrs...', el)

  const id = el.dataset.id?.trim()
  const label = el.dataset.label?.trim()
  const objectclass = el.dataset.objectclass?.trim()

  if (id == null || label == null || objectclass == null) {
    return false
  }

  return {
    id,
    label,
    objectclass
  }
}
