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

import type { BuildModelKey, TableCellRun, TableCellValue, TableMetadata, TableSnapshot } from './types'

/** Larger sources are refused with an explicit message instead of being truncated. @public */
export const MAX_TABLE_ROWS = 5000

/** Version written into the metadata of every copied or refreshed table. @public */
export const TABLE_METADATA_VERSION = '2.0'

/** @public */
export type TableSourceErrorCode =
  'workspace' | 'unavailable' | 'savedView' | 'viewlet' | 'column' | 'filters' | 'tooLarge' | 'noColumns' | 'noSource'

/**
 * A table source failure the user can act on. An empty result is not an error.
 * @public
 */
export class TableSourceError extends Error {
  constructor (
    readonly code: TableSourceErrorCode,
    readonly params: Record<string, string | number> = {}
  ) {
    super(`Table source error: ${code}`)
    this.name = 'TableSourceError'
  }
}

/**
 * The error for a table with more rows than {@link MAX_TABLE_ROWS}; undefined when it fits.
 * The one place that decides the limit, for the copy dialog and for source resolution alike.
 * @public
 */
export function tableRowLimitError (count: number): TableSourceError | undefined {
  return count > MAX_TABLE_ROWS ? new TableSourceError('tooLarge', { count, limit: MAX_TABLE_ROWS }) : undefined
}

/**
 * Column identity is the attribute key (and the presenter for object columns) plus its occurrence.
 * Labels, positions and presentation props are excluded, so renaming or restyling keeps the column.
 * @public
 */
export function tableColumnIds (config: Array<string | BuildModelKey>): string[] {
  const counts = new Map<string, number>()
  return config.map((column) => {
    const key = typeof column === 'string' ? column : column.key
    const presenter = typeof column === 'string' || key !== '' ? null : (column.presenter ?? null)
    const base = JSON.stringify([key, presenter])
    const occurrence = counts.get(base) ?? 0
    counts.set(base, occurrence + 1)
    return JSON.stringify([key, presenter, occurrence])
  })
}

/** Structural subset of a markup node, so this package does not depend on the text packages. */
interface MarkupLike {
  type: string
  text?: string
  attrs?: Record<string, any>
  marks?: Array<{ type: string, attrs?: Record<string, any> }>
  content?: MarkupLike[]
}

const significantMarks = new Set(['link', 'bold', 'italic', 'code', 'strike', 'underline'])

function markKey (mark: { type: string, attrs?: Record<string, any> }): string | undefined {
  if (!significantMarks.has(mark.type)) return undefined
  return mark.type === 'link' ? `link:${String(mark.attrs?.href ?? '')}` : mark.type
}

/**
 * Canonical cell content. Paragraph and line breaks become `\n`; colors, highlights and editor-only
 * attributes are ignored; leading and trailing whitespace is trimmed.
 * @public
 */
export function tableCellValue (cell: MarkupLike): TableCellValue {
  const runs: TableCellRun[] = []
  const push = (text: string, marks: string[]): void => {
    if (text === '') return
    const last = runs[runs.length - 1]
    if (last !== undefined && last.length === marks.length + 1 && marks.every((mark, i) => last[i + 1] === mark)) {
      last[0] += text
    } else {
      runs.push([text, ...marks])
    }
  }
  const visit = (node: MarkupLike, blockIndex: number): void => {
    if (node.type === 'text') {
      const marks = (node.marks ?? []).map(markKey).filter((mark): mark is string => mark !== undefined)
      push(node.text ?? '', [...new Set(marks)].sort())
    } else if (node.type === 'hardBreak') {
      push('\n', [])
    } else if (node.type === 'reference') {
      push(String(node.attrs?.label ?? ''), [`ref:${String(node.attrs?.id ?? '')}`])
    } else if (node.type === 'emoji') {
      push(String(node.attrs?.emoji ?? node.attrs?.label ?? ''), [])
    } else {
      if (blockIndex > 0) push('\n', [])
      ;(node.content ?? []).forEach((child, index) => {
        visit(child, isBlock(child) ? index : 0)
      })
    }
  }
  ;(cell.content ?? []).forEach((child, index) => {
    visit(child, index)
  })
  if (runs.length > 0) {
    runs[0][0] = runs[0][0].trimStart()
    runs[runs.length - 1][0] = runs[runs.length - 1][0].trimEnd()
  }
  return runs.filter((run) => run[0] !== '')
}

