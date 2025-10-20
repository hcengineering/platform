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
import type { Asset, IntlString, Resource } from '@hcengineering/platform'
import type { Blob as PlatformBlob, Class, Doc, Ref } from '@hcengineering/core'

/** @public */
export interface FileWithPath extends File {
  relativePath?: string
}

/** @public */
export type UploadFilesPopupFn = (options: FileUploadOptions, popupOptions: FileUploadPopupOptions) => Promise<void>

/** @public */
export type UploadFilesFn = (files: File[] | FileList, options: FileUploadOptions) => Promise<void>

/** @public */
export type UploadHandler = (options: FileUploadOptions) => Promise<void>

/** @public */
export type GetUploadHandlers = () => Promise<UploadHandlerDefinition[]>

/** @public */
export interface UploadHandlerDefinition extends Doc {
  icon: Asset
  label: IntlString
  order?: number
  category?: string
  handler: Resource<UploadHandler>
}

/** @public */
export interface FileUploadTarget {
  objectId: Ref<Doc>
  objectClass: Ref<Class<Doc>>
}

/** @public */
export interface FileUploadProgressOptions {
  target: FileUploadTarget
}

/** @public */
export interface FileUploadOptions {
  /**
   * Max number of files to be uploaded at the same time.
   */
  maxParallelUploads?: number

  /**
   * Callback to be called when file is uploaded.
   */
  onFileUploaded?: FileUploadCallback

  /**
   * Whether to show progress for uploading files.
   */
  showProgress?: FileUploadProgressOptions

  target?: FileUploadTarget
}

/** @public */
export interface FileUploadPopupOptions {
  itemsCount?: 'single' | 'multiple'
  itemsType?: 'files' | 'folders'
  allowedFileTypes?: string[]
}

/** @public */
export interface FileUploadCallbackParams {
  uuid: Ref<PlatformBlob>
  name: string
  type: string
  file: File | Blob
  path: string | undefined
  metadata: Record<string, any>
}

/** @public */
export type FileUploadCallback = (params: FileUploadCallbackParams) => Promise<void>
