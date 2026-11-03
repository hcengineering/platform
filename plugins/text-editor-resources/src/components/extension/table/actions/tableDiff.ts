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

import { type MarkupNode, MarkupNodeType } from '@hcengineering/text'
import { markdownToMarkup } from '@hcengineering/text-markdown'
import {
  tableCellHref,
  tableCellRich,
  tableCellText,
  tableCellToMarkup,
  tableCellValue,
  type TableCellValue,
  type TableSnapshot
} from '@hcengineering/view'

export interface TableDiffColumn {
  oldIndex?: number
  newIndex?: number
  oldHeader: string
  newHeader: string
}

export interface TableDiffCell {
  oldValue: string
  newValue: string
  oldHref?: string
  newHref?: string
  /** Set when formatting changed: documents to render with a markup diff. */
  oldMarkup?: MarkupNode
  newMarkup?: MarkupNode
}

export interface TableDiffRow {
  oldIndex?: number
  newIndex?: number
  moved: boolean
  cells: TableDiffCell[]
}

export interface TableDiff {
  columns: TableDiffColumn[]
  rows: TableDiffRow[]
}

/** A Markdown table (legacy tables without identities) or a snapshot with identities. */
export type TableDiffSide = string | TableSnapshot

interface ParsedTable {
  headers: string[]
  rows: TableCell[][]
}

interface TableCell {
  value: string
  href?: string
  rich: boolean
  /** Canonical content: text, links and meaningful formatting, independent of Markdown escaping. */
  canonical: string
  content: TableCellValue
}

function toCell (content: TableCellValue): TableCell {
  return {
    value: tableCellText(content),
    href: tableCellHref(content),
    rich: tableCellRich(content),
    canonical: JSON.stringify(content),
    content
  }
}

function cellDocument (content: TableCellValue): MarkupNode {
  return { type: MarkupNodeType.doc, content: [tableCellToMarkup(content) as MarkupNode] }
}

/** Markdown tables are compared only without merged cells; snapshots address merged cells by grid. */
function parseMarkdown (markdown: string): ParsedTable | undefined {
  const table = (markdownToMarkup(markdown).content ?? []).find((node) => node.type === MarkupNodeType.table)
  if (table === undefined) return undefined
  const rows: TableCell[][] = []
  for (const row of table.content ?? []) {
    if (row.type !== MarkupNodeType.table_row) return undefined
    const cells: TableCell[] = []
    for (const cell of row.content ?? []) {
      if (cell.type !== MarkupNodeType.table_cell && cell.type !== MarkupNodeType.table_header) return undefined
      if (Number(cell.attrs?.rowspan ?? 1) !== 1 || Number(cell.attrs?.colspan ?? 1) !== 1) return undefined
      cells.push(toCell(tableCellValue(cell)))
    }
    rows.push(cells)
  }
  const headers = rows[0]
  if (headers === undefined || headers.length === 0 || rows.some((row) => row.length !== headers.length)) {
    return undefined
  }
  return { headers: headers.map((cell) => cell.value), rows: rows.slice(1) }
}

function parseSnapshot (snapshot: TableSnapshot): ParsedTable | undefined {
  const rows = snapshot.cells.map((row) => row.map(toCell))
  const headers = rows[0]
  if (headers === undefined || headers.length === 0) return undefined
  return { headers: headers.map((cell) => cell.value), rows: rows.slice(1) }
}

function parseSide (side: TableDiffSide): ParsedTable | undefined {
  return typeof side === 'string' ? parseMarkdown(side) : parseSnapshot(side)
}

function uniqueMatches (oldValues: string[], newValues: string[]): Map<number, number> {
  const matches = new Map<number, number>()
  const oldCounts = countValues(oldValues)
  const newCounts = countValues(newValues)
  const oldIndices = new Map(oldValues.map((value, index) => [value, index]))
  newValues.forEach((value, newIndex) => {
    if (oldCounts.get(value) === 1 && newCounts.get(value) === 1) matches.set(newIndex, oldIndices.get(value)!)
  })
  return matches
}

