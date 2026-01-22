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
import { showPopup } from '@hcengineering/ui'
import { findTable } from '../utils'
import { getTableMetadata } from '../tableMetadata'
import TableRefreshConfirmation from './TableRefreshConfirmation.svelte'
import { extractTableMarkdown, fetchFreshTableData } from './tableUtils'

/**
 * Apply the refreshed table to the editor
 */
function applyTableRefresh (
  editor: Editor,
  table: { node: Node, pos: number },
  freshTableMarkdown: string,
  metadata: any
): void {
  try {
    // Convert markdown to ProseMirror nodes
    const markupNode = markdownToMarkup(freshTableMarkdown)
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
    console.error('Failed to apply table refresh:', error)
  }
}

/**
 * Refresh a table by re-executing its query and rebuilding the table content
 * Shows a confirmation modal with diff before applying changes
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
    const currentTableMarkdown = extractTableMarkdown(table.node)

    const freshTableMarkdown = await fetchFreshTableData(metadata)
    if (freshTableMarkdown === null) {
      return
    }

    await new Promise<void>((resolve) => {
      showPopup(
        TableRefreshConfirmation,
        {
          oldMarkdown: currentTableMarkdown,
          newMarkdown: freshTableMarkdown,
          onApply: () => {
            applyTableRefresh(editor, table, freshTableMarkdown, metadata)
          }
        },
        'center',
        () => {
          resolve()
        }
      )
    })
  } catch (error) {
    console.error('Failed to refresh table:', error)
  }
}