function isBlock (node: MarkupLike): boolean {
  return !['text', 'hardBreak', 'reference', 'emoji'].includes(node.type)
}

/** @public */
export function tableCellText (value: TableCellValue): string {
  return value.map((run) => run[0]).join('')
}

/** The single link a cell points to when all of its text is linked to the same target. @public */
export function tableCellHref (value: TableCellValue): string | undefined {
  const links = new Set<string>()
  for (const run of value) {
    if (run[0].trim() === '') continue
    const link = run.slice(1).find((mark) => mark.startsWith('link:'))
    if (link === undefined) return undefined
    links.add(link.slice(5))
  }
  return links.size === 1 ? [...links][0] : undefined
}

/** Whether a cell carries formatting other than links. @public */
export function tableCellRich (value: TableCellValue): boolean {
  return value.some((run) => run.slice(1).some((mark) => !mark.startsWith('link:')))
}

/** @public */
export function tableCellsEqual (a: TableCellValue | undefined, b: TableCellValue | undefined): boolean {
  return JSON.stringify(a ?? []) === JSON.stringify(b ?? [])
}

/** Markup for displaying a canonical cell. @public */
export function tableCellToMarkup (value: TableCellValue): MarkupLike {
  const content: MarkupLike[] = []
  for (const [text, ...marks] of value) {
    const markup = marks
      .map((mark) => (mark.startsWith('link:') ? { type: 'link', attrs: { href: mark.slice(5) } } : { type: mark }))
      .filter((mark) => significantMarks.has(mark.type))
    text.split('\n').forEach((part, index) => {
      if (index > 0) content.push({ type: 'hardBreak' })
      if (part !== '') content.push({ type: 'text', text: part, ...(markup.length > 0 ? { marks: markup } : {}) })
    })
  }
  return { type: 'paragraph', content }
}

/** Expand merged cells so every grid position can be addressed. @public */
export function tableMarkupGrid<T extends MarkupLike> (table: T): T[][] {
  const grid: T[][] = []
  for (const [rowIndex, row] of (table.content ?? []).entries()) {
    grid[rowIndex] ??= []
    let column = 0
    for (const cell of (row.content ?? []) as T[]) {
      while (grid[rowIndex][column] !== undefined) column++
      const rowspan = Math.max(1, Number(cell.attrs?.rowspan ?? 1))
      const colspan = Math.max(1, Number(cell.attrs?.colspan ?? 1))
      for (let r = 0; r < rowspan; r++) {
        grid[rowIndex + r] ??= []
        for (let c = 0; c < colspan; c++) grid[rowIndex + r][column + c] = cell
      }
      column += colspan
    }
  }
  return grid
}

/** Build a snapshot from a rendered table (header row first). @public */
export function tableSnapshotFromMarkup (table: MarkupLike, rowIds: string[], columnIds: string[]): TableSnapshot {
  const grid = tableMarkupGrid(table)
  const width = Math.max(columnIds.length, ...grid.map((row) => row.length))
  const values = new Map<MarkupLike, TableCellValue>()
  const cells = grid.map((row) =>
    Array.from({ length: width }, (_, index) => {
      const cell = row[index]
      if (cell === undefined) return []
      let value = values.get(cell)
      if (value === undefined) {
        value = tableCellValue(cell)
        values.set(cell, value)
      }
      return value
    })
  )
  return { rowIds: [...rowIds], columnIds: [...columnIds], cells }
}

/** Markup table for displaying a snapshot. @public */
export function tableSnapshotToMarkup (snapshot: TableSnapshot): MarkupLike {
  return {
    type: 'table',
    content: snapshot.cells.map((row, rowIndex) => ({
      type: 'tableRow',
      content: row.map((value) => ({
        type: rowIndex === 0 ? 'tableHeader' : 'tableCell',
        attrs: { colspan: 1, rowspan: 1 },
        content: [tableCellToMarkup(value)]
      }))
    }))
  }
}

