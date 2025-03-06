//
// Copyright © 2024-2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the 'License')
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import {
  type FileUploadOptions,
  type FileUploadPopupOptions,
  type FileWithPath,
  toFileWithPath,
  type UploadHandlerDefinition
} from '@hcengineering/uploader'
import { type Ref, type Blob, RateLimiter } from '@hcengineering/core'
import { type Upload, updateUpload, deleteUpload } from './store'
import uploader from './plugin'
import { generateFileId, getFileUploadParams, getClient } from '@hcengineering/presentation'

export async function showFilesUploadPopup (
  options: FileUploadOptions,
  popupOptions: FileUploadPopupOptions
): Promise<void> {
  await uploadXHR(popupOptions.fileManagerSelectionType === 'folders', options)
}

export async function uploadXHRFiles (options: FileUploadOptions): Promise<void> {
  await uploadXHR(false, options)
}

export async function uploadXHRFolders (options: FileUploadOptions): Promise<void> {
  await uploadXHR(true, options)
}

async function uploadXHR (folders: boolean, options: FileUploadOptions): Promise<void> {
  const input = document.createElement('input')
  input.type = 'file'
  input.webkitdirectory = folders
  input.multiple = true
  input.accept = options.allowedFileTypes?.join(',') ?? '*'

  input.onchange = async (event: Event) => {
    const target = event.target as HTMLInputElement
    if (target.files === null) {
      return
    }
    if (target.files.length === 0) {
      return
    }
    await uploadFiles(target.files, options)
    input.remove()
  }
  input.onblur = () => {
    input.remove()
  }
  input.click()
}

export async function getUploadHandlers (): Promise<UploadHandlerDefinition[]> {
  const client = getClient()
  return await client.findAll<UploadHandlerDefinition>(uploader.class.UploadHandlerDefinition, {})
}

const callbackLimiter = new RateLimiter(1)

/** @public */
export async function uploadFiles (files: File[] | FileList, options: FileUploadOptions): Promise<void> {
  const items = Array.from(files, (p) => {
    const renamedFile = new File([p], generateFileId(), { type: p.type })
    return toFileWithPath(renamedFile, toFileWithPath(p).relativePath)
  })

  if (items.length === 0) {
    return
  }

  const limiter = new RateLimiter(options.maxNumberOfFiles ?? 10)
  for (let i = 0; i < files.length; i++) {
    const data = items[i]
    const { relativePath } = data
    const uuid = data.name
    void limiter.add(async () => {
      await uploadFile(data, { name: files[i].name, uuid, relativePath }, options)
    })
  }

  await limiter.waitProcessing()
}

async function uploadFile (
  file: FileWithPath,
  metadata: Record<string, any>,
  options: FileUploadOptions
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const upload: Upload = {
      name: metadata.name,
      uuid: metadata.uuid,
      finished: false,
      progress: 0,
      target: options.showProgress?.target
    }
    upload.retry = async () => {
      await uploadFile(file, metadata, options)
    }
    upload.cancel = () => {
      xhr.abort()
    }
    updateUpload(upload)

    const uploadParams = getFileUploadParams(file.name, file)
    xhr.open('POST', uploadParams.url, true)

    for (const key in uploadParams.headers) {
      xhr.setRequestHeader(key, uploadParams.headers[key])
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = (event.loaded / event.total) * 100
        upload.progress = percentComplete
        updateUpload(upload)
      }
    }

    xhr.onload = async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const uuid = metadata.uuid as Ref<Blob>
        const { onFileUploaded } = options
        if (uuid !== undefined && onFileUploaded !== undefined) {
          try {
            // Ww cannot just run async code here since onFileUploaded is using a path to create a tree of folders, so in case of async running, we can get duplicated trees.
            // TODO: fix drive folders uploading
            await callbackLimiter.exec(async () => {
              await onFileUploaded({
                uuid,
                name: metadata.name,
                file,
                path: metadata.relativePath,
                metadata
              })
            })
            upload.finished = true
          } catch (error) {
            upload.error = error as string
          }
        } else {
          upload.error = 'missed metadata uuid'
        }
        resolve()
      } else {
        upload.error = `upload failed with status ${xhr.status}: ${xhr.statusText}`
        reject(new Error(upload.error))
      }
      updateUpload(upload)
      deleteUpload(upload)
    }

    xhr.onerror = () => {
      upload.error = `upload failed with status ${xhr.status}: ${xhr.statusText}`
      updateUpload(upload)
      deleteUpload(upload)
    }

    xhr.ontimeout = () => {
      upload.error = 'upload timeout'
      updateUpload(upload)
      deleteUpload(upload)
    }

    if (uploadParams.method === 'form-data') {
      const formData = new FormData()
      formData.append('file', file)

      Object.entries(metadata).forEach(([key, value]) => {
        if (value === undefined) {
          return
        }
        formData.append(key, value)
      })
      xhr.send(formData)
    } else {
      xhr.setRequestHeader('Content-Type', file.type)
      xhr.send(file)
    }
  })
}
