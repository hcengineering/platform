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

import core, { withContext, type Blob, type MeasureContext, type Ref, type WorkspaceUuid, type WorkspaceDataId } from '@hcengineering/core'
import { getMetadata } from '@hcengineering/platform'
import serverCore, {
  removeAllObjects,
  type BlobStorageIterator,
  type BucketInfo,
  type ListBlobResult,
  type StorageAdapter,
  type StorageConfig,
  type StorageConfiguration,
  type UploadedObjectInfo
} from '@hcengineering/server-core'
import { type Readable } from 'stream'

export interface MinioConfig extends StorageConfig {
  kind: 'minio'
  accessKey: string
  secretKey: string
  useSSL?: string
  region?: string

  // If defined, all resources will be inside selected root bucket.
  rootBucket?: string

  // A prefix string to be added to a bucketId in case rootBucket not used
  bucketPrefix?: string
}

export const CONFIG_KIND = 'minio'

/**
 * @public
 */
export class MinioService implements StorageAdapter {
  client: Client
  constructor (readonly opt: MinioConfig) {
    this.client = new Client({
      endPoint: opt.endpoint,
      accessKey: opt.accessKey,
      secretKey: opt.secretKey,
      region: opt.region ?? 'us-east-1',
      port: opt.port ?? 9000,
      useSSL: opt.useSSL === 'true'
    })
  }

  async initialize (ctx: MeasureContext, dataId: WorkspaceDataId): Promise<void> {}

  /**
   * @public
   */
  getBucketId (dataId: WorkspaceDataId): string {
    return this.opt.rootBucket ?? (this.opt.bucketPrefix ?? '') + dataId
  }

  getBucketFolder (dataId: WorkspaceDataId): string {
    return dataId
  }

  async close (): Promise<void> {}
  async exists (ctx: MeasureContext, dataId: WorkspaceDataId): Promise<boolean> {
    return await this.client.bucketExists(this.getBucketId(dataId))
  }

  @withContext('make')
  async make (ctx: MeasureContext, dataId: WorkspaceDataId): Promise<void> {
    try {
      await this.client.makeBucket(this.getBucketId(dataId), this.opt.region ?? 'us-east-1')
    } catch (err: any) {
      if (err.code === 'BucketAlreadyOwnedByYou') {
        return
      }
      throw err
    }
  }

  async listBuckets (ctx: MeasureContext): Promise<BucketInfo[]> {
    if (this.opt.rootBucket !== undefined) {
      const info = new Map<string, BucketInfo>()
      if (!(await this.client.bucketExists(this.opt.rootBucket))) {
        return []
      }
      const stream = this.client.listObjects(this.opt.rootBucket, '', false)
      await new Promise<void>((resolve, reject) => {
        stream.on('end', () => {
          stream.destroy()
          resolve()
        })
        stream.on('error', (err) => {
          console.error(err)
          stream?.destroy()
          reject(err)
        })
        stream.on('data', (data) => {
          const wsUuid = data.prefix?.split('/')?.[0]
          if (wsUuid !== undefined && !info.has(wsUuid)) {
            info.set(wsUuid, {
              name: wsUuid,
              delete: async () => {
                await this.delete(ctx, wsUuid)
              },
              list: async () => await this.listStream(ctx, wsUuid)
            })
          }
        })
      })
      stream.destroy()
      return Array.from(info.values())
    } else {
      const productPostfix = this.getBucketFolder('')
      const buckets = await this.client.listBuckets()
      return buckets
        .filter((it) => it.name.endsWith(productPostfix))
        .map((it) => {
          let name = it.name
          name = name.slice(0, name.length - productPostfix.length)
          return {
            name,
            delete: async () => {
              await this.delete(ctx, name)
            },
            list: async () => await this.listStream(ctx, name)
          }
        })
    }
  }

  getDocumentKey (workspace: WorkspaceUuid, name: string): string {
    return this.opt.rootBucket === undefined ? name : `${this.getBucketFolder(workspace)}/${name}`
  }

  @withContext('remove')
  async remove (ctx: MeasureContext, dataId: WorkspaceDataId, objectNames: string[]): Promise<void> {
    const toRemove = objectNames.map((it) => this.getDocumentKey(dataId, it))
    await this.client.removeObjects(this.getBucketId(dataId), toRemove)
  }

  @withContext('delete')
  async delete (ctx: MeasureContext, dataId: WorkspaceDataId): Promise<void> {
    try {
      await removeAllObjects(ctx, this, dataId)
    } catch (err: any) {
      ctx.error('failed t oclean all objecrs', { error: err })
    }
    if (this.opt.rootBucket === undefined) {
      // Also delete a bucket
      await this.client.removeBucket(this.getBucketId(dataId))
    }
  }

  stripPrefix (prefix: string | undefined, key: string): string {
    if (prefix !== undefined && key.startsWith(prefix)) {
      return key.slice(prefix.length)
    }
    return key
  }

  rootPrefix (dataId: WorkspaceDataId): string | undefined {
    return this.opt.rootBucket !== undefined ? this.getBucketFolder(dataId) + '/' : undefined
  }

