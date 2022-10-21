//
// Copyright © 2022 Hardcore Engineering Inc.
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
import { generateId } from '@hcengineering/core'
import { Node } from '@tiptap/core'
import { Plugin } from 'prosemirror-state'

export const UniqId = Node.create({
  name: 'blockId',

  addGlobalAttributes () {
    return [
      {
        types: ['heading', 'paragraph'],
        attributes: {
          uid: {
            default: undefined,
            rendered: false,
            keepOnSplit: false
          }
        }
      }
    ]
  },

  addProseMirrorPlugins () {
    return [
      new Plugin({
        appendTransaction: (_transactions, oldState, newState) => {
          // no changes
          if (newState.doc === oldState.doc) {
            return
          }
          const tr = newState.tr

          newState.doc.descendants((node, pos, parent) => {
            if (node.isBlock && parent === newState.doc && node.attrs?.uid === undefined) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                uid: generateId()
              })
            }
          })

          return tr
        }
      })
    ]
  }
})
