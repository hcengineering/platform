//
// Copyright © 2023 Hardcore Engineering Inc.
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

import { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { Transaction } from '@tiptap/pm/state'
import { TableMap } from '@tiptap/pm/tables'
import { TableNodeLocation } from '../types'

type TableCell = {
  cell: ProseMirrorNode
  pos: number
}

export function moveColumn (from: number, to: number, table: TableNodeLocation, tr: Transaction): Transaction {
  const fromCells = getColumnCells(table, from)
  const toCells = getColumnCells(table, to)
  return moveCells(fromCells, toCells, table, tr)
}

export function moveRow (from: number, to: number, table: TableNodeLocation, tr: Transaction): Transaction {
  const fromCells = getRowCells(table, from)
  const toCells = getRowCells(table, to)
  return moveCells(fromCells, toCells, table, tr)
}

function moveCells (fromCells: TableCell[], toCells: TableCell[], table: TableNodeLocation, tr: Transaction): Transaction {
  if (fromCells.length !== toCells.length) return tr
  const mapStart = tr.mapping.maps.length

  for (let i = 0; i < toCells.length; i++) {
    const fromCell = fromCells[i]
    const toCell = toCells[i]

    let fromStart = tr.mapping
      .slice(mapStart)
      .map(table.start + fromCell.pos)
    let fromEnd = fromStart + fromCell.cell.nodeSize
    const fromSlice = tr.doc.slice(fromStart, fromEnd)

    const toStart = tr.mapping
      .slice(mapStart)
      .map(table.start + toCell.pos)
    const toEnd = toStart + toCell.cell.nodeSize
    const toSlice = tr.doc.slice(toStart, toEnd)

    tr.replace(toStart, toEnd, fromSlice)

    fromStart = tr.mapping.slice(mapStart).map(table.start + fromCell.pos)
    fromEnd = fromStart + fromCell.cell.nodeSize
    tr.replace(fromStart, fromEnd, toSlice)
  }

  return tr
}

function getColumnCells (table: TableNodeLocation, col: number): TableCell[] {
  const { map, width, height } = TableMap.get(table.node)

  const cells: TableCell[] = []
  for (let row = 0; row < height; row++) {
    const index = row * width + col
    const pos = map[index]

    const cell = table.node.nodeAt(pos)
    if (cell !== null) {
      cells.push({ cell, pos })
    }
  }

  return cells
}

function getRowCells (table: TableNodeLocation, row: number): TableCell[] {
  const { map, width } = TableMap.get(table.node)

  const cells: TableCell[] = []
  for (let col = 0; col < width; col++) {
    const index = row * width + col
    const pos = map[index]

    const cell = table.node.nodeAt(pos)
    if (cell !== null) {
      cells.push({ cell, pos })
    }
  }

  return cells
}
