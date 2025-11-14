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

import TiptapTableCell from '@tiptap/extension-table-cell'
import { Plugin } from '@tiptap/pm/state'
import { type Node } from '@tiptap/pm/model'
import { CellSelection, TableMap } from '@tiptap/pm/tables'

import { TableCachePlugin } from './decorations/plugins'
import { TableColumnHandlerDecorationPlugin } from './decorations/columnHandlerDecoration'
import { TableColumnInsertDecorationPlugin } from './decorations/columnInsertDecoration'
import { TableRowHandlerDecorationPlugin } from './decorations/rowHandlerDecoration'
import { TableRowInsertDecorationPlugin } from './decorations/rowInsertDecoration'
import { TableDragMarkerDecorationPlugin } from './decorations/tableDragMarkerDecoration'
import { TableSelectionDecorationPlugin } from './decorations/tableSelectionDecoration'
import { findTable } from './utils'

export const TableCell = TiptapTableCell.extend({
  addProseMirrorPlugins () {
    return [
      TableCachePlugin(),
      TableSelectionNormalizerPlugin(),
      TableSelectionDecorationPlugin(this.editor),
      TableDragMarkerDecorationPlugin(this.editor),
      TableColumnHandlerDecorationPlugin(this.editor),
      TableColumnInsertDecorationPlugin(this.editor),
      TableRowHandlerDecorationPlugin(this.editor),
      TableRowInsertDecorationPlugin(this.editor)
    ]
  }
})

const TableSelectionNormalizerPlugin = (): Plugin<any> => {
  return new Plugin({
    appendTransaction: (transactions, oldState, newState) => {
      const selection = newState.selection
      if (selection.eq(oldState.selection) || !(selection instanceof CellSelection)) return

      const table = findTable(newState.selection)
      if (table === undefined) return

      const tableMap = TableMap.get(table.node)

      // Single pass to build initial rect and collect selected positions
      let minLeft = Infinity
      let minTop = Infinity
      let maxRight = -Infinity
      let maxBottom = -Infinity

      const selectedPositions = new Set<number>()

      selection.forEachCell((_node, pos) => {
        const relPos = pos - table.pos - 1
        selectedPositions.add(relPos)

        const cell = tableMap.findCell(relPos)
        if (cell === undefined) return

        minLeft = Math.min(minLeft, cell.left)
        minTop = Math.min(minTop, cell.top)
        maxRight = Math.max(maxRight, cell.right)
        maxBottom = Math.max(maxBottom, cell.bottom)
      })

      if (!isFinite(minLeft)) return

      // Expand rect to include all cells in the rectangular region
      // and check if we need to expand further
      let needsExpansion = false
      const { width } = tableMap

      for (let row = minTop; row < maxBottom; row++) {
        for (let col = minLeft; col < maxRight; col++) {
          const pos = tableMap.map[row * width + col]
          if (!selectedPositions.has(pos)) {
            // Found a cell in rect that's not selected, need to expand
            const cell = tableMap.findCell(pos)
            if (cell !== undefined) {
              minLeft = Math.min(minLeft, cell.left)
              minTop = Math.min(minTop, cell.top)
              maxRight = Math.max(maxRight, cell.right)
              maxBottom = Math.max(maxBottom, cell.bottom)
              needsExpansion = true
            }
          }
        }
      }

      // If we expanded, we need to check again (for merged cells)
      if (needsExpansion) {
        for (let row = minTop; row < maxBottom; row++) {
          for (let col = minLeft; col < maxRight; col++) {
            const pos = tableMap.map[row * width + col]
            const cell = tableMap.findCell(pos)
            if (cell !== undefined) {
              minLeft = Math.min(minLeft, cell.left)
              minTop = Math.min(minTop, cell.top)
              maxRight = Math.max(maxRight, cell.right)
              maxBottom = Math.max(maxBottom, cell.bottom)
            }
          }
        }
      }

      // Original promemirror implementation of TableMap.positionAt skips rowspan cells, which leads to unpredictable selection behaviour
      const firstCellOffset = cellPositionAt(tableMap, maxBottom - 1, maxRight - 1, table.node)
      const lastCellOffset = cellPositionAt(tableMap, minTop, minLeft, table.node)

      const firstCellPos = newState.doc.resolve(table.start + firstCellOffset)
      const lastCellPos = newState.doc.resolve(table.start + lastCellOffset)

      const reverseOrder = selection.$anchorCell.pos > selection.$headCell.pos
      const $head = reverseOrder ? lastCellPos : firstCellPos
      const $anchor = reverseOrder ? firstCellPos : lastCellPos

      const newSelection = new CellSelection($anchor, $head)

      if (newSelection.eq(newState.selection)) return

      return newState.tr.setSelection(new CellSelection($anchor, $head))
    }
  })
}

function cellPositionAt (tableMap: TableMap, row: number, col: number, table: Node): number {
  for (let i = 0, rowStart = 0; ; i++) {
    const rowEnd = rowStart + table.child(i).nodeSize
    if (i === row) {
      const index = col + row * tableMap.width
      const rowEndIndex = (row + 1) * tableMap.width
      return index === rowEndIndex ? rowEnd - 1 : tableMap.map[index]
    }
    rowStart = rowEnd
  }
}
