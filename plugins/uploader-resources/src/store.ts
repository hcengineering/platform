//
// Copyright © 2024 Hardcore Engineering Inc.
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

import { type Uppy } from '@uppy/core'
import { type Writable, writable } from 'svelte/store'

/** @public */
export interface FileUpload {
  target: FileUploadTarget
  uppy: Uppy
}

/** @public */
export const uploads: Writable<FileUpload[]> = writable([])

/** @public */
export function dockFileUpload (target: FileUploadTarget, uppy: Uppy): void {
  uploads.update((instances) => {
    instances.push({ target, uppy })
    return instances
  })

  uppy.on('complete', () => {
    undockFileUploadIfCompleted(target, uppy)
  })

  uppy.on('file-removed', () => {
    undockFileUploadIfCompleted(target, uppy)
  })
}

function undockFileUploadIfCompleted (target: FileUploadTarget, uppy: Uppy): void {
  const files = uppy.getFiles()
  const incompleted = files.filter((p) => p.progress?.uploadComplete !== true)
  if (incompleted.length === 0) {
    undockFileUpload(target, uppy)
  }
}

function undockFileUpload (target: FileUploadTarget, uppy: Uppy): void {
  uppy.cancelAll()
  uppy.close()

  uploads.update((instances) => {
    return instances.filter((instance) => instance.uppy !== uppy)
  })
}