function matchColumns (
  oldTable: ParsedTable,
  newTable: ParsedTable,
  oldIds?: string[],
  newIds?: string[]
): TableDiffColumn[] {
  if (oldIds !== undefined && newIds !== undefined) {
    const matches = uniqueMatches(oldIds, newIds)
    const columns: TableDiffColumn[] = newTable.headers.map((newHeader, newIndex) => {
      const oldIndex = matches.get(newIndex)
      return { oldIndex, newIndex, oldHeader: oldIndex === undefined ? '' : oldTable.headers[oldIndex], newHeader }
    })
    const used = new Set(matches.values())
    oldTable.headers.forEach((oldHeader, oldIndex) => {
      if (!used.has(oldIndex)) columns.push({ oldIndex, oldHeader, newHeader: '' })
    })
    return columns
  }
  const matches = uniqueMatches(oldTable.headers, newTable.headers)
  const usedOld = new Set(matches.values())

  // Display labels are not unique. Pair repeated labels by occurrence before treating other columns as renames.
  for (const label of new Set(oldTable.headers)) {
    const oldIndices = oldTable.headers
      .map((header, index) => ({ header, index }))
      .filter(({ header, index }) => header === label && !usedOld.has(index))
      .map(({ index }) => index)
    const newIndices = newTable.headers
      .map((header, index) => ({ header, index }))
      .filter(({ header, index }) => header === label && !matches.has(index))
      .map(({ index }) => index)
    for (let index = 0; index < Math.min(oldIndices.length, newIndices.length); index++) {
      matches.set(newIndices[index], oldIndices[index])
      usedOld.add(oldIndices[index])
    }
  }

  const unmatchedOld = oldTable.headers.map((_, index) => index).filter((index) => !usedOld.has(index))
  const unmatchedNew = newTable.headers.map((_, index) => index).filter((index) => !matches.has(index))

  // Positional pairing is safe for a rename only when both sides have the same number of unmatched columns.
  if (unmatchedOld.length === unmatchedNew.length) {
    unmatchedNew.forEach((newIndex, index) => matches.set(newIndex, unmatchedOld[index]))
  }

  const columns: TableDiffColumn[] = newTable.headers.map((newHeader, newIndex) => {
    const oldIndex = matches.get(newIndex)
    return { oldIndex, newIndex, oldHeader: oldIndex === undefined ? '' : oldTable.headers[oldIndex], newHeader }
  })
  const matchedOld = new Set(matches.values())
  oldTable.headers.forEach((oldHeader, oldIndex) => {
    if (!matchedOld.has(oldIndex)) columns.push({ oldIndex, oldHeader, newHeader: '' })
  })
  return columns
}

function rowValues (row: TableCell[], columns: TableDiffColumn[], old: boolean): string[] {
  return columns
    .filter((column) => column.oldIndex !== undefined && column.newIndex !== undefined)
    .map((column) => {
      const index = old ? column.oldIndex : column.newIndex
      return index === undefined ? '' : (row[index]?.value ?? '')
    })
}

function similarity (oldValues: string[], newValues: string[]): number {
  if (oldValues.length === 0) return 0
  let same = 0
  for (let index = 0; index < oldValues.length; index++) {
    if (oldValues[index] === newValues[index]) same++
  }
  return same / oldValues.length
}

