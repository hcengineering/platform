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

import { type MeasureContext, type WorkspaceIds } from '@hcengineering/core'
import type { StorageAdapter } from '@hcengineering/server-core'
import { Buffer } from 'node:buffer'

// Will use temporary file to store huge content into
export class BlobClient {
  index: number
  constructor (
    readonly storageAdapter: StorageAdapter,
    readonly workspace: WorkspaceIds
  ) {
    this.index = 0
  }

  async checkFile (ctx: MeasureContext, name: string): Promise<boolean> {
    const obj = await this.storageAdapter.stat(ctx, this.workspace, name)
    if (obj !== undefined) {
      return true
    }
    return false
  }

  async writeTo (
    ctx: MeasureContext,
    name: string,
    size: number,
    writable: {
      write: (buffer: Buffer, cb: (err?: any) => void) => void
      end: (cb: () => void) => void
    }
  ): Promise<void> {
    let written = 0
    const chunkSize = 50 * 1024 * 1024

    // Use ranges to iterave through file with retry if required.
    while (written < size) {
      let i = 0
      for (; i < 5; i++) {
        try {
          const chunks: Buffer[] = []
          const readable = await this.storageAdapter.partial(ctx, this.workspace, name, written, chunkSize)
          await new Promise<void>((resolve) => {
            readable.on('data', (chunk) => {
              chunks.push(chunk)
            })
            readable.on('end', () => {
              readable.destroy()
              resolve()
            })
          })
          const chunk = Buffer.concat(chunks)

          await new Promise<void>((resolve, reject) => {
            writable.write(chunk, (err) => {
              if (err != null) {
                reject(err)
              }
              resolve()
            })
          })

          written += chunk.length
          break
        } catch (err: any) {
          if (
            err?.code === 'NoSuchKey' ||
            err?.code === 'NotFound' ||
            err?.message === 'No such key' ||
            err?.Code === 'NoSuchKey'
          ) {
            ctx.info('No such key', { name })
            return
          }
          if (i > 4) {
            await new Promise<void>((resolve) => {
              writable.end(resolve)
            })
            throw err
          }
          await new Promise<void>((resolve) => setTimeout(resolve, 10))
          // retry
        }
      }
    }
    await new Promise<void>((resolve) => {
      writable.end(resolve)
    })
  }

  async upload (ctx: MeasureContext, name: string, size: number, contentType: string, buffer: Buffer): Promise<void> {
    await this.storageAdapter.put(ctx, this.workspace, name, buffer, contentType, size)
  }
}
