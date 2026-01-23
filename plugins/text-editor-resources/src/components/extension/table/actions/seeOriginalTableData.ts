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
import type { Class, Doc, Ref } from '@hcengineering/core'
import { getClient } from '@hcengineering/presentation'
import { showPopup } from '@hcengineering/ui'
import view, { type Viewlet } from '@hcengineering/view'
import { findTable } from '../utils'
import { getTableMetadata } from '../tableMetadata'
import OriginalTableDataViewer from './OriginalTableDataViewer.svelte'

/**
 * Show original table data from when it was first created
 */
export async function seeOriginalTableData (editor: Editor): Promise<void> {
  const table = findTable(editor.state.selection)
  if (table === undefined) {
    console.warn('No table found to show original data')
    return
  }

  const metadata = getTableMetadata(table.node)
  if (metadata === null || metadata === undefined) {
    console.warn('Table has no metadata to show original data')
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

    // Validate that we have documentIds or query to fetch original data
    if (
      (metadata.documentIds === undefined || metadata.documentIds.length === 0) &&
      (metadata.query === null || metadata.query === undefined)
    ) {
      console.warn('Table metadata has no documentIds or query to show original data')
      return
    }

    // Load viewlet with descriptor lookup if viewletId is provided (to get config and component)
    // RelationshipTable has viewletId: undefined (as per buildRelationshipTableMetadata)
    let viewlet: Viewlet | undefined
    let viewletWithLookup: any | undefined
    if (metadata.viewletId !== undefined) {
      const viewlets = await client.findAll(
        view.class.Viewlet,
        { _id: metadata.viewletId as Ref<Viewlet> },
        { lookup: { descriptor: view.class.ViewletDescriptor } }
      )
      viewlet = viewlets[0]
      viewletWithLookup = viewlets[0]
    } else {
      // For RelationshipTable (no viewletId), load Table descriptor as fallback
      // Table component can display both regular and relationship tables
      const descriptors = await client.findAll(view.class.ViewletDescriptor, {
        _id: view.viewlet.Table
      })
      if (descriptors.length > 0) {
        viewletWithLookup = { $lookup: { descriptor: descriptors[0] } }
      }
    }

    // Use documentIds if available (preserves original order), otherwise use query
    const documentIds = metadata.documentIds ?? []

    // Show original data in popup
    // Note: Component is resolved from viewlet descriptor or Table descriptor as fallback
    // RelationshipTable metadata has viewletId: undefined, so config comes from metadata.config
    showPopup(
      OriginalTableDataViewer,
      {
        _class: cardClassRef as Ref<Class<Doc>>,
        config: metadata.config,
        documentIds: documentIds.length > 0 ? documentIds : [],
        query: documentIds.length === 0 ? metadata.query : undefined,
        viewlet,
        viewletWithLookup,
        metadata
      },
      'center'
    )
  } catch (error) {
    console.error('Failed to show original table data:', error)
  }
}
