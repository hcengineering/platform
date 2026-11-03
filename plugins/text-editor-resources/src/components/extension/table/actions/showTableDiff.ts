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
import { getTableMetadata } from '../tableMetadata'
import { findTable } from '../utils'
import { showTableError } from './errors'
import TableDiffViewer from './TableDiffViewer.svelte'
import { loadTableComparison } from './tableUtils'

/** Show what a refresh would change: the table in the document against its source. */
export async function showTableDiff (editor: Editor): Promise<void> {
  const table = findTable(editor.state.selection)
  const metadata = table === undefined ? undefined : getTableMetadata(table.node)
  if (table === undefined || metadata === undefined) return
  try {
    const { fresh, current, source } = await loadTableComparison(table.node, metadata)
    showPopup(TableDiffViewer, { current, fresh: source, metadata: fresh.metadata }, 'center')
  } catch (error) {
    console.error('Failed to show table diff:', error)
    showTableError(error)
  }
}
