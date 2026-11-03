//
// Copyright © 2026 TraceX SAS.
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
import { fetchFreshTableSnapshot } from './tableUtils'
import { showTableError } from './errors'
import TableSourceViewer from './TableSourceViewer.svelte'

/**
 * Show the table's source as it is now, together with where it comes from. Legacy (1.0) tables go
 * through the same resolution as refresh, so every version is shown the same way.
 */
export async function seeOriginalTableData (editor: Editor): Promise<void> {
  const table = findTable(editor.state.selection)
  const metadata = table === undefined ? undefined : getTableMetadata(table.node)
  if (metadata === undefined) return
  try {
    const fresh = await fetchFreshTableSnapshot(metadata)
    showPopup(TableSourceViewer, { markdown: fresh.markdown, metadata: fresh.metadata }, 'center')
  } catch (error) {
    console.error('Failed to show original table data:', error)
    showTableError(error)
  }
}
