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
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { type Command, type EditorState } from '@tiptap/pm/state'
import { CellSelection, TableMap, addRow, isInTable, selectedRect } from '@tiptap/pm/tables'

/**
 * Number of table rows covered by the current selection.
 * A cell selection counts all the rows it spans, any other selection inside a table counts as one row.
 */
export function getSelectedRowCount (state: EditorState): number {
  if (!isInTable(state)) return 0
  if (!(state.selection instanceof CellSelection)) return 1
  const rect = selectedRect(state)
  return Math.max(1, rect.bottom - rect.top)
}

/**
 * Inserts as many empty rows as the selection spans, before or after the selection, in a single transaction.
 */
export function addRows (side: 'before' | 'after'): Command {
  return (state, dispatch) => {
    if (!isInTable(state)) return false
    if (dispatch !== undefined) {
      const rect = selectedRect(state)
      const count = getSelectedRowCount(state)
      const index = side === 'before' ? rect.top : rect.bottom
      const tr = state.tr
      for (let i = 0; i < count; i++) {
        // Re-read the table on every iteration so that row spans grown by the previous insertion are respected
        const table = tr.doc.nodeAt(rect.tableStart - 1)
        if (table === null) break
        addRow(tr, { ...rect, map: TableMap.get(table), table }, index)
      }
      dispatch(tr.scrollIntoView())
    }
    return true
  }
}
