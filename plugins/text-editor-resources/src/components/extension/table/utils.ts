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

import { findParentNode } from '@tiptap/core'
import { type Selection, type Transaction } from '@tiptap/pm/state'
import { CellSelection, type Rect, TableMap, addColumn, addRow } from '@tiptap/pm/tables'

import { TableSelection, type TableNodeLocation } from './types'

export function insertColumn (table: TableNodeLocation, index: number, tr: Transaction): Transaction {
  const map = TableMap.get(table.node)
  const rect = {
    map,
    tableStart: table.start,
    table: table.node,
    top: 0,
    left: 0,
    bottom: map.height - 1,
    right: map.width - 1
  }
  return addColumn(tr, rect, index)
}

export function insertRow (table: TableNodeLocation, index: number, tr: Transaction): Transaction {
  const map = TableMap.get(table.node)
  const rect = {
    map,
    tableStart: table.start,
    table: table.node,
    top: 0,
    left: 0,
    bottom: map.height - 1,
    right: map.width - 1
  }
  return addRow(tr, rect, index)
}

export function selectColumn (table: TableNodeLocation, index: number, tr: Transaction): Transaction {
  const { map } = TableMap.get(table.node)

  const anchorCell = table.start + map[index]
  const $anchor = tr.doc.resolve(anchorCell)

  return tr.setSelection(CellSelection.colSelection($anchor))
}

export function selectRow (table: TableNodeLocation, index: number, tr: Transaction): Transaction {
  const { map, width } = TableMap.get(table.node)

  const anchorCell = table.start + map[index * width]
  const $anchor = tr.doc.resolve(anchorCell)

  return tr.setSelection(CellSelection.rowSelection($anchor))
}

export function selectTable (table: TableNodeLocation, tr: Transaction): Transaction {
  const { map } = TableMap.get(table.node)

  const $head = tr.doc.resolve(table.start + map[0])
  const $anchor = tr.doc.resolve(table.start + map[map.length - 1])

  return tr.setSelection(new TableSelection($anchor, $head))
}

export const isColumnSelected = (columnIndex: number, selection: Selection): boolean => {
  if (selection instanceof CellSelection) {
    const { height } = TableMap.get(selection.$anchorCell.node(-1))
    const rect = { left: columnIndex, right: columnIndex + 1, top: 0, bottom: height }
    return isRectSelected(rect, selection)
  }

  return false
}

export const isRowSelected = (rowIndex: number, selection: Selection): boolean => {
  if (selection instanceof CellSelection) {
    const { width } = TableMap.get(selection.$anchorCell.node(-1))
    const rect = { left: 0, right: width, top: rowIndex, bottom: rowIndex + 1 }
    return isRectSelected(rect, selection)
  }

  return false
}

function getSelectedRect (selection: CellSelection, map: TableMap): Rect {
  const start = selection.$anchorCell.start(-1)
  return map.rectBetween(selection.$anchorCell.pos - start, selection.$headCell.pos - start)
}

export const getSelectedRows = (selection: Selection, map: TableMap): number[] => {
  if (selection instanceof CellSelection && selection.isRowSelection()) {
    const selectedRect = getSelectedRect(selection, map)
    return [...Array(selectedRect.bottom - selectedRect.top).keys()].map((idx) => idx + selectedRect.top)
  }

  return []
}

export const getSelectedColumns = (selection: Selection, map: TableMap): number[] => {
  if (selection instanceof CellSelection && selection.isColSelection()) {
    const selectedRect = getSelectedRect(selection, map)
    return [...Array(selectedRect.right - selectedRect.left).keys()].map((idx) => idx + selectedRect.left)
  }

  return []
}

export const isTableSelected = (selection: Selection): boolean => {
  if (selection instanceof CellSelection) {
    const { height, width } = TableMap.get(selection.$anchorCell.node(-1))
    const rect = { left: 0, top: 0, right: width, bottom: height }
    return isRectSelected(rect, selection)
  }

  return false
}

export const isRectSelected = (rect: Rect, selection: CellSelection): boolean => {
  const map = TableMap.get(selection.$anchorCell.node(-1))
  const cells = map.cellsInRect(rect)
  const selectedCells = map.cellsInRect(getSelectedRect(selection, map))

  return cells.every((cell) => selectedCells.includes(cell))
}

export const findTable = (selection: Selection): TableNodeLocation | undefined => {
  return findParentNode((node) => node.type.spec.tableRole === 'table')(selection)
}
