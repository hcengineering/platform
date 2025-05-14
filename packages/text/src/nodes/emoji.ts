//
// Copyright © 2025 Hardcore Engineering Inc.
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
import type { Blob, Ref } from '@hcengineering/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    emoji: {
      insertEmoji: (emoji: string, kind: 'unicode' | 'image', image?: Ref<Blob>) => ReturnType
    }
  }
}

export interface EmojiNodeOptions {
  getBlobRef: (fileId: Ref<Blob>, filename?: string, size?: number) => Promise<{ src: string, srcset: string }>
}

export const EmojiNode = Node.create<EmojiNodeOptions>({
  name: 'emoji',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: false,

  addAttributes () {
    return {
      emoji: {
        default: ''
      },
      kind: {
        default: 'unicode'
      },
      image: {
        default: null
      }
    }
  },

  addCommands () {
    return {
      insertEmoji:
        (emoji: string, kind: 'unicode' | 'image', image?: Ref<Blob>) =>
          ({ commands }) => {
            if (kind === 'image') emoji = `:${emoji}:`
            return commands.insertContent({
              type: this.name,
              attrs: { emoji, kind, image }
            })
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

  addNodeView () {
    return ({ node, HTMLAttributes }) => {
      const container = document.createElement('span')
      const containerAttributes = mergeAttributes(
        {
          'data-type': this.name,
          class: 'emoji'
        },
        HTMLAttributes
      )

      for (const [k, v] of Object.entries(containerAttributes)) {
        if (v !== null) {
          container.setAttribute(k, v)
        }
      }

      if (node.attrs.kind === 'image') {
        const imgElement = document.createElement('img')
        imgElement.alt = node.attrs.emoji
        imgElement.setAttribute('data-type', this.name)
        void this.options.getBlobRef(node.attrs.image).then((val) => {
          imgElement.src = val.src
          imgElement.srcset = val.srcset
        })
        container.append(imgElement)
      } else {
        container.append(node.attrs.emoji)
      }

      return {
        dom: container
      }
    }
  },

  renderHTML ({ node, HTMLAttributes }) {
    if (node.attrs.kind === 'image') {
      return [
        'span',
        mergeAttributes(
          {
            'data-type': this.name,
            class: 'emoji'
          },
          HTMLAttributes
        ),
        [
          'img',
          mergeAttributes({
            'data-type': this.name,
            src: node.attrs.image,
            alt: node.attrs.emoji
          })
        ]
      ]
    }
    return [
      'span',
      mergeAttributes(
        {
          'data-type': this.name,
          class: 'emoji'
        },
        HTMLAttributes
      ),
      node.attrs.emoji
    ]
  }
})
