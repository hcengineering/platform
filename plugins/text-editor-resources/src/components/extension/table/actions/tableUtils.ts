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

import { type Node } from '@tiptap/pm/model'
import { TableMap } from '@tiptap/pm/tables'
import type { Client } from '@hcengineering/core'
import { getClient } from '@hcengineering/presentation'
import { buildMarkdownTableFromDocs } from '../refreshTable'
import type { TableMetadata } from '../tableMetadata'

/**
 * Extract markdown string from a ProseMirror table node
 */
export function extractTableMarkdown (tableNode: Node): string {
  try {
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
            rowCells.push(cell.textContent.trim() ?? '')
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

/**
 * Fetch fresh table data from the database based on table metadata
 * Returns the fresh markdown table string
 */
export async function fetchFreshTableData (metadata: TableMetadata, client?: Client): Promise<string | null> {
  const _client = client ?? getClient()
  const hierarchy = _client.getHierarchy()

  const cardClassRef = metadata.cardClass as any
  const cardClass = hierarchy.getClass(cardClassRef)
  if (cardClass == null) {
    console.warn('Invalid cardClass in table metadata:', metadata.cardClass)
    return null
  }

  // Build query: use documentIds as filter if available (preserves selected docs), otherwise use query
  let query: any
  let useDocumentIdsOrder = false
  if (metadata.documentIds !== undefined && metadata.documentIds.length > 0) {
    query = { ...(metadata?.query ?? {}), _id: { $in: metadata.documentIds } }
    useDocumentIdsOrder = true
  } else if (metadata.query !== null && metadata.query !== undefined) {
    query = metadata.query
  } else {
    console.warn('Table metadata has no query or documentIds to execute')
    return null
  }

  let docs = await _client.findAll(cardClassRef, query)

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
    return null
  }

  const freshTableMarkdown = await buildMarkdownTableFromDocs(docs, metadata, _client)

  if (freshTableMarkdown.length === 0) {
    console.warn('Failed to build markdown table')
    return null
  }

  return freshTableMarkdown
}
