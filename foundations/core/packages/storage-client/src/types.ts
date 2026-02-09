//
// Copyright © 2025 Hardcore Engineering Inc.
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

/** @public */
export interface FileStorageUploadProgress {
  loaded: number
  total: number
  percentage: number
}

/** @public */
export interface FileStorageUploadOptions {
  onProgress?: (progress: FileStorageUploadProgress) => void
  signal?: AbortSignal
}

/** @public */
export interface FileStorage {
  getFileUrl: (workspace: string, file: string, filename?: string) => string
  getCookiePath: (workspace: string) => string
  getFileMeta: (token: string, workspace: string, file: string) => Promise<Record<string, any>>
  uploadFile: (
    token: string,
    workspace: string,
    uuid: string,
    file: File,
    options?: FileStorageUploadOptions
  ) => Promise<void>
  deleteFile: (token: string, workspace: string, file: string) => Promise<void>
}
