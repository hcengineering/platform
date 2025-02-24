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

import { type EditorState } from '@tiptap/pm/state'
import { CellSelection, TableMap } from '@tiptap/pm/tables'
import { Decoration } from '@tiptap/pm/view'

import { type TableNodeLocation } from '../types'

export const tableSelectionDecoration = (state: EditorState, table: TableNodeLocation): Decoration[] => {
  const decorations: Decoration[] = []

  const { selection } = state

  const tableMap = TableMap.get(table.node)

  if (selection instanceof CellSelection) {
    const selected: number[] = []

    selection.forEachCell((_node, pos) => {
      const start = pos - table.pos - 1
      selected.push(start)
    })

    selection.forEachCell((node, pos) => {
      const start = pos - table.pos - 1
      const borders = getTableCellBorders(start, selected, tableMap)

      const classes = ['table-cell-selected']

      if (borders.top) classes.push('table-cell-selected__border-top')
      if (borders.bottom) classes.push('table-cell-selected__border-bottom')
      if (borders.left) classes.push('table-cell-selected__border-left')
      if (borders.right) classes.push('table-cell-selected__border-right')

      decorations.push(Decoration.node(pos, pos + node.nodeSize, { class: classes.join(' ') }))
    })
  }

  return decorations
}

function getTableCellBorders (
  cell: number,
  selection: number[],
  tableMap: TableMap
): { top: boolean, bottom: boolean, left: boolean, right: boolean } {
  const { width, height } = tableMap
  const cellIndex = tableMap.map.indexOf(cell)

  const rect = tableMap.findCell(cell)
  const cellW = rect.right - rect.left
  const cellH = rect.bottom - rect.top

  const testRight = cellW
  const testBottom = width * cellH

  const topCell = cellIndex >= width ? tableMap.map[cellIndex - width] : undefined
  const bottomCell = cellIndex < width * height - testBottom ? tableMap.map[cellIndex + testBottom] : undefined
  const leftCell = cellIndex % width > 0 ? tableMap.map[cellIndex - 1] : undefined
  const rightCell = cellIndex % width < width - testRight ? tableMap.map[cellIndex + testRight] : undefined

  return {
    top: topCell === undefined || !selection.includes(topCell),
    bottom: bottomCell === undefined || !selection.includes(bottomCell),
    left: leftCell === undefined || !selection.includes(leftCell),
    right: rightCell === undefined || !selection.includes(rightCell)
  }
}
