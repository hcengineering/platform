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
import { showPopup } from '@hcengineering/ui'
import { findTable } from '../utils'
import { getTableMetadata } from '../tableMetadata'
import TableDiffViewer from './TableDiffViewer.svelte'
import { extractTableMarkdown, fetchFreshTableData } from './tableUtils'

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

    // Fetch fresh table data from database
    const freshTableMarkdown = await fetchFreshTableData(metadata)
    if (freshTableMarkdown === null) {
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