function isStringList (value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

/** Metadata versions this code understands. @public */
export const SUPPORTED_TABLE_METADATA_VERSIONS = ['1.0', TABLE_METADATA_VERSION]

function isPlainObject (value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isConfig (value: unknown): value is Array<string | BuildModelKey> {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === 'string' || (isPlainObject(item) && typeof item.key === 'string'))
  )
}

/**
 * Legacy (1.0) metadata was written without validation: keep what can still be used and drop the
 * rest rather than refusing the whole table.
 */
function parseLegacy (data: Record<string, any>): TableMetadata | undefined {
  if (typeof data.cardClass !== 'string') return undefined
  return {
    version: '1.0',
    cardClass: data.cardClass,
    documentIds: isStringList(data.documentIds) ? data.documentIds : [],
    timestamp: typeof data.timestamp === 'number' ? data.timestamp : 0,
    ...(isConfig(data.config) ? { config: data.config } : {}),
    ...(isPlainObject(data.query) ? { query: data.query } : {}),
    ...(typeof data.viewletId === 'string' ? { viewletId: data.viewletId } : {}),
    ...(typeof data.workspace === 'string' ? { workspace: data.workspace } : {}),
    ...(typeof data.originalUrl === 'string' ? { originalUrl: data.originalUrl } : {}),
    ...(typeof data.language === 'string' ? { language: data.language } : {})
  }
}

/** Validate clipboard/persisted data before enabling source operations. @public */
export function parseTableMetadata (value: unknown): TableMetadata | undefined {
  if (!isPlainObject(value)) return undefined
  if (value.version === '1.0') return parseLegacy(value)
  if (value.version !== '2.0') return undefined
  // Early 2.0 copies carried a full value snapshot; it is no longer kept.
  const { snapshot: _snapshot, ...rest } = value
  const data: TableMetadata = rest as unknown as TableMetadata
  if (
    typeof data.cardClass !== 'string' ||
    !isStringList(data.documentIds) ||
    typeof data.timestamp !== 'number' ||
    (data.config !== undefined && !isConfig(data.config)) ||
    (data.query !== undefined && !isPlainObject(data.query)) ||
    (data.workspace !== undefined && typeof data.workspace !== 'string') ||
    (data.viewletId !== undefined && typeof data.viewletId !== 'string') ||
    (data.rowIds !== undefined && (!isStringList(data.rowIds) || new Set(data.rowIds).size !== data.rowIds.length))
  ) {
    return undefined
  }
  const source = data.source
  if (
    !isPlainObject(source) ||
    !['table', 'relationship'].includes(source.kind) ||
    !['fixed', 'savedView', 'frozen'].includes(source.mode) ||
    (source.mode === 'savedView' && (typeof source.filteredViewId !== 'string' || source.baseQuery == null)) ||
    (source.filters !== undefined && typeof source.filters !== 'string')
  ) {
    return undefined
  }
  return data
}

/**
 * Why metadata that is present could not be used: written by a newer version, or damaged.
 * @public
 */
export function tableMetadataProblem (value: unknown): 'unsupported' | 'damaged' {
  const version = isPlainObject(value) ? value.version : undefined
  return typeof version === 'string' && !SUPPORTED_TABLE_METADATA_VERSIONS.includes(version) ? 'unsupported' : 'damaged'
}

/**
 * Short fingerprint of a canonical cell value (FNV-1a, 32 bit). Stored on each cell to tell
 * manual edits from source changes without keeping a second copy of the table.
 * @public
 */
export function tableCellHash (value: TableCellValue): string {
  const text = JSON.stringify(value)
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}

/** Column identities of a table copied with the given columns. @public */
export function tableMetadataColumnIds (metadata: TableMetadata): string[] {
  return metadata.config === undefined ? [] : tableColumnIds(metadata.config)
}

/** Row identities carried by metadata: relationship rows travel explicitly, other rows are documents. @public */
export function tableMetadataRowIds (metadata: TableMetadata): string[] {
  return metadata.rowIds ?? metadata.documentIds.map(String)
}
