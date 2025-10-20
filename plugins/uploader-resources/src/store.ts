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
import { writable } from 'svelte/store'

/** @public */
export interface FileUploadInfo {
  file: File
  name: string
  uuid: string
  path: string
  type: string
}

/** @public */
export interface FileUpload {
  uuid: string
  name: string
  progress: number // [0, 100]
  finished: boolean
  error?: string

  retry?: () => Promise<void>
  cancel?: () => void
}

/** @public */
export interface Upload {
  uuid: string
  progress: number // [0, 100]
  files: Map<string, FileUpload>
  target?: FileUploadTarget
  error?: string
}

/** @public */
export const uploads = writable(new Map<string, Upload>())

/** @public */
export function trackUpload (upload: Upload): void {
  if (upload.target === undefined) {
    return
  }
  uploads.update((m) => {
    return m.set(upload.uuid, upload)
  })
}

/** @public */
export function untrackUpload (upload: Upload): void {
  if (upload.target === undefined) {
    return
  }
  uploads.update((m) => {
    m.delete(upload.uuid)
    return m
  })
}
