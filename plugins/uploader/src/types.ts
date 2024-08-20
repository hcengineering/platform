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

import type { Blob as PlatformBlob, Class, Doc, Ref } from '@hcengineering/core'

/** @public */
export interface FileWithPath extends File {
  relativePath?: string
}

/** @public */
export type UploadFilesPopupFn = (
  target: FileUploadTarget,
  options: FileUploadOptions,
  popupOptions: FileUploadPopupOptions,
  onFileUploaded: FileUploadCallback
) => Promise<void>

/** @public */
export type UploadFilesFn = (
  files: File[] | FileList,
  target: FileUploadTarget,
  options: FileUploadOptions,
  onFileUploaded: FileUploadCallback
) => Promise<void>

/** @public */
export interface FileUploadTarget {
  objectId: Ref<Doc>
  objectClass: Ref<Class<Doc>>
}

/** @public */
export interface FileUploadOptions {
  maxFileSize?: number
  maxNumberOfFiles?: number
  allowedFileTypes?: string[] | null
  hideProgress?: boolean
}

/** @public */
export interface FileUploadPopupOptions {
  fileManagerSelectionType?: 'files' | 'folders' | 'both'
}

/** @public */
export type FileUploadCallback = (
  uuid: Ref<PlatformBlob>,
  name: string,
  file: FileWithPath | Blob,
  path: string | undefined,
  metadata: Record<string, any> | undefined
) => Promise<void>
