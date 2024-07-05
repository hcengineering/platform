// Copyright © 2024 Hardcore Engineering Inc.
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

import { findChildren, type RawCommands } from '@tiptap/core'
import { FileNode, ImageNode } from '@hcengineering/text'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    attachment: {
      /**
       * Delete a given attachment.
       */
      deleteAttachment: (id: string) => ReturnType
    }
  }
}

export const deleteAttachment: RawCommands['deleteAttachment'] =
  (id: string) =>
    ({ tr, dispatch }) => {
      if (dispatch !== undefined) {
        const nodeWithPos = findChildren(tr.doc, (node) => {
          return (
            (node.type.name === FileNode.name && node.attrs['file-id'] === id) ||
          (node.type.name === ImageNode.name && node.attrs['file-id'] === id)
          )
        })
        nodeWithPos
          .sort((a, b) => b.pos - a.pos)
          .forEach(({ node, pos }) => {
            tr.delete(pos, pos + node.nodeSize)
          })
      }

      return true
    }
