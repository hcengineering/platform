//
// Copyright © 2024-2025 Hardcore Engineering Inc.
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

import { type FileUploadTarget } from '@hcengineering/uploader'
import { type Writable, writable } from 'svelte/store'

/** @public */
export interface Upload {
  progress: number
  error?: string
  retry?: () => Promise<void>
  cancel?: () => void
  name: string
  uuid: string
  finished: boolean
  target?: FileUploadTarget
}

/** @public */
export const uploads = writable(new Map<string, Writable<Upload>>())

export function updateUpload (upload: Upload): void {
  if (upload.target === undefined) {
    return
  }
  uploads.update((m) => {
    let u = m.get(upload.uuid)
    if (u === undefined) {
      u = writable(upload)
    } else {
      return m
    }
    u.set(upload)
    m.set(upload.uuid, u)
    return m
  })
}
export function deleteUpload (upload: Upload): void {
  if (upload.target === undefined) {
    return
  }
  uploads.update((m) => {
    m.delete(upload.uuid)
    return m
  })
}
