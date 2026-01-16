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
import { findTable } from '../utils'
import { getTableMetadata } from '../tableMetadata'

/**
 * Show original table data from when it was first created
 */
export async function seeOriginalTableData (editor: Editor): Promise<void> {
  const table = findTable(editor.state.selection)
  if (table === undefined) return
  const metadata = getTableMetadata(table.node)
  if (metadata === null || metadata === undefined) return
  // Empty handler for now
  console.log('See original data:', metadata)
}
