//
// Copyright © 2025 Hardcore Engineering Inc.
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

import { type Editor } from '@tiptap/core'
import { type Node } from '@tiptap/pm/model'
import { TableMap } from '@tiptap/pm/tables'
import { getClient } from '@hcengineering/presentation'
import { showPopup } from '@hcengineering/ui'
import { buildMarkdownTableFromDocs } from '../refreshTable'
import { findTable } from '../utils'
import { getTableMetadata } from '../tableMetadata'
import TableDiffViewer from './TableDiffViewer.svelte'

/**
 * Extract markdown string from a ProseMirror table node
 */
function extractTableMarkdown (tableNode: Node): string {
  try {
    const map = TableMap.get(tableNode)
    const { width, height } = map

    // Track visited cells to handle rowspan/colspan
    const visitedCells = new Set<number>()
    const rows: string[][] = []

    // Extract all rows
    for (let row = 0; row < height; row++) {
      const rowCells: string[] = []
      for (let col = 0; col < width; col++) {
        const pos = map.map[row * width + col]
        if (!visitedCells.has(pos)) {
          const cell = tableNode.nodeAt(pos)
          if (cell !== null) {
            rowCells.push(cell.textContent.trim() ?? '')
          } else {
            rowCells.push('')
          }
          visitedCells.add(pos)
        } else {
          // Cell already processed (rowspan/colspan), use empty or previous value
          rowCells.push('')
        }
      }
      rows.push(rowCells)
    }

    if (rows.length === 0) {
      return ''
    }

    // Build markdown table
    // First row is headers
    const headerRow = rows[0]
    let markdown = '| ' + headerRow.join(' | ') + ' |\n'
    markdown += '| ' + headerRow.map(() => '---').join(' | ') + ' |\n'

    // Data rows
    for (let i = 1; i < rows.length; i++) {
      markdown += '| ' + rows[i].join(' | ') + ' |\n'
    }

    return markdown
  } catch (error) {
    console.warn('Failed to extract table markdown:', error)
    return ''
  }
}

/**
 * Show diff between current table content and fresh data from database
 */
export async function showTableDiff (editor: Editor): Promise<void> {
  const table = findTable(editor.state.selection)
  if (table === undefined) {
    console.warn('No table found to show diff')
    return
  }

  const metadata = getTableMetadata(table.node)
  if (metadata === null || metadata === undefined) {
    console.warn('Table has no metadata to show diff')
    return
  }

  try {
    // Extract current table as markdown
    const currentTableMarkdown = extractTableMarkdown(table.node)

    // Generate fresh table version using the same logic as refreshTable
    const client = getClient()
    const hierarchy = client.getHierarchy()

    // Convert string cardClass to Ref<Class<Doc>> and validate
    const cardClassRef = metadata.cardClass as any
    const cardClass = hierarchy.getClass(cardClassRef)
    if (cardClass == null) {
      console.warn('Invalid cardClass in table metadata:', metadata.cardClass)
      return
    }

    // Build query: use existing query if available, otherwise build from documentIds
    let query: any
    let useDocumentIdsOrder = false
    if (metadata.query !== null && metadata.query !== undefined) {
      query = metadata.query
    } else if (metadata.documentIds !== undefined && metadata.documentIds.length > 0) {
      // Build query from document IDs
      query = { _id: { $in: metadata.documentIds } }
      useDocumentIdsOrder = true
    } else {
      console.warn('Table metadata has no query or documentIds to execute')
      return
    }

    // Execute query to fetch fresh documents
    let docs = await client.findAll(cardClassRef, query)

    // Sort by documentIds order if query was built from documentIds
    if (useDocumentIdsOrder && metadata.documentIds !== undefined) {
      const idIndexMap = new Map(metadata.documentIds.map((id, index) => [id, index]))
      docs = docs.sort((a, b) => {
        const indexA = idIndexMap.get(a._id) ?? Infinity
        const indexB = idIndexMap.get(b._id) ?? Infinity
        return indexA - indexB
      })
    }

    if (docs.length === 0) {
      console.warn('Query returned no documents')
      return
    }

    // Build markdown table from fresh documents
    const freshTableMarkdown = await buildMarkdownTableFromDocs(docs, metadata, client)

    if (freshTableMarkdown.length === 0) {
      console.warn('Failed to build markdown table')
      return
    }

    // Show diff in popup
    showPopup(
      TableDiffViewer,
      {
        oldMarkdown: currentTableMarkdown,
        newMarkdown: freshTableMarkdown
      },
      'center'
    )
  } catch (error) {
    console.error('Failed to show table diff:', error)
  }
}
