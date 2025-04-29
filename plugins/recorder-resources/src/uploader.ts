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

import * as tus from 'tus-js-client'
import type { ChunkReader } from './stream'

export interface UploadResult {
  blobId?: string
  error?: any
}

export interface Uploader {
  start: () => void
  cancel: () => Promise<void>
  wait: () => Promise<UploadResult>
}

export interface TusUploaderOptions {
  endpoint: string
  workspace: string
  token: string
  width: number
  height: number
  /** Optional callback invoked on successful upload with generated blobId */
  onSuccess?: (blobId: string) => void
  /** Optional callback invoked on upload error */
  onError?: (error: any) => void
}

export class TusUploader implements Uploader {
  private readonly upload: tus.Upload
  private readonly waiterPromise: Promise<UploadResult>
  private waiterResolve: (value: UploadResult) => void = () => {}

  constructor (reader: ChunkReader, options: TusUploaderOptions) {
    const { endpoint, workspace, token, width, height, onSuccess, onError } = options
    const resolution = width + ':' + height

    this.waiterPromise = new Promise<UploadResult>((resolve) => {
      this.waiterResolve = resolve
    })

    console.debug('TusUploader: uploading', workspace, endpoint)

    this.upload = new tus.Upload(reader, {
      retryDelays: [0, 1000, 1500, 2000, 2500, 3000],
      chunkSize: 2 * 1024 * 1024,
      uploadLengthDeferred: true,
      endpoint,
      metadata: { resolution, token, workspace },
      onSuccess: () => {
        const uploadId = this.upload.url?.split('/').pop()
        console.debug('TusUploader: upload success:', uploadId)
        if (uploadId === undefined) {
          console.error('TusUploader: upload URL does not contain upload ID')
          return
        }
        const blobId = uploadId + '_master.m3u8'
        // invoke callback if provided
        onSuccess?.(blobId)
        this.waiterResolve({ blobId })
      },
      onError: (error) => {
        console.error('TusUploader: upload failed:', error)
        // invoke error callback if provided
        onError?.(error)
        this.waiterResolve({ error })
      },
      onProgress: (progress) => {
        console.debug('TusUploader: upload progress:', progress)
      }
    })
  }

  public start (): void {
    this.upload.start()
  }

  public async wait (): Promise<UploadResult> {
    return await this.waiterPromise
  }

  public async cancel (): Promise<void> {
    await this.upload.abort()
  }
}
