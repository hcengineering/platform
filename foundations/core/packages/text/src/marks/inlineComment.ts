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

import { Mark } from '@tiptap/core'
import { Fragment, Node, Slice } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export const InlineCommentMark = Mark.create({
  name: 'inline-comment',
  excludes: '',

  inclusive: false,

  parseHTML () {
    return [
      {
        tag: 'span.proseInlineComment[data-inline-comment-thread]'
      }
    ]
  },

  renderHTML ({ HTMLAttributes, mark }) {
    return ['span', { ...HTMLAttributes, class: 'proseInlineComment' }, 0]
  },

  addAttributes () {
    const name = 'data-inline-comment-thread-id'
    return {
      thread: {
        default: undefined,
        parseHTML: (element) => {
          return element.getAttribute(name)
        },
        renderHTML: (attributes) => {
          return { [name]: attributes.thread }
        }
      }
    }
  },

  addProseMirrorPlugins () {
    return [...(this.parent?.() ?? []), InlineCommentPasteFixPlugin()]
  }
})

function removeMarkFromNode (node: Node, name: string): Node {
  if (node.isText) {
    return node.mark(node.marks.filter((mark) => mark.type.name !== name))
  }

  if (node.content.size > 0) {
    const nodes: Node[] = []
    node.content.forEach((child) => {
      nodes.push(removeMarkFromNode(child, name))
    })
    return node.copy(Fragment.fromArray(nodes))
  }

  return node
}

export function InlineCommentPasteFixPlugin (): Plugin {
  return new Plugin({
    key: new PluginKey('inline-comment-paste-fix-plugin'),
    props: {
      transformPasted: (slice) => {
        const nodes: Node[] = []
        slice.content.forEach((node) => {
          nodes.push(removeMarkFromNode(node, 'inline-comment'))
        })
        return new Slice(Fragment.fromArray(nodes), slice.openStart, slice.openEnd)
      }
    }
  })
}
