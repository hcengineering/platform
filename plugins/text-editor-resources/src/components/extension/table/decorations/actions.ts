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

import { Fragment, type Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { Transaction } from '@tiptap/pm/state'
import { type CellSelection, TableMap } from '@tiptap/pm/tables'
import type { TableNodeLocation } from '../types'
import { type Editor } from '@tiptap/core'

type TableRow = Array<ProseMirrorNode | null>
type TableRows = TableRow[]

export function moveSelectedColumns (
  editor: Editor,
  table: TableNodeLocation,
  selection: CellSelection,
  to: number,
  tr: Transaction
): Transaction {
  const tableMap = TableMap.get(table.node)

  let columnStart = -1
  let columnEnd = -1

  selection.forEachCell((node, pos) => {
    const cell = tableMap.findCell(pos - table.pos - 1)
    for (let i = cell.left; i < cell.right; i++) {
      columnStart = columnStart >= 0 ? Math.min(cell.left, columnStart) : cell.left
      columnEnd = columnEnd >= 0 ? Math.max(cell.right, columnEnd) : cell.right
    }
  })

  if (to < 0 || to > tableMap.width || (to >= columnStart && to < columnEnd)) return tr

  const rows = tableToCells(table)
  for (const row of rows) {
    const range = row.splice(columnStart, columnEnd - columnStart)
    const offset = to > columnStart ? to - (columnEnd - columnStart - 1) : to
    row.splice(offset, 0, ...range)
  }

  tableFromCells(editor, table, rows, tr)
  return tr
}

export function moveSelectedRows (
  editor: Editor,
  table: TableNodeLocation,
  selection: CellSelection,
  to: number,
  tr: Transaction
): Transaction {
  const tableMap = TableMap.get(table.node)

  let rowStart = -1
  let rowEnd = -1

  selection.forEachCell((node, pos) => {
    const cell = tableMap.findCell(pos - table.pos - 1)
    for (let i = cell.top; i < cell.bottom; i++) {
      rowStart = rowStart >= 0 ? Math.min(cell.top, rowStart) : cell.top
      rowEnd = rowEnd >= 0 ? Math.max(cell.bottom, rowEnd) : cell.bottom
    }
  })

  if (to < 0 || to > tableMap.height || (to >= rowStart && to < rowEnd)) return tr

  const rows = tableToCells(table)
  const range = rows.splice(rowStart, rowEnd - rowStart)
  const offset = to > rowStart ? to - (rowEnd - rowStart - 1) : to
  rows.splice(offset, 0, ...range)

  tableFromCells(editor, table, rows, tr)
  return tr
}

function isNotNull<T> (value: T | null): value is T {
  return value !== null
}

export function duplicateRows (table: TableNodeLocation, rowIndices: number[], tr: Transaction): Transaction {
  const rows = tableToCells(table)

  const { map, width } = TableMap.get(table.node)
  const mapStart = tr.mapping.maps.length

  const lastRowPos = map[rowIndices[rowIndices.length - 1] * width + width - 1]
  const nextRowStart = lastRowPos + (table.node.nodeAt(lastRowPos)?.nodeSize ?? 0) + 1
  const insertPos = tr.mapping.slice(mapStart).map(table.start + nextRowStart)

  for (let i = rowIndices.length - 1; i >= 0; i--) {
    tr.insert(insertPos, rows[rowIndices[i]].filter(isNotNull))
  }

  return tr
}

export function duplicateColumns (table: TableNodeLocation, columnIndices: number[], tr: Transaction): Transaction {
  const rows = tableToCells(table)

  const { map, width, height } = TableMap.get(table.node)
  const mapStart = tr.mapping.maps.length

  for (let row = 0; row < height; row++) {
    const lastColumnPos = map[row * width + columnIndices[columnIndices.length - 1]]
    const nextColumnStart = lastColumnPos + (table.node.nodeAt(lastColumnPos)?.nodeSize ?? 0)
    const insertPos = tr.mapping.slice(mapStart).map(table.start + nextColumnStart)

    for (let i = columnIndices.length - 1; i >= 0; i--) {
      const copiedNode = rows[row][columnIndices[i]]
      if (copiedNode !== null) {
        tr.insert(insertPos, copiedNode)
      }
    }
  }

  return tr
}

function tableToCells (table: TableNodeLocation): TableRows {
  const { map, width, height } = TableMap.get(table.node)

  const visitedCells = new Set<number>()
  const rows = []
  for (let row = 0; row < height; row++) {
    const cells = []
    for (let col = 0; col < width; col++) {
      const pos = map[row * width + col]
      cells.push(!visitedCells.has(pos) ? table.node.nodeAt(pos) : null)
      visitedCells.add(pos)
    }
    rows.push(cells)
  }

  return rows
}

function tableFromCells (editor: Editor, table: TableNodeLocation, rows: TableRows, tr: Transaction): void {
  const schema = editor.schema.nodes
  const newRowNodes = rows.map((row) =>
    schema.tableRow.create(
      null,
      row.filter((cell) => cell !== null)
    )
  )
  const newTableNode = table.node.copy(Fragment.from(newRowNodes))
  tr.replaceWith(table.pos, table.pos + table.node.nodeSize, newTableNode)
}
