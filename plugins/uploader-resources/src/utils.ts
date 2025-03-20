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
import { type FileUpload, type Upload, trackUpload, untrackUpload, updateUploads } from './store'
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

export async function uploadXHR (folders: boolean, options: FileUploadOptions): Promise<void> {
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
  const upload: Upload = {
    uuid: generateFileId(),
    progress: 0,
    target: options?.showProgress?.target,
    files: new Map<string, FileUpload>()
  }

  const limiter = new RateLimiter(options.maxNumberOfFiles ?? 10)
  for (let i = 0; i < files.length; i++) {
    const data = items[i]
    const { relativePath } = data
    const uuid = data.name
    void limiter.add(async () => {
      await uploadFile(data, { name: files[i].name, uuid, type: data.type, relativePath }, upload, options)
    })
  }

  await limiter.waitProcessing()
  untrackUpload(upload)
}

export async function uploadFile (
  file: FileWithPath,
  metadata: Record<string, any>,
  upload: Upload,
  options: FileUploadOptions,
  xhr = new XMLHttpRequest()
): Promise<void> {
  await new Promise<void>((resolve) => {
    const fileUpload: FileUpload = {
      name: metadata.name,
      finished: false,
      progress: 0
    }
    fileUpload.retry = async () => {
      fileUpload.cancel?.()
      await uploadFile(file, metadata, upload, options)
    }

    fileUpload.cancel = () => {
      xhr.abort()
      upload.files.delete(metadata.uuid ?? file.name)
      upload.progress -= fileUpload.progress
      resolve()
      updateUploads()
    }

    upload.files.set(metadata.uuid ?? file.name, fileUpload)
    trackUpload(upload)

    const uploadParams = getFileUploadParams(file.name, file)
    xhr.open('POST', uploadParams.url, true)

    for (const key in uploadParams.headers) {
      xhr.setRequestHeader(key, uploadParams.headers[key])
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const prev = fileUpload.progress
        const percentComplete = (event.loaded / event.total) * 100
        fileUpload.progress = percentComplete
        upload.progress += fileUpload.progress - prev
        updateUploads()
      }
    }

    xhr.onload = async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const uuid = metadata.uuid as Ref<Blob>
        const { onFileUploaded } = options
        if (uuid !== undefined && onFileUploaded !== undefined) {
          try {
            void callbackLimiter.exec(async () => {
              await onFileUploaded({
                type: metadata.type,
                uuid,
                name: metadata.name,
                file,
                path: metadata.relativePath,
                metadata
              })
            })
            fileUpload.finished = true
          } catch (error) {
            fileUpload.error = error as string
          }
        } else {
          fileUpload.error = 'missed metadata uuid'
        }
        resolve()
      } else {
        fileUpload.error = `upload failed with status ${xhr.status}: ${xhr.statusText}`
        resolve()
      }
      updateUploads()
    }

    xhr.onerror = () => {
      fileUpload.error = `upload failed with status ${xhr.status}: ${xhr.statusText}`
      resolve()
    }

    xhr.ontimeout = () => {
      fileUpload.error = 'upload timeout'
      resolve()
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
