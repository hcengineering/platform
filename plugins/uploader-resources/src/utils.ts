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

import { showPopup } from '@hcengineering/ui'
import type { FileUploadCallback, FileUploadOptions, FileUploadTarget } from '@hcengineering/uploader'

import FileUploadPopup from './components/FileUploadPopup.svelte'

import { dockFileUpload } from './store'
import { getUppy } from './uppy'

/** @public */
export async function showFilesUploadPopup (
  target: FileUploadTarget,
  options: FileUploadOptions,
  onFileUploaded: FileUploadCallback
): Promise<void> {
  const uppy = getUppy(options, onFileUploaded)

  showPopup(FileUploadPopup, { uppy, target }, undefined, (res) => {
    if (res === true && options.hideProgress !== true) {
      dockFileUpload(target, uppy)
    }
  })
}

/** @public */
export async function uploadFiles (
  files: File[] | FileList,
  target: FileUploadTarget,
  options: FileUploadOptions,
  onFileUploaded: FileUploadCallback
): Promise<void> {
  if (files.length === 0) return

  const uppy = getUppy(options, onFileUploaded)

  for (let index = 0; index < files.length; index++) {
    const data = files[index]
    const { name, type } = data
    uppy.addFile({ name, type, data })
  }

  if (options.hideProgress !== true) {
    dockFileUpload(target, uppy)
  }

  await uppy.upload()
}