  @withContext('listStream')
  async listStream (ctx: MeasureContext, dataId: WorkspaceDataId): Promise<BlobStorageIterator> {
    let hasMore = true
    let stream: BucketStream<BucketItem> | undefined
    let done = false
    let error: Error | undefined
    let onNext: () => void = () => {}
    const buffer: ListBlobResult[] = []

    const rootPrefix = this.rootPrefix(dataId)
    return {
      next: async (): Promise<ListBlobResult[]> => {
        try {
          if (stream === undefined && !done) {
            const rprefix = rootPrefix ?? ''
            stream = this.client.listObjects(this.getBucketId(dataId), rprefix, true)
            stream.on('end', () => {
              stream?.destroy()
              done = true
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
                const _id = this.stripPrefix(rootPrefix, data.name)
                buffer.push({
                  _id: _id as Ref<Blob>,
                  _class: core.class.Blob,
                  etag: data.etag,
                  size: data.size,
                  provider: this.opt.name,
                  space: core.space.Configuration,
                  modifiedBy: core.account.ConfigUser,
                  modifiedOn: data.lastModified.getTime()
                })
              }
              onNext()
              if (buffer.length > 100) {
                stream?.pause()
              }
            })
          }
        } catch (err: any) {
          const msg = (err?.message as string) ?? ''
          if (msg.includes('Invalid bucket name') || msg.includes('The specified bucket does not exist')) {
            hasMore = false
            return []
          }
          error = err
        }

        if (buffer.length > 0) {
          return buffer.splice(0, 50)
        }
        if (!hasMore) {
          return []
        }
        return await new Promise<ListBlobResult[]>((resolve, reject) => {
          onNext = () => {
            if (error != null) {
              reject(error)
            }
            onNext = () => {}
            resolve(buffer.splice(0, 50))
          }
          stream?.resume()
        })
      },
      close: async () => {
        stream?.destroy()
      }
    }
  }

  @withContext('stat')
  async stat (ctx: MeasureContext, dataId: WorkspaceDataId, objectName: string): Promise<Blob | undefined> {
    try {
      const result = await this.client.statObject(
        this.getBucketId(dataId),
        this.getDocumentKey(dataId, objectName)
      )
      const rootPrefix = this.rootPrefix(dataId)
      return {
        provider: '',
        _class: core.class.Blob,
        _id: this.stripPrefix(rootPrefix, objectName) as Ref<Blob>,
        contentType: result.metaData['content-type'],
        size: result.size,
        etag: result.etag,
        space: core.space.Configuration,
        modifiedBy: core.account.System,
        modifiedOn: result.lastModified.getTime(),
        version: result.versionId ?? null
      }
    } catch (err: any) {
      if (
        err?.code === 'NoSuchKey' ||
        err?.code === 'NotFound' ||
        err?.message === 'No such key' ||
        err?.Code === 'NoSuchKey' ||
        err?.code === 'ECONNRESET'
      ) {
        // Do not print error in this case
        return
      }
      ctx.error('no object found', { error: err, objectName, dataId })
    }
  }

  @withContext('get')
  async get (ctx: MeasureContext, dataId: WorkspaceDataId, objectName: string): Promise<Readable> {
    return await this.client.getObject(this.getBucketId(dataId), this.getDocumentKey(dataId, objectName))
  }

  @withContext('put')
  async put (
    ctx: MeasureContext,
    dataId: WorkspaceDataId,
    objectName: string,
    stream: Readable | Buffer | string,
    contentType: string,
    size?: number
  ): Promise<UploadedObjectInfo> {
    return await this.client.putObject(
      this.getBucketId(dataId),
      this.getDocumentKey(dataId, objectName),
      stream,
      size,
      {
        'Content-Type': contentType
      }
    )
  }

  @withContext('read')
  async read (ctx: MeasureContext, dataId: WorkspaceDataId, objectName: string): Promise<Buffer[]> {
    const data = await this.client.getObject(
      this.getBucketId(dataId),
      this.getDocumentKey(dataId, objectName)
    )
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

  @withContext('partial')
  async partial (
    ctx: MeasureContext,
    dataId: WorkspaceDataId,
    objectName: string,
    offset: number,
    length?: number
  ): Promise<Readable> {
    return await this.client.getPartialObject(
      this.getBucketId(dataId),
      this.getDocumentKey(dataId, objectName),
      offset,
      length
    )
  }

  @withContext('getUrl')
  async getUrl (ctx: MeasureContext, dataId: WorkspaceDataId, objectName: string): Promise<string> {
    const filesUrl = getMetadata(serverCore.metadata.FilesUrl) ?? ''
    return filesUrl.replaceAll(':workspace', dataId).replaceAll(':blobId', objectName)
  }
}

export function processConfigFromEnv (storageConfig: StorageConfiguration): string | undefined {
  let minioEndpoint = process.env.MINIO_ENDPOINT
  if (minioEndpoint === undefined) {
    return 'MINIO_ENDPOINT'
  }
  const minioAccessKey = process.env.MINIO_ACCESS_KEY
  if (minioAccessKey === undefined) {
    return 'MINIO_ACCESS_KEY'
  }

  let minioPort = 9000
  const sp = minioEndpoint.split(':')
  if (sp.length > 1) {
    minioEndpoint = sp[0]
    minioPort = parseInt(sp[1])
  }

  const minioSecretKey = process.env.MINIO_SECRET_KEY
  if (minioSecretKey === undefined) {
    return 'MINIO_SECRET_KEY'
  }

  const minioConfig: MinioConfig = {
    kind: 'minio',
    name: 'minio',
    port: minioPort,
    region: 'us-east-1',
    useSSL: 'false',
    endpoint: minioEndpoint,
    accessKey: minioAccessKey,
    secretKey: minioSecretKey
  }
  storageConfig.storages.push(minioConfig)
  storageConfig.default = 'minio'
}

export function addMinioFallback (storageConfig: StorageConfiguration): void {
  const required = processConfigFromEnv(storageConfig)
  if (required !== undefined) {
    console.error(`Required ${required} env to be configured`)
    process.exit(1)
  }
}