function countValues (values: string[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return counts
}

function movedRows (matches: Map<number, number>): Set<number> {
  const entries = [...matches.entries()].sort(([a], [b]) => a - b)
  const moved = new Set<number>()
  // A crossing exists when an earlier old index is greater, or a later old index is smaller.
  let previousMax = -Infinity
  for (const [newIndex, oldIndex] of entries) {
    if (oldIndex < previousMax) moved.add(newIndex)
    previousMax = Math.max(previousMax, oldIndex)
  }
  let nextMin = Infinity
  for (const [newIndex, oldIndex] of [...entries].reverse()) {
    if (oldIndex > nextMin) moved.add(newIndex)
    nextMin = Math.min(nextMin, oldIndex)
  }
  return moved
}

/**
 * Compare table structure before comparing cells: rows and columns are matched by identity when
 * both sides are snapshots, and by content otherwise. Cells are compared by canonical content.
 */
export function buildTableDiff (oldSide: TableDiffSide, newSide: TableDiffSide): TableDiff | undefined {
  const oldTable = parseSide(oldSide)
  const newTable = parseSide(newSide)
  if (oldTable === undefined || newTable === undefined) return undefined

  const oldSnapshot = typeof oldSide === 'string' ? undefined : oldSide
  const newSnapshot = typeof newSide === 'string' ? undefined : newSide
  const identities =
    oldSnapshot !== undefined &&
    newSnapshot !== undefined &&
    oldSnapshot.rowIds.length === oldTable.rows.length &&
    newSnapshot.rowIds.length === newTable.rows.length &&
    oldSnapshot.columnIds.length === oldTable.headers.length &&
    newSnapshot.columnIds.length === newTable.headers.length
      ? { old: oldSnapshot, new: newSnapshot }
      : undefined
  const hasIdentities = identities !== undefined
  const columns = matchColumns(oldTable, newTable, identities?.old.columnIds, identities?.new.columnIds)
  const oldValues = oldTable.rows.map((row) => rowValues(row, columns, true))
  const newValues = newTable.rows.map((row) => rowValues(row, columns, false))
  const matches =
    identities !== undefined
      ? uniqueMatches(identities.old.rowIds, identities.new.rowIds)
      : uniqueMatches(
          oldValues.map((values) => JSON.stringify(values)),
          newValues.map((values) => JSON.stringify(values))
        )
  const usedOld = new Set(matches.values())
  const identityColumn = columns.find((column) => column.oldIndex === 0 && column.newIndex !== undefined)
  const oldIdentityValues = oldTable.rows.map((row) => row[0]?.value ?? '')
  const newIdentityValues = newTable.rows.map((row) =>
    identityColumn?.newIndex === undefined ? '' : (row[identityColumn.newIndex]?.value ?? '')
  )
  const oldIdentityLinks = oldTable.rows.map((row) => row[0]?.href ?? '')
  const newIdentityLinks = newTable.rows.map((row) =>
    identityColumn?.newIndex === undefined ? '' : (row[identityColumn.newIndex]?.href ?? '')
  )
  const oldIdentityCounts = countValues(oldIdentityValues)
  const newIdentityCounts = countValues(newIdentityValues)
  const oldLinkCounts = countValues(oldIdentityLinks)
  const newLinkCounts = countValues(newIdentityLinks)

  function hasSameIdentity (oldIndex: number, newIndex: number): boolean {
    if (identityColumn === undefined) return false
    const oldLink = oldIdentityLinks[oldIndex]
    if (
      oldLink !== '' &&
      oldLink === newIdentityLinks[newIndex] &&
      oldLinkCounts.get(oldLink) === 1 &&
      newLinkCounts.get(oldLink) === 1
    ) {
      return true
    }
    const oldValue = oldIdentityValues[oldIndex]
    return (
      oldValue !== '' &&
      oldValue === newIdentityValues[newIndex] &&
      oldIdentityCounts.get(oldValue) === 1 &&
      newIdentityCounts.get(oldValue) === 1
    )
  }

  // Pair edited rows only when their original first column identifies the same unique row.
  for (let newIndex = 0; newIndex < newValues.length; newIndex++) {
    if (hasIdentities || matches.has(newIndex)) continue
    const candidates = oldValues
      .map((values, oldIndex) => ({
        oldIndex,
        score:
          usedOld.has(oldIndex) || !hasSameIdentity(oldIndex, newIndex) ? 0 : similarity(values, newValues[newIndex])
      }))
      .sort((a, b) => b.score - a.score)
    const best = candidates[0]
    if (best === undefined || best.score < 0.5 || best.score === candidates[1]?.score) continue
    const reverse = newValues
      .map((values, candidateIndex) => ({
        candidateIndex,
        score:
          matches.has(candidateIndex) || !hasSameIdentity(best.oldIndex, candidateIndex)
            ? 0
            : similarity(oldValues[best.oldIndex], values)
      }))
      .sort((a, b) => b.score - a.score)
    if (reverse[0]?.candidateIndex !== newIndex || reverse[0].score === reverse[1]?.score) continue
    matches.set(newIndex, best.oldIndex)
    usedOld.add(best.oldIndex)
  }

  const moved = movedRows(matches)
  const rows: TableDiffRow[] = newTable.rows.map((row, newIndex) => {
    const oldIndex = matches.get(newIndex)
    const oldRow = oldIndex === undefined ? undefined : oldTable.rows[oldIndex]
    return {
      oldIndex,
      newIndex,
      moved: moved.has(newIndex),
      cells: columns.map((column) => {
        const oldCell = column.oldIndex === undefined ? undefined : oldRow?.[column.oldIndex]
        const newCell = column.newIndex === undefined ? undefined : row[column.newIndex]
        const richChange =
          oldCell !== undefined &&
          newCell !== undefined &&
          oldCell.canonical !== newCell.canonical &&
          (oldCell.rich || newCell.rich || (oldCell.value === newCell.value && oldCell.href === newCell.href))
        return {
          oldValue: oldCell?.value ?? '',
          newValue: newCell?.value ?? '',
          oldHref: oldCell?.href,
          newHref: newCell?.href,
          ...(richChange ? { oldMarkup: cellDocument(oldCell.content), newMarkup: cellDocument(newCell.content) } : {})
        }
      })
    }
  })
  oldTable.rows.forEach((row, oldIndex) => {
    if (!usedOld.has(oldIndex)) {
      const deletedRow: TableDiffRow = {
        oldIndex,
        moved: false,
        cells: columns.map((column) => ({
          oldValue: column.oldIndex === undefined ? '' : row[column.oldIndex].value,
          oldHref: column.oldIndex === undefined ? undefined : row[column.oldIndex].href,
          newValue: ''
        }))
      }
      const nextOldIndex = [...matches.values()].filter((index) => index > oldIndex).sort((a, b) => a - b)[0]
      const insertAt =
        nextOldIndex === undefined ? rows.length : rows.findIndex((candidate) => candidate.oldIndex === nextOldIndex)
      rows.splice(insertAt < 0 ? rows.length : insertAt, 0, deletedRow)
    }
  })
  return { columns, rows }
}
