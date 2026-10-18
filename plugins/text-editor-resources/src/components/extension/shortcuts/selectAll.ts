//
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { Extension } from '@tiptap/core'
import { type Node } from '@tiptap/pm/model'
import { type EditorState, NodeSelection, type Selection, TextSelection } from '@tiptap/pm/state'

function isSelectAllScope (node: Node): boolean {
  const { code, tableRole } = node.type.spec
  return code === true || tableRole === 'cell' || tableRole === 'header_cell'
}

/**
 * Returns the selection Mod-a should produce: the content of the innermost code block or
 * table cell around the selection that is not fully selected yet, or undefined to fall
 * back to selecting the whole document.
 */
export function getScopedSelectAll (state: EditorState): Selection | undefined {
  const { selection, doc } = state
  if (!(selection instanceof TextSelection) && !(selection instanceof NodeSelection)) return

  const { $from, from, to } = selection
  for (let depth = $from.sharedDepth(to); depth > 0; depth--) {
    if (!isSelectAllScope($from.node(depth))) continue

    const target = TextSelection.between(doc.resolve($from.start(depth)), doc.resolve($from.end(depth)))
    if (target.from < from || target.to > to) return target
  }
}

export const SelectAllExtension = Extension.create({
  name: 'scopedSelectAll',

  addKeyboardShortcuts () {
    return {
      'Mod-a': () => {
        const selection = getScopedSelectAll(this.editor.state)
        if (selection === undefined) return false

        return this.editor.commands.command(({ tr, dispatch }) => {
          if (dispatch !== undefined) tr.setSelection(selection)
          return true
        })
      }
    }
  }
})
