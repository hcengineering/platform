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
import { Node } from '@tiptap/pm/model'
import { markdownToMarkup } from '@hcengineering/text-markdown'
import { getClient } from '@hcengineering/presentation'
import { buildMarkdownTableFromDocs } from '../refreshTable'
import { findTable } from '../utils'
import { getTableMetadata } from '../tableMetadata'

/**
 * Refresh a table by re-executing its query and rebuilding the table content
 */
export async function refreshTable (editor: Editor): Promise<void> {
  const table = findTable(editor.state.selection)
  if (table === undefined) {
    console.warn('No table found to refresh')
    return
  }

  const metadata = getTableMetadata(table.node)
  if (metadata === null || metadata === undefined) {
    console.warn('Table has no metadata to refresh')
    return
  }

  try {
    const client = getClient()
    const hierarchy = client.getHierarchy()

    // Convert string cardClass to Ref<Class<Doc>> and validate
    const cardClassRef = metadata.cardClass as any
    const cardClass = hierarchy.getClass(cardClassRef)
    if (cardClass == null) {
      console.warn('Invalid cardClass in table metadata:', metadata.cardClass)
      return
    }

    // Build query: use documentIds as filter if available (preserves selected docs), otherwise use query
    let query: any
    let useDocumentIdsOrder = false
    if (metadata.documentIds !== undefined && metadata.documentIds.length > 0) {
      // Build query from document IDs (preserves selected docs filter)
      query = { ...(metadata?.query ?? {}), _id: { $in: metadata.documentIds } }
      useDocumentIdsOrder = true
    } else if (metadata.query !== null && metadata.query !== undefined) {
      query = metadata.query
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
      // Optionally show empty table or keep existing
      return
    }

    // Build markdown table from fresh documents
    const markdown = await buildMarkdownTableFromDocs(docs, metadata, client)

    if (markdown.length === 0) {
      console.warn('Failed to build markdown table')
      return
    }

    // Convert markdown to ProseMirror nodes
    const markupNode = markdownToMarkup(markdown)
    const content = Node.fromJSON(editor.state.schema, markupNode)

    // Find the table node in the parsed content
    let newTableNode: Node | null = null
    content.descendants((node: Node) => {
      if (node.type.name === 'table' && newTableNode === null) {
        newTableNode = node
        return false // Stop after first table
      }
    })

    if (newTableNode === null) {
      console.warn('Failed to parse table from markdown')
      return
    }

    // Preserve metadata in the new table node
    // TypeScript needs explicit type assertion here
    const tableNode: Node = newTableNode
    const metadataAttr = JSON.stringify(metadata)
    const newAttrs = { ...tableNode.attrs, tableMetadata: metadataAttr }
    const tableWithMetadata = tableNode.type.create(newAttrs, tableNode.content, tableNode.marks)

    // Replace the old table with the new one
    const tr = editor.state.tr
    tr.replaceWith(table.pos, table.pos + table.node.nodeSize, tableWithMetadata)

    // Dispatch the transaction
    editor.view.dispatch(tr)
  } catch (error) {
    console.error('Failed to refresh table:', error)
    // Error is logged, user can retry if needed
  }
}
