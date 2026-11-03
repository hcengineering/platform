//
// Copyright © 2026 TraceX SAS.
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

import { TableMap } from '@tiptap/pm/tables'
import { Fragment, type Node } from '@tiptap/pm/model'
import {
  tableCellHash,
  tableCellsEqual,
  tableCellValue,
  tableMetadataColumnIds,
  tableMetadataRowIds,
  tableSnapshotFromMarkup,
  type TableCellValue,
  type TableMetadata,
  type TableSnapshot
} from '@hcengineering/view'

/**
 * Left grid column of every cell, keyed by the cell position relative to the table. Built in one
 * pass over the map: `TableMap.findCell` scans the map, so calling it per cell is quadratic.
 */
export function tableCellColumns (map: TableMap): Map<number, number> {
  const columns = new Map<number, number>()
  map.map.forEach((pos, index) => {
    if (!columns.has(pos)) columns.set(pos, index % map.width)
  })
  return columns
}

/**
 * For each grid column, the position (relative to the table) of the cell that carries its identity:
 * the first cell from the top spanning exactly that column. Merged cells never define a column.
 */
export function tableColumnCells (table: Node): number[] {
  const map = TableMap.get(table)
  return Array.from({ length: map.width }, (_, column) => {
    for (let row = 0; row < map.height; row++) {
      const pos = map.map[row * map.width + column]
      if (Number(table.nodeAt(pos)?.attrs.colspan ?? 1) === 1) return pos
    }
    return map.map[column]
  })
}

/**
 * Attach source identities and value fingerprints to a pasted or refreshed table. The table keeps
 * its rows and columns identified through edits and moves, and each cell remembers a short hash of
 * the value it had, so manual edits and source changes can be told apart later without storing a
 * second copy of the table. Transit row ids from the clipboard are not stored.
 */
export function attachTableSnapshot (node: Node, metadata: TableMetadata, rowIds?: string[]): Node {
  const { rowIds: transitRowIds, ...stored } = metadata
  const attrs = { ...node.attrs, tableMetadata: JSON.stringify(stored) }
  const map = TableMap.get(node)
  const rows = rowIds ?? transitRowIds ?? tableMetadataRowIds(metadata)
  const columns = tableMetadataColumnIds(metadata)
  if (metadata.version !== '2.0' || map.height !== rows.length + 1 || map.width !== columns.length) {
    return node.type.create(attrs, node.content, node.marks)
  }
  const cellColumns = tableCellColumns(map)
  const result: Node[] = []
  node.forEach((row, rowOffset, rowIndex) => {
    const cells: Node[] = []
    row.forEach((cell, cellOffset) => {
      const columnIndex = cellColumns.get(rowOffset + 1 + cellOffset) ?? -1
      const sourceHash = tableCellHash(tableCellValue(cell.toJSON()))
      cells.push(
        cell.type.create(
          { ...cell.attrs, sourceColumnId: columns[columnIndex] ?? null, sourceHash },
          cell.content,
          cell.marks
        )
      )
    })
    const sourceRowId = rowIndex === 0 ? null : (rows[rowIndex - 1] ?? null)
    result.push(row.type.create({ ...row.attrs, sourceRowId }, Fragment.fromArray(cells), row.marks))
  })
  return node.type.create(attrs, Fragment.fromArray(result), node.marks)
}

/** The table as it is now, read from the editor nodes, with the fingerprints its cells remember. */
export interface EditorTableState {
  snapshot: TableSnapshot
  /** Grid-aligned with `snapshot.cells`; undefined where a cell carries no fingerprint. */
  hashes: Array<Array<string | undefined>>
}

export function editorTableState (node: Node): EditorTableState {
  const map = TableMap.get(node)
  const columnIds = tableColumnCells(node).map((pos) => String(node.nodeAt(pos)?.attrs.sourceColumnId ?? ''))
  const rowIds: string[] = []
  node.forEach((row, _offset, index) => {
    if (index > 0) rowIds.push(String(row.attrs.sourceRowId ?? ''))
  })
  const hashes = Array.from({ length: map.height }, (_, row) =>
    Array.from({ length: map.width }, (_, column) => {
      const hash = node.nodeAt(map.map[row * map.width + column])?.attrs.sourceHash
      return typeof hash === 'string' ? hash : undefined
    })
  )
  return { snapshot: tableSnapshotFromMarkup(node.toJSON(), rowIds, columnIds), hashes }
}

/** Canonical values of the table as it is now, read from the editor nodes rather than Markdown. */
export function editorTableSnapshot (node: Node): TableSnapshot {
  return editorTableState(node).snapshot
}

export interface TableConflictCell {
  /** Empty for the header row. */
  rowId: string
  columnId: string
}

export interface TableEditSummary {
  localChanges: boolean
  conflicts: boolean
  conflictCells?: TableConflictCell[]
}

function isSourceId (id: string | undefined): id is string {
  return id !== undefined && id !== '' && !id.startsWith('local:')
}

/**
 * Three-way comparison through the fingerprints cells remember: a cell was edited manually when its
 * value no longer matches its fingerprint, and changed in the source when the fresh value does not.
 * Conflicts are reported, never merged: replacing the table keeps the source values. Rows or
 * columns added or removed by hand count as manual changes.
 */
export function summarizeTableEdits (
  current: EditorTableState,
  fresh: TableSnapshot,
  expected?: { rowIds: string[], columnIds: string[] }
): TableEditSummary {
  const { snapshot, hashes } = current
  if (!hashes.some((row) => row.some((hash) => hash !== undefined))) return { localChanges: false, conflicts: false }
  const freshRows = new Map(fresh.rowIds.map((id, index) => [id, index + 1]))
  const freshColumns = new Map(fresh.columnIds.map((id, index) => [id, index]))
  const freshCell = (rowId: string, columnId: string): TableCellValue | undefined => {
    const row = rowId === '' ? 0 : freshRows.get(rowId)
    const column = freshColumns.get(columnId)
    return row === undefined || column === undefined ? undefined : fresh.cells[row]?.[column]
  }

  let localChanges =
    !snapshot.rowIds.every(isSourceId) ||
    !snapshot.columnIds.every(isSourceId) ||
    (expected !== undefined &&
      (expected.rowIds.some((id) => freshRows.has(id) && !snapshot.rowIds.includes(id)) ||
        expected.columnIds.some((id) => freshColumns.has(id) && !snapshot.columnIds.includes(id))))
  const conflictCells: TableConflictCell[] = []
  const seen = new Set<string>()
  snapshot.cells.forEach((row, rowIndex) => {
    const rowId = rowIndex === 0 ? '' : snapshot.rowIds[rowIndex - 1]
    if (rowIndex > 0 && !isSourceId(rowId)) return
    row.forEach((value, columnIndex) => {
      const columnId = snapshot.columnIds[columnIndex]
      const hash = hashes[rowIndex]?.[columnIndex]
      const key = JSON.stringify([rowId, columnId])
      if (!isSourceId(columnId) || hash === undefined || seen.has(key)) return
      seen.add(key)
      if (tableCellHash(value) === hash) return
      localChanges = true
      const source = freshCell(rowId, columnId)
      const sourceChanged = source === undefined || tableCellHash(source) !== hash
      if (sourceChanged && (source === undefined || !tableCellsEqual(source, value))) {
        conflictCells.push({ rowId, columnId })
      }
    })
  })
  return {
    localChanges,
    conflicts: conflictCells.length > 0,
    ...(conflictCells.length > 0 ? { conflictCells } : {})
  }
}
