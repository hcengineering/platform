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

// Will use temporary file to store huge content into
export class BlobClient {
  transactorAPIUrl: string
  index: number
  constructor (
    readonly transactorUrl: string,
    readonly token: string,
    readonly workspace: WorkspaceIds,
    readonly opt?: {
      storageAdapter?: StorageAdapter
    }
  ) {
    this.index = 0
    let url = transactorUrl
    if (url.endsWith('/')) {
      url = url.slice(0, url.length - 1)
    }

    this.transactorAPIUrl = url.replaceAll('wss://', 'https://').replace('ws://', 'http://') + '/api/v1/blob'
  }

  async checkFile (ctx: MeasureContext, name: string): Promise<boolean> {
    if (this.opt?.storageAdapter !== undefined) {
      const obj = await this.opt?.storageAdapter.stat(ctx, this.workspace, name)
      if (obj !== undefined) {
        return true
      }
    }
    for (let i = 0; i < 5; i++) {
      try {
        const response = await fetch(this.transactorAPIUrl + `?name=${encodeURIComponent(name)}`, {
          headers: {
            Authorization: 'Bearer ' + this.token,
            Range: 'bytes=0-1'
          }
        })
        if (response.status === 404) {
          return false
        }
        const buff = await response.arrayBuffer()
        return buff.byteLength > 0
      } catch (err: any) {
        if (i === 4) {
          ctx.error('Failed to check file', { name, error: err })
        }
        await new Promise<void>((resolve) => setTimeout(resolve, 10))
      }
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
    let writtenMb = 0

    // Use ranges to iterave through file with retry if required.
    while (written < size || size === -1) {
      let i = 0
      let response: Response | undefined
      for (; i < 5; i++) {
        try {
          const st = Date.now()
          let chunk: Buffer

          if (this.opt?.storageAdapter !== undefined) {
            const chunks: Buffer[] = []
            const readable = await this.opt.storageAdapter.partial(ctx, this.workspace, name, written, chunkSize)
            await new Promise<void>((resolve) => {
              readable.on('data', (chunk: any) => {
                chunks.push(chunk)
              })
              readable.on('end', () => {
                readable.destroy()
                resolve()
              })
            })
            chunk = Buffer.concat(chunks)
          } else {
            const header: Record<string, string> = {
              Authorization: 'Bearer ' + this.token
            }

            if (!(size !== -1 && written === 0 && size < chunkSize)) {
              header.Range = `bytes=${written}-${size === -1 ? written + chunkSize : Math.min(size - 1, written + chunkSize)}`
            }

            response = await fetch(this.transactorAPIUrl + `?name=${encodeURIComponent(name)}`, { headers: header })
            if (header.Range != null) {
              ctx.info('fetch part', { time: Date.now() - st, blobId: name, written, size })
            }
            if (response.status === 403) {
              i = 5
              // No file, so make it empty
              throw new Error(`Unauthorized ${this.transactorAPIUrl}/${this.workspace.uuid}/${name}`)
            }
            if (response.status === 404) {
              i = 5
              // No file, so make it empty
              throw new Error(`No file for ${this.transactorAPIUrl}/${this.workspace.uuid}/${name}`)
            }
            if (response.status === 416) {
              if (size === -1) {
                size = parseInt((response.headers.get('content-range') ?? '').split('*/')[1])
                continue
              }

              // No file, so make it empty
              throw new Error(`No file for ${this.transactorAPIUrl}/${this.workspace.uuid}/${name}`)
            }
            chunk = Buffer.from(await response.arrayBuffer())

            if (header.Range == null) {
              size = chunk.length
            }
            // We need to parse
            // 'Content-Range': `bytes ${start}-${end}/${size}`
            // To determine if something is left
            const range = response.headers.get('Content-Range')
            if (range !== null) {
              const [, total] = range.split(' ')[1].split('/')
              if (total !== undefined) {
                size = parseInt(total)
              }
            }
          }

          await new Promise<void>((resolve, reject) => {
            writable.write(chunk, (err) => {
              if (err != null) {
                reject(err)
              }
              resolve()
            })
          })

          written += chunk.length
          const newWrittenMb = Math.round(written / (1024 * 1024))
          const newWrittenId = Math.round(newWrittenMb / 5)
          if (writtenMb !== newWrittenId) {
            writtenMb = newWrittenId
            ctx.info('  >>>>Chunk', {
              name,
              written: newWrittenMb,
              of: Math.round(size / (1024 * 1024))
            })
          }
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
    if (this.opt?.storageAdapter !== undefined) {
      await this.opt.storageAdapter.put(ctx, this.workspace, name, buffer, contentType, size)
    } else {
      // TODO: We need to improve this logig, to allow restore of huge blobs
      for (let i = 0; i < 5; i++) {
        try {
          await fetch(
            this.transactorAPIUrl +
              `?name=${encodeURIComponent(name)}&contentType=${encodeURIComponent(contentType)}&size=${size}`,
            {
              method: 'PUT',
              headers: {
                Authorization: 'Bearer ' + this.token,
                'Content-Type': contentType
              },
              body: buffer
            }
          )
          break
        } catch (err: any) {
          if (i === 4) {
            ctx.error('failed to upload file', { name })
            throw err
          }
        }
      }
    }
  }
}
