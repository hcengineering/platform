//
// Copyright © 2025 Hardcore Engineering Inc.
// Copyright © 2026 TraceX SAS.
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

import { Node } from '@tiptap/core'

export const EmbedNode = Node.create({
  name: 'embed',

  addOptions () {
    return {}
  },

  inline: false,
  group: 'block',
  atom: false,
  draggable: false,

  addAttributes () {
    return {
      src: {
        default: null
      }
    }
  },

  parseHTML () {
    return [
      {
        priority: 60,
        tag: `div[data-type="${this.name}"]`,
        getAttrs (node) {
          const src = node.getAttribute('data-embed-src')?.trim()
          if (src === undefined) return false
          return { src }
        }
      },
      {
        priority: 60,
        tag: `figure[data-type="${this.name}"] iframe[src]`
      }
    ]
  },

  renderHTML ({ node }) {
    return [
      'div',
      {
        'data-type': this.name,
        'data-embed-src': node.attrs.src,
        class: 'embed-node'
      },
      ['a', { href: node.attrs.src }, node.attrs.src]
    ]
  }
})
