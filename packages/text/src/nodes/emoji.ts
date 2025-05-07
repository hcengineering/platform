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

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    emoji: {
      insertEmoji: (emoji: string, kind: 'unicode' | 'image', url?: string) => ReturnType
    }
  }
}

export interface EmojiNodeOptions {
  emoji: string
  kind: 'unicode' | 'image'
  url?: string
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
      url: {
        default: null
      }
    }
  },

  addCommands () {
    return {
      insertEmoji:
        (emoji: string, kind: 'unicode' | 'image', url?: string) =>
          ({ commands }) => {
            return commands.insertContent({
              type: this.name,
              attrs: { emoji, kind, url }
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
            src: node.attrs.url,
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
