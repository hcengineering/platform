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
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { type Class, type Doc, type DocumentQuery, type Ref } from '@hcengineering/core'
import { showPopup } from '@hcengineering/ui'
import ExportModal from './components/ExportModal.svelte'

/**
 * Show export modal for documents
 * @param _class - Class of documents to export
 * @param query - Query to filter documents (used when exporting all)
 * @param selectedDocs - Selected documents (used when exporting selected)
 */
export function showExportModal (_class: Ref<Class<Doc>>, query?: DocumentQuery<Doc>, selectedDocs: Doc[] = []): void {
  showPopup(
    ExportModal,
    {
      _class,
      query,
      selectedDocs
    },
    'top',
    () => {
      // Callback when modal is closed
    }
  )
}
