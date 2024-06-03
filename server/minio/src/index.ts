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
  concatLink,
  toWorkspaceString,
  type Blob,
  type BlobLookup,
  type MeasureContext,
  type Ref,
  type WorkspaceId,
  type WorkspaceIdWithUrl
} from '@hcengineering/core'

import { getMetadata } from '@hcengineering/platform'
import serverCore, {
  removeAllObjects,
  type BlobLookupResult,
  type BlobStorageIterator,
  type BucketInfo,
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
  accessKey: string
  secretKey: string
  useSSL?: string
  region?: string
}

/**
 * @public
 */
export class MinioService implements StorageAdapter {
  static config = 'minio'
  client: Client
  constructor (readonly opt: Omit<MinioConfig, 'name' | 'kind'>) {
    this.client = new Client({
      endPoint: opt.endpoint,
      accessKey: opt.accessKey,
      secretKey: opt.secretKey,
      region: opt.region ?? 'us-east-1',
      port: opt.port ?? 9000,
      useSSL: opt.useSSL === 'true'
    })
  }

  async lookup (ctx: MeasureContext, workspaceId: WorkspaceIdWithUrl, docs: Blob[]): Promise<BlobLookupResult> {
    const frontUrl = getMetadata(serverCore.metadata.FrontUrl) ?? ''
    for (const d of docs) {
      // Let's add current from URI for previews.
      const bl = d as BlobLookup
      bl.downloadUrl = concatLink(frontUrl, `/files/${workspaceId.workspaceUrl}?file=${d._id}`)
    }
    return { lookups: docs as BlobLookup[] }
  }

  async initialize (ctx: MeasureContext, workspaceId: WorkspaceId): Promise<void> {}

  async listBuckets (ctx: MeasureContext, productId: string): Promise<BucketInfo[]> {
    const productPostfix = getBucketId({
      name: '',
      productId
    })
    const buckets = await this.client.listBuckets()
    return buckets
      .filter((it) => it.name.endsWith(productPostfix))
      .map((it) => {
        let name = it.name
        name = name.slice(0, name.length - productPostfix.length)
        return {
          name,
          delete: async () => {
            await this.delete(ctx, { name, productId })
          },
          list: async () => await this.listStream(ctx, { name, productId })
        }
      })
  }

  async close (): Promise<void> {}

  async exists (ctx: MeasureContext, workspaceId: WorkspaceId): Promise<boolean> {
    return await this.client.bucketExists(getBucketId(workspaceId))
  }

  async make (ctx: MeasureContext, workspaceId: WorkspaceId): Promise<void> {
    await this.client.makeBucket(getBucketId(workspaceId), this.opt.region ?? 'us-east-1')
  }

  async remove (ctx: MeasureContext, workspaceId: WorkspaceId, objectNames: string[]): Promise<void> {
    await this.client.removeObjects(getBucketId(workspaceId), objectNames)
  }

  async delete (ctx: MeasureContext, workspaceId: WorkspaceId): Promise<void> {
    try {
      await removeAllObjects(ctx, this, workspaceId)
    } catch (err: any) {
      ctx.error('failed t oclean all objecrs', { error: err })
    }
    await this.client.removeBucket(getBucketId(workspaceId))
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
