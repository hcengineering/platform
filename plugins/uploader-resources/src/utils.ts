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

import { type FileUploadOptions, type FileUploadPopupOptions, toFileWithPath } from '@hcengineering/uploader'
import { type Ref, type Blob, RateLimiter } from '@hcengineering/core'
import { getMetadata } from '@hcengineering/platform'
import presentation, { generateFileId, getFileMetadata, getFileStorage } from '@hcengineering/presentation'
import { type FileUpload, type FileUploadInfo, type Upload, trackUpload, untrackUpload } from './store'

const DEFAULT_MAX_PARALLEL_UPLOADS = 10
const UPLOAD_SUCCESS_DISPLAY_DURATION = 2000

export async function showFilesUploadPopup (
  options: FileUploadOptions,
  popupOptions: FileUploadPopupOptions
): Promise<void> {
  await uploadXHR(options, popupOptions)
}

export async function uploadXHRFiles (options: FileUploadOptions): Promise<void> {
  await uploadXHR(options, { itemsType: 'files' })
}

export async function uploadXHRFolders (options: FileUploadOptions): Promise<void> {
  await uploadXHR(options, { itemsType: 'folders' })
}

export async function uploadXHR (options: FileUploadOptions, popupOptions: FileUploadPopupOptions): Promise<void> {
  const input = document.createElement('input')
  input.type = 'file'
  input.webkitdirectory = popupOptions.itemsType === 'folders'
  input.multiple = popupOptions.itemsCount !== 'single'
  input.accept = popupOptions.allowedFileTypes?.join(',') ?? '*'

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

const callbackLimiter = new RateLimiter(1)

/** @public */
export async function uploadFiles (files: File[] | FileList, options: FileUploadOptions): Promise<void> {
  const items = Array.from(files).map((file) => toFileWithPath(file))
  if (items.length === 0) {
    return
  }

  const upload: Upload = {
    uuid: generateFileId(),
    progress: 0,
    target: options?.showProgress?.target,
    files: new Map<string, FileUpload>()
  }

  // Pre-create all file upload entries so UI shows all files from the start
  const fileInfos: FileUploadInfo[] = []
  for (const item of items) {
    const uuid = generateFileId()
    const name = item.name
    const type = item.type
    const path = item.relativePath ?? item.webkitRelativePath

    // Storage backend expects file name to be unique hence renaming it here
    const file = new File([item], uuid, { type })

    // Add file to upload tracking immediately
    const fileUpload: FileUpload = {
      uuid,
      name,
      finished: false,
      progress: 0
    }
    upload.files.set(uuid, fileUpload)

    fileInfos.push({ file, name, uuid, type, path })
  }

  // Track the upload batch from the start (after all files are added)
  trackUpload(upload)

  const limiter = new RateLimiter(options.maxParallelUploads ?? DEFAULT_MAX_PARALLEL_UPLOADS)
  for (const info of fileInfos) {
    void limiter.add(async () => {
      await uploadFile(info, upload, options)
    })
  }

  await limiter.waitProcessing()

  // Check if all files were cancelled
  if (upload.files.size === 0) {
    // All files were cancelled, untrack immediately
    untrackUpload(upload)
    return
  }

  // Check if any files had errors and set upload-level error
  const hasErrors = Array.from(upload.files.values()).some((f) => f.error !== undefined)
  if (hasErrors) {
    upload.error = 'Some files failed to upload'
    trackUpload(upload)
  } else {
    // All files finished successfully - wait a bit then untrack
    // This gives the user a moment to see the completion state
    setTimeout(() => {
      untrackUpload(upload)
    }, UPLOAD_SUCCESS_DISPLAY_DURATION)
  }
} /**
 * Uploads a single file with progress tracking, cancel/retry support
 */
async function uploadFile (info: FileUploadInfo, upload: Upload, options: FileUploadOptions): Promise<void> {
  const { file, name, uuid, type, path } = info
  const token = getMetadata(presentation.metadata.Token) ?? ''
  const workspace = getMetadata(presentation.metadata.WorkspaceUuid) ?? ''

  const storage = getFileStorage()

  const controller = new AbortController()

  let fileUpload = upload.files.get(uuid)

  if (fileUpload === undefined) {
    // first upload, initialize state
    fileUpload = {
      uuid,
      name,
      finished: false,
      progress: 0
    }

    upload.files.set(uuid, fileUpload)
  } else {
    // retry upload, reset state
    fileUpload.error = undefined
    fileUpload.finished = false

    upload.progress -= fileUpload.progress
    fileUpload.progress = 0

    upload.error = undefined
  }

  fileUpload.retry = async () => {
    // Just call uploadFile again with the same parameters
    // The function will detect it's a retry and reset the state
    await uploadFile(info, upload, options)
  }

  fileUpload.cancel = () => {
    controller.abort()

    upload.progress -= fileUpload.progress
    upload.files.delete(uuid)

    // If all files were cancelled, untrack the upload immediately
    if (upload.files.size === 0) {
      untrackUpload(upload)
    } else {
      trackUpload(upload)
    }
  }

  trackUpload(upload)

  try {
    // Upload file using storage backend with progress tracking
    await storage.uploadFile(token, workspace, uuid, file, {
      signal: controller.signal,
      onProgress: (progress) => {
        const prev = fileUpload.progress
        fileUpload.progress = progress.percentage
        // Update overall progress (sum of all file percentages)
        upload.progress += fileUpload.progress - prev
        trackUpload(upload)
      }
    })

    const metadata = (await getFileMetadata(file, uuid as Ref<Blob>)) ?? {}

    // Mark as finished and ensure progress is at 100%
    fileUpload.finished = true
    const prev = fileUpload.progress
    fileUpload.progress = 100
    upload.progress += fileUpload.progress - prev
    trackUpload(upload)

    // Call the upload callback if provided
    const { onFileUploaded } = options
    if (onFileUploaded !== undefined) {
      try {
        await callbackLimiter.exec(async () => {
          await onFileUploaded({
            uuid: uuid as Ref<Blob>,
            file,
            name,
            type,
            path,
            metadata
          })
        })
      } catch (error) {
        fileUpload.error = error instanceof Error ? error.message : String(error)
        trackUpload(upload)
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'Upload aborted') {
      return
    }

    fileUpload.error = error instanceof Error ? error.message : String(error)
    trackUpload(upload)
  }
}
