//
// Copyright © 2023, 2024 Hardcore Engineering Inc.
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

import { type Editor } from '@tiptap/core'
import TiptapTable from '@tiptap/extension-table'
import { CellSelection } from '@tiptap/pm/tables'
import { SvelteNodeViewRenderer } from '../../node-view'
import TableNodeView from './TableNodeView.svelte'
import { isTableSelected } from './utils'

export const Table = TiptapTable.extend({
  addKeyboardShortcuts () {
    return {
      'Mod-Backspace': () => handleDelete(this.editor),
      'Mod-Delete': () => handleDelete(this.editor)
    }
  },
  addNodeView () {
    return SvelteNodeViewRenderer(TableNodeView, {})
  }
})

function handleDelete (editor: Editor): boolean {
  const { selection } = editor.state
  if (selection instanceof CellSelection) {
    if (isTableSelected(selection)) {
      return editor.commands.deleteTable()
    } else if (selection.isColSelection()) {
      return editor.commands.deleteColumn()
    } else if (selection.isRowSelection()) {
      return editor.commands.deleteRow()
    }
  }

  return false
}
