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
import type { RecordingResult } from './types'
import type { ChunkReader } from './stream'

export interface Uploader {
  start: () => void
  cancel: () => Promise<void>
  wait: () => Promise<RecordingResult>
}

export interface TusUploaderOptions {
  name: string
  endpoint: string
  workspace: string
  token: string
  width: number
  height: number
}

export class TusUploader implements Uploader {
  private readonly upload: tus.Upload
  private readonly waiterPromise: Promise<RecordingResult>
  private waiterResolve: (value: RecordingResult) => void = () => {}
  private waiterReject: (reason?: any) => void = () => {}

  constructor (reader: ChunkReader, options: TusUploaderOptions) {
    const { endpoint, workspace, token, width, height } = options
    const resolution = width + ':' + height

    this.waiterPromise = new Promise<RecordingResult>((resolve, reject) => {
      this.waiterResolve = resolve
      this.waiterReject = reject
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

        const name = options.name
        const uuid = uploadId + '_master.m3u8'
        const type = 'video/x-mpegURL'
        this.waiterResolve({ name, uuid, type })
      },
      onError: (error) => {
        console.error('TusUploader: upload failed:', error)
        this.waiterReject(error)
      }
    })
  }

  public start (): void {
    this.upload.start()
  }

  public async wait (): Promise<RecordingResult> {
    return await this.waiterPromise
  }

  public async cancel (): Promise<void> {
    try {
      await this.upload.abort()
    } catch (error) {
      console.error('TusUploader: abort failed:', error)
    }
  }
}
