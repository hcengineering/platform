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

import * as tus from 'tus-js-client'
import { ChunkReader } from './stream'

interface IMap<T> {
  [index: string]: T
  [index: number]: T
}

export interface Options {
  fps?: number
  endpoint: string
  token: string
  workspace: string
  metadata?: IMap<string>
  onFinish?: (x: string) => Promise<void>
}

export abstract class Uploader {
  public abstract start (): void
  public abstract cancel (): Promise<void>
  public abstract wait (): Promise<void>
}

export class TusUploader extends Uploader {
  private readonly upload: tus.Upload
  private waiter: (() => void) | null = null

  constructor (target: ChunkReader, opts: Options) {
    super()
    this.upload = new tus.Upload(target, {
      retryDelays: [0, 1000, 1500, 2000, 2500, 3000],
      chunkSize: 2 * 1024 * 1024,
      uploadLengthDeferred: true,
      endpoint: opts.endpoint,
      metadata: { ...opts.metadata, token: opts.token, workspace: opts.workspace },
      onSuccess: () => {
        if (this.waiter !== null) {
          this.waiter()
        }
        if (this.upload.url !== null && opts.onFinish !== undefined) {
          void opts.onFinish(this.upload.url.substring(this.upload.url.lastIndexOf('/') + 1))
        }
      }
    })
  }

  public start (): void {
    this.upload.start()
  }

  public wait (): Promise<void> {
    return new Promise((resolve) => {
      this.waiter = resolve
    })
  }

  public cancel (): Promise<void> {
    return this.upload.abort()
  }
}
