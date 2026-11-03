//
// Copyright © 2025 Hardcore Engineering Inc.
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

import { type Node } from '@tiptap/pm/model'
import { TableMap } from '@tiptap/pm/tables'
import type { Client } from '@hcengineering/core'
import { getClient } from '@hcengineering/presentation'
import { type MarkupNode, MarkupNodeType } from '@hcengineering/text'
import { markupToMarkdown } from '@hcengineering/text-markdown'
import type { TableMetadata } from '@hcengineering/view'
import converter from '@hcengineering/converter'
import { getResource } from '@hcengineering/platform'
import type { ResolvedTableSnapshot } from '@hcengineering/view'
import { editorTableState, type EditorTableState } from '../snapshot'
import type { TableDiffSide } from './tableDiff'

function hasMergedCells (tableNode: Node): boolean {
  let result = false
  tableNode.descendants((node) => {
    if (
      (node.type.name === 'tableCell' || node.type.name === 'tableHeader') &&
      (Number(node.attrs.rowspan ?? 1) > 1 || Number(node.attrs.colspan ?? 1) > 1)
    ) {
      result = true
      return false
    }
    return !result
  })
  return result
}

function escapeTableCell (value: string): string {
  return value.replace(/\\?\|/g, '\\|').replace(/\r?\n/g, '<br>')
}

/**
 * Extract markdown string from a ProseMirror table node
 */
export function extractTableMarkdown (tableNode: Node): string {
  try {
    if (hasMergedCells(tableNode)) {
      const tableMarkup = tableNode.toJSON() as unknown as MarkupNode
      return markupToMarkdown({
        type: MarkupNodeType.doc,
        content: [tableMarkup]
      })
    }

    const map = TableMap.get(tableNode)
    const { width, height } = map

    // Track visited cells to handle rowspan/colspan
    const visitedCells = new Set<number>()
    const rows: string[][] = []

    for (let row = 0; row < height; row++) {
      const rowCells: string[] = []
      for (let col = 0; col < width; col++) {
        const pos = map.map[row * width + col]
        if (!visitedCells.has(pos)) {
          const cell = tableNode.nodeAt(pos)
          if (cell !== null) {
            const cellMarkup = cell.toJSON() as MarkupNode
            const cellMarkdown = markupToMarkdown({ type: MarkupNodeType.doc, content: cellMarkup.content ?? [] })
            rowCells.push(escapeTableCell(cellMarkdown.trim()))
          } else {
            rowCells.push('')
          }
          visitedCells.add(pos)
        } else {
          rowCells.push('')
        }
      }
      rows.push(rowCells)
    }

    if (rows.length === 0) {
      return ''
    }

    const headerRow = rows[0]
    let markdown = '| ' + headerRow.join(' | ') + ' |\n'
    markdown += '| ' + headerRow.map(() => '---').join(' | ') + ' |\n'

    for (let i = 1; i < rows.length; i++) {
      markdown += '| ' + rows[i].join(' | ') + ' |\n'
    }

    return markdown
  } catch (error) {
    console.warn('Failed to extract table markdown:', error)
    return ''
  }
}

/** Resolve a complete source snapshot for all table operations. */
export async function fetchFreshTableSnapshot (
  metadata: TableMetadata,
  client?: Client
): Promise<ResolvedTableSnapshot> {
  const resolve = await getResource(converter.function.ResolveTableSnapshot)
  return await resolve(metadata, client ?? getClient())
}

/** The table in the document and its source, in the form both sides can be compared in. */
export interface TableComparison {
  fresh: ResolvedTableSnapshot
  /** The document side: canonical values for 2.0 tables, Markdown for legacy ones. */
  current: TableDiffSide
  /** The source side, in the same form as `current`. */
  source: TableDiffSide
  /** Values and fingerprints of a 2.0 table, to tell manual edits from source changes. */
  state?: EditorTableState
}

/** Load the source of a table and pair it with the table as it is now (diff and refresh). */
export async function loadTableComparison (table: Node, metadata: TableMetadata): Promise<TableComparison> {
  const fresh = await fetchFreshTableSnapshot(metadata)
  if (metadata.version !== '2.0') return { fresh, current: extractTableMarkdown(table), source: fresh.markdown }
  const state = editorTableState(table)
  return { fresh, current: state.snapshot, source: fresh.snapshot, state }
}
