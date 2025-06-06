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

import { get, writable } from 'svelte/store'
import core, { SortingOrder, type WithLookup } from '@hcengineering/core'
import attachment, { type SavedAttachments } from '@hcengineering/attachment'
import { createQuery, onClient } from '@hcengineering/presentation'

export const savedAttachmentsStore = writable<Array<WithLookup<SavedAttachments>>>([])
export const isSavedAttachmentsLoaded = writable(false)

const savedAttachmentsQuery = createQuery(true)

export function loadSavedAttachments (): void {
  if (get(isSavedAttachmentsLoaded)) {
    return
  }

  onClient(() => {
    savedAttachmentsQuery.query(
      attachment.class.SavedAttachments,
      { space: core.space.Workspace },
      (res) => {
        isSavedAttachmentsLoaded.set(true)
        savedAttachmentsStore.set(res.filter(({ $lookup }) => $lookup?.attachedTo !== undefined))
      },
      { lookup: { attachedTo: attachment.class.Attachment }, sort: { modifiedOn: SortingOrder.Descending } }
    )
  })
}
