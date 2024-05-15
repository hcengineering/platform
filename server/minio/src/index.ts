//
// Copyright © 2022 Hardcore Engineering Inc.
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

import { Client, type BucketItem, type BucketStream } from 'minio'

import core, {
  toWorkspaceString,
  type Blob,
  type MeasureContext,
  type Ref,
  type WorkspaceId
} from '@hcengineering/core'

import {
  type BlobStorageIterator,
  type ListBlobResult,
  type StorageAdapter,
  type StorageConfig,
  type UploadedObjectInfo
} from '@hcengineering/server-core'
import { type Readable } from 'stream'

/**
 * @public
 */
export function getBucketId (workspaceId: WorkspaceId): string {
  return toWorkspaceString(workspaceId, '.')
}

export interface MinioConfig extends StorageConfig {
  kind: 'minio'
  region: string
  endpoint: string
  accessKeyId: string
  secretAccessKey: string

  port: number
  useSSL: boolean
}

/**
 * @public
 */
export class MinioService implements StorageAdapter {
  static config = 'minio'
  client: Client
  constructor (
    readonly opt: {
      endPoint: string
      port: number
      accessKey: string
      secretKey: string
      useSSL: boolean
      region?: string
    }
  ) {
    this.client = new Client(opt)
  }

  async initialize (ctx: MeasureContext, workspaceId: WorkspaceId): Promise<void> {}

  async close (): Promise<void> {}

  async exists (ctx: MeasureContext, workspaceId: WorkspaceId): Promise<boolean> {
    return await this.client.bucketExists(getBucketId(workspaceId))
  }

  async make (ctx: MeasureContext, workspaceId: WorkspaceId): Promise<void> {
    await this.client.makeBucket(getBucketId(workspaceId), this.opt.region)
  }

  async remove (ctx: MeasureContext, workspaceId: WorkspaceId, objectNames: string[]): Promise<void> {
    await this.client.removeObjects(getBucketId(workspaceId), objectNames)
  }

  async delete (ctx: MeasureContext, workspaceId: WorkspaceId): Promise<void> {
    await this.client.removeBucket(getBucketId(workspaceId))
  }

  async list (ctx: MeasureContext, workspaceId: WorkspaceId, prefix?: string): Promise<ListBlobResult[]> {
    try {
      const items = new Map<string, ListBlobResult>()
      const list = this.client.listObjects(getBucketId(workspaceId), prefix, true)
      await new Promise((resolve, reject) => {
        list.on('data', (data) => {
          if (data.name !== undefined) {
            items.set(data.name, {
              _id: data.name as Ref<Blob>,
              _class: core.class.Blob,
              etag: data.etag,
              size: data.size,
              provider: 'minio',
              space: core.space.Configuration,
              modifiedBy: core.account.ConfigUser,
              modifiedOn: data.lastModified.getTime(),
              storageId: data.name
            })
          }
        })
        list.on('end', () => {
          list.destroy()
          resolve(null)
        })
        list.on('error', (err) => {
          list.destroy()
          reject(err)
        })
      })
      return Array.from(items.values())
    } catch (err: any) {
      const msg = (err?.message as string) ?? ''
      if (msg.includes('Invalid bucket name') || msg.includes('The specified bucket does not exist')) {
        return []
      }
      throw err
    }
  }

  async listStream (
    ctx: MeasureContext,
    workspaceId: WorkspaceId,
    prefix?: string | undefined
  ): Promise<BlobStorageIterator> {
    let hasMore = true
    let stream: BucketStream<BucketItem> | undefined
    let error: Error | undefined
    let onNext: () => void = () => {}
    const buffer: ListBlobResult[] = []
    return {
      next: async (): Promise<ListBlobResult | undefined> => {
        try {
          if (stream === undefined) {
            stream = this.client.listObjects(getBucketId(workspaceId), prefix, true)
            stream.on('end', () => {
              stream?.destroy()
              stream = undefined
              hasMore = false
              onNext()
            })
            stream.on('error', (err) => {
              stream?.destroy()
              stream = undefined
              error = err
              hasMore = false
              onNext()
            })
            stream.on('data', (data) => {
              if (data.name !== undefined) {
                buffer.push({
                  _id: data.name as Ref<Blob>,
                  _class: core.class.Blob,
                  etag: data.etag,
                  size: data.size,
                  provider: 'minio',
                  space: core.space.Configuration,
                  modifiedBy: core.account.ConfigUser,
                  modifiedOn: data.lastModified.getTime(),
                  storageId: data.name
                })
              }
              onNext()
              if (buffer.length > 5) {
                stream?.pause()
              }
            })
          }
        } catch (err: any) {
          const msg = (err?.message as string) ?? ''
          if (msg.includes('Invalid bucket name') || msg.includes('The specified bucket does not exist')) {
            hasMore = false
            return
          }
          error = err
        }

        if (buffer.length > 0) {
          return buffer.shift()
        }
        if (!hasMore) {
          return undefined
        }
        return await new Promise<ListBlobResult | undefined>((resolve, reject) => {
          onNext = () => {
            if (error != null) {
              reject(error)
            }
            onNext = () => {}
            resolve(buffer.shift())
          }
          stream?.resume()
        })
      },
      close: async () => {
        stream?.destroy()
      }
    }
  }

  async stat (ctx: MeasureContext, workspaceId: WorkspaceId, objectName: string): Promise<Blob | undefined> {
    try {
      const result = await this.client.statObject(getBucketId(workspaceId), objectName)
      return {
        provider: '',
        _class: core.class.Blob,
        _id: objectName as Ref<Blob>,
        storageId: objectName,
        contentType: result.metaData['content-type'],
        size: result.size,
        etag: result.etag,
        space: core.space.Configuration,
        modifiedBy: core.account.System,
        modifiedOn: result.lastModified.getTime(),
        version: result.versionId ?? null
      }
    } catch (err: any) {
      ctx.error('no object found', { error: err, objectName, workspaceId: workspaceId.name })
    }
  }

  async get (ctx: MeasureContext, workspaceId: WorkspaceId, objectName: string): Promise<Readable> {
    return await this.client.getObject(getBucketId(workspaceId), objectName)
  }

  async put (
    ctx: MeasureContext,
    workspaceId: WorkspaceId,
    objectName: string,
    stream: Readable | Buffer | string,
    contentType: string,
    size?: number
  ): Promise<UploadedObjectInfo> {
    return await this.client.putObject(getBucketId(workspaceId), objectName, stream, size, {
      'Content-Type': contentType
    })
  }

  async read (ctx: MeasureContext, workspaceId: WorkspaceId, name: string): Promise<Buffer[]> {
    const data = await this.client.getObject(getBucketId(workspaceId), name)
    const chunks: Buffer[] = []

    await new Promise((resolve, reject) => {
      data.on('readable', () => {
        let chunk
        while ((chunk = data.read()) !== null) {
          const b = chunk as Buffer
          chunks.push(b)
        }
      })

      data.on('end', () => {
        data.destroy()
        resolve(null)
      })
      data.on('error', (err) => {
        reject(err)
      })
    })
    return chunks
  }

  async partial (
    ctx: MeasureContext,
    workspaceId: WorkspaceId,
    objectName: string,
    offset: number,
    length?: number
  ): Promise<Readable> {
    return await this.client.getPartialObject(getBucketId(workspaceId), objectName, offset, length)
  }
}
