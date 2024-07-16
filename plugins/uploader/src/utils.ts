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

// import { getMetadata } from '@hcengineering/platform'
// import presentation from '@hcengineering/presentation'
import { showPopup } from '@hcengineering/ui'

import Uppy from '@uppy/core'
import ScreenCapture from '@uppy/screen-capture'
import Webcam from '@uppy/webcam'
import XHR from '@uppy/xhr-upload'

import uploader from './plugin'
import { dockFileUpload } from './store'
import type { FileUploadCallback, FileUploadTarget } from './types'

/** @public */
export function showFilesUploadPopup (target: FileUploadTarget, onFileUploaded: FileUploadCallback): void {
  const uppy = new Uppy()
    .use(ScreenCapture)
    .use(Webcam)
    // .use(XHR, {
    //   endpoint: getMetadata(presentation.metadata.UploadURL) ?? '',
    //   method: 'POST',
    //   headers: {
    //     Authorization: 'Bearer ' + (getMetadata(presentation.metadata.Token) as string)
    //   }
    // })

  uppy.addPostProcessor(async (fileIds: string[]) => {
    for (const fileId of fileIds) {
      const file = uppy.getFile(fileId)
      // const uuid = file.xhrUpload.file as Ref<Blob>
      await onFileUploaded('', file.name, file.data)
    }
  })

  showPopup(uploader.component.FileUploadPopup, { uppy }, undefined, (res) => {
    if (res === true) {
      dockFileUpload(target, uppy)
    }
  })
}

/** @public */
export async function uploadFiles (files: File[], target: FileUploadTarget, onFileUploaded: FileUploadCallback): Promise<void> {
  if (files.length === 0) return

  const uppy = new Uppy()
    .use(ScreenCapture)
    .use(Webcam)
    // .use(XHR, {
    //   endpoint: getMetadata(presentation.metadata.UploadURL) ?? '',
    //   method: 'POST',
    //   headers: {
    //     Authorization: 'Bearer ' + (getMetadata(presentation.metadata.Token) as string)
    //   }
    // })

  uppy.addPostProcessor(async (fileIds: string[]) => {
    for (const fileId of fileIds) {
      const file = uppy.getFile(fileId)
      // const uuid = file.xhrUpload.file as Ref<Blob>
      await onFileUploaded('', file.name, file.data)
    }
  })

  for (const data of files) {
    const { name, type } = data
    uppy.addFile({ name, type, data })
  }

  dockFileUpload(target, uppy)

  await uppy.upload()
}
