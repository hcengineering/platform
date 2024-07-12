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
import TiptapTableCell from '@tiptap/extension-table-cell'
import { Plugin, PluginKey, type Selection } from '@tiptap/pm/state'
import { DecorationSet } from '@tiptap/pm/view'

import { findTable } from './utils'
import { columnHandlerDecoration } from './decorations/columnHandlerDecoration'
import { columnInsertDecoration } from './decorations/columnInsertDecoration'
import { rowInsertDecoration } from './decorations/rowInsertDecoration'
import { tableDragMarkerDecoration } from './decorations/tableDragMarkerDecoration'
import { tableSelectionDecoration } from './decorations/tableSelectionDecoration'
import { rowHandlerDecoration } from './decorations/rowHandlerDecoration'

export const TableCell = TiptapTableCell.extend({
  addProseMirrorPlugins () {
    return [tableCellDecorationPlugin(this.editor)]
  }
})

interface TableCellDecorationPluginState {
  decorations?: DecorationSet
  selection?: Selection
}

const tableCellDecorationPlugin = (editor: Editor): Plugin<TableCellDecorationPluginState> => {
  const key = new PluginKey('table-cell-decoration-plugin')
  return new Plugin({
    key,
    state: {
      init: (): TableCellDecorationPluginState => {
        return {}
      },
      apply (tr, prev, oldState, newState) {
        if (!editor.isEditable) {
          return { selection: newState.selection, decorations: DecorationSet.empty }
        }

        const newTable = findTable(newState.selection)

        if (newTable === undefined) {
          return {}
        }

        if (prev.selection === newState.selection) {
          return prev
        }

        const decorations = DecorationSet.create(newState.doc, [
          ...tableSelectionDecoration(newState, newTable),
          ...tableDragMarkerDecoration(newState, newTable),
          ...columnHandlerDecoration(newState, newTable, editor),
          ...columnInsertDecoration(newState, newTable, editor),
          ...rowHandlerDecoration(newState, newTable, editor),
          ...rowInsertDecoration(newState, newTable, editor)
        ])
        return { selection: newState.selection, decorations }
      }
    },
    props: {
      decorations (state) {
        return key.getState(state).decorations
      }
    }
  })
}
