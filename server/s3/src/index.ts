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

import { CopyObjectCommand, PutObjectCommand, S3 } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { NodeHttpHandler } from '@smithy/node-http-handler'
import { Agent as HttpAgent } from 'http'
import { Agent as HttpsAgent } from 'https'

import core, {
  withContext,
  type Blob,
  type MeasureContext,
  type Ref,
  type WorkspaceUuid
} from '@hcengineering/core'
import { getMetadata } from '@hcengineering/platform'
import serverCore, {
  NoSuchKeyError,
  type BlobStorageIterator,
  type ListBlobResult,
  type StorageAdapter,
  type StorageConfig,
  type StorageConfiguration,
  type UploadedObjectInfo
} from '@hcengineering/server-core'
import { Readable } from 'stream'

import { removeAllObjects, type BucketInfo } from '@hcengineering/storage'
import type { ReadableStream } from 'stream/web'

export interface S3Config extends StorageConfig {
  kind: 's3'
  accessKey: string
  secretKey: string
  region?: string

  // If defined, all resources will be inside selected root bucket.
  rootBucket?: string

  // A prefix string to be added to a bucketId in case rootBucket not used
  bucketPrefix?: string

  // If not specified will be enabled
  allowPresign?: string
  // Expire time for presigned URIs
  expireTime?: string
}

export const CONFIG_KIND = 's3'

/**
 * @public
 */
export class S3Service implements StorageAdapter {
  expireTime: number
  client: S3
  constructor (readonly opt: S3Config) {
    this.client = new S3({
      endpoint: opt.endpoint,
      credentials: {
        accessKeyId: opt.accessKey,
        secretAccessKey: opt.secretKey
      },
      region: opt.region ?? 'auto',
      requestHandler: new NodeHttpHandler({
        connectionTimeout: 5000,
        socketTimeout: 120000,
        httpAgent: new HttpAgent({ maxSockets: 500, keepAlive: true }),
        httpsAgent: new HttpsAgent({ maxSockets: 500, keepAlive: true })
      })
    })

    this.expireTime = parseInt(this.opt.expireTime ?? '168') * 3600 // use 7 * 24 - hours as default value for expireF
  }

  async initialize (ctx: MeasureContext, workspaceId: WorkspaceUuid): Promise<void> {}

  /**
   * @public
   */
  getBucketId (workspaceId: WorkspaceUuid): string {
    return this.opt.rootBucket ?? (this.opt.bucketPrefix ?? '') + workspaceId
  }

  getBucketFolder (workspaceId: WorkspaceUuid): string {
    return workspaceId
  }

  async close (): Promise<void> {}

  async exists (ctx: MeasureContext, workspaceId: WorkspaceUuid): Promise<boolean> {
    try {
      const result = await this.client.headBucket({
        Bucket: this.getBucketId(workspaceId)
      })
      return result.$metadata.httpStatusCode === 200
    } catch (err: any) {
      if (err.name === '400') {
        // No bucket exisrs
        return false
      }
    }
    // No API to check is bucket exists or not, so we need to call make and check if it already exists.
    return false
  }

  @withContext('make')
  async make (ctx: MeasureContext, workspaceId: WorkspaceUuid): Promise<void> {
    try {
      await this.client.createBucket({
        Bucket: this.getBucketId(workspaceId)
      })
    } catch (err: any) {
      if (err.Code === 'BucketAlreadyOwnedByYou') {
        return
      }
      ctx.error('error during create bucket', { err })
    }
  }

  async listBuckets (ctx: MeasureContext): Promise<BucketInfo[]> {
    try {
      if (this.opt.rootBucket !== undefined) {
        const info = new Map<string, BucketInfo>()
        let token: string | undefined

        while (true) {
          const res = await this.client.listObjectsV2({
            Bucket: this.opt.rootBucket,
            Prefix: '',
            Delimiter: '/',
            ContinuationToken: token
          })
          for (const data of res.CommonPrefixes ?? []) {
            const wsUuid = data.Prefix?.split('/')?.[0]
            if (wsUuid !== undefined && !info.has(wsUuid)) {
              info.set(wsUuid, {
                name: wsUuid,
                delete: async () => {
                  await this.delete(ctx, wsUuid)
                },
                list: async () => await this.listStream(ctx, wsUuid)
              })
            }
          }
          if (res.IsTruncated === true) {
            token = res.NextContinuationToken
          } else {
            break
          }
        }
        return Array.from(info.values())
      } else {
        const productPostfix = this.getBucketFolder('')
        const buckets = await this.client.listBuckets()
        return (buckets.Buckets ?? [])
          .filter((it) => it.Name !== undefined && it.Name.endsWith(productPostfix))
          .map((it) => {
            let name = it.Name ?? ''
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
    } catch (err: any) {
      if (err.Code === 'NoSuchBucket') {
        return []
      }
      ctx.error('failed to list buckets', { rootBucket: this.opt.rootBucket })
      console.error(err)
      return []
    }
  }

  getDocumentKey (workspace: WorkspaceUuid, name: string): string {
    return this.opt.rootBucket === undefined ? name : `${this.getBucketFolder(workspace)}/${name}`
  }

  @withContext('remove')
  async remove (ctx: MeasureContext, workspaceId: WorkspaceUuid, objectNames: string[]): Promise<void> {
    await this.client.deleteObjects({
      Bucket: this.getBucketId(workspaceId),
      Delete: {
        Objects: objectNames.map((it) => ({ Key: this.getDocumentKey(workspaceId, it) }))
      }
    })
  }

  @withContext('delete')
  async delete (ctx: MeasureContext, workspaceId: WorkspaceUuid): Promise<void> {
    try {
      await removeAllObjects(ctx, this, workspaceId)
    } catch (err: any) {
      ctx.error('failed t oclean all objecrs', { error: err })
    }
    if (this.opt.rootBucket === undefined) {
      // We should also delete bucket
      await this.client.deleteBucket({
        Bucket: this.getBucketId(workspaceId)
      })
    }
  }

  stripPrefix (prefix: string | undefined, key: string): string {
    if (prefix !== undefined && key.startsWith(prefix)) {
      return key.slice(prefix.length)
    }
    return key
  }

  rootPrefix (workspaceId: WorkspaceUuid): string | undefined {
    return this.opt.rootBucket !== undefined ? this.getBucketFolder(workspaceId) + '/' : undefined
  }

  async copy (sourceId: WorkspaceUuid, targetId: WorkspaceUuid, objectName: string): Promise<void> {
    const copyOp = new CopyObjectCommand({
      Bucket: this.getBucketId(targetId),
      Key: this.getDocumentKey(targetId, objectName),
      CopySource: `${this.getBucketId(sourceId)}/${this.getDocumentKey(sourceId, objectName)}`
    })
    await this.client.send(copyOp)
  }

  @withContext('listStream')
  async listStream (ctx: MeasureContext, workspaceId: WorkspaceUuid): Promise<BlobStorageIterator> {
    let hasMore = true
    const buffer: ListBlobResult[] = []
    let token: string | undefined

    const rootPrefix = this.rootPrefix(workspaceId)
    return {
      next: async (): Promise<ListBlobResult[]> => {
        try {
          while (hasMore && buffer.length < 50) {
            const res = await this.client.listObjectsV2({
              Bucket: this.getBucketId(workspaceId),
              Prefix: rootPrefix ?? '',
              ContinuationToken: token
            })
            if (res.IsTruncated === true) {
              token = res.NextContinuationToken
            } else {
              hasMore = false
            }

            for (const data of res.Contents ?? []) {
              const _id = this.stripPrefix(rootPrefix, data.Key ?? '')
              buffer.push({
                _id: _id as Ref<Blob>,
                _class: core.class.Blob,
                etag: data.ETag ?? '',
                size: data.Size ?? 0,
                provider: this.opt.name,
                space: core.space.Configuration,
                modifiedBy: core.account.ConfigUser,
                modifiedOn: data.LastModified?.getTime() ?? 0
              })
            }
          }
        } catch (err: any) {
          ctx.error('Failed to get list', { error: err, workspaceId })
        }
        return buffer.splice(0, 50)
      },
      close: async () => {}
    }
  }

  @withContext('stat')
  async stat (ctx: MeasureContext, workspaceId: WorkspaceUuid, objectName: string): Promise<Blob | undefined> {
    try {
      const result = await this.client.headObject({
        Bucket: this.getBucketId(workspaceId),
        Key: this.getDocumentKey(workspaceId, objectName)
      })
      const rootPrefix = this.rootPrefix(workspaceId)
      return {
        provider: '',
        _class: core.class.Blob,
        _id: this.stripPrefix(rootPrefix, objectName) as Ref<Blob>,
        contentType: result.ContentType ?? '',
        size: result.ContentLength ?? 0,
        etag: result.ETag ?? '',
        space: core.space.Configuration,
        modifiedBy: core.account.System,
        modifiedOn: result.LastModified?.getTime() ?? 0,
        version: result.VersionId ?? null
      }
    } catch (err: any) {
      if (err?.$metadata?.httpStatusCode !== 404) {
        ctx.warn('no object found', { error: err, objectName, workspaceId })
      }
    }
  }

  @withContext('get')
  async get (ctx: MeasureContext, workspaceId: WorkspaceUuid, objectName: string): Promise<Readable> {
    return await this.doGet(ctx, workspaceId, objectName)
  }

  async doGet (ctx: MeasureContext, workspaceId: WorkspaceUuid, objectName: string, range?: string): Promise<Readable> {
    try {
      const res = await this.client.getObject({
        Bucket: this.getBucketId(workspaceId),
        Key: this.getDocumentKey(workspaceId, objectName),
        Range: range
      })

      const stream = res.Body?.transformToWebStream()

      if (stream !== undefined) {
        return Readable.fromWeb(stream as ReadableStream<any>)
      } else {
        const readable = new Readable()
        readable._read = () => {}
        readable.push(null)
        return readable
      }
    } catch (err: any) {
      // In case of error return undefined
      throw new NoSuchKeyError(`${workspaceId} missing ${objectName}`, err)
    }
  }

  @withContext('put')
  put (
    ctx: MeasureContext,
    workspaceId: WorkspaceUuid,
    objectName: string,
    stream: Readable | Buffer | string,
    contentType: string,
    size?: number
  ): Promise<UploadedObjectInfo> {
    if (size !== undefined && size < 1024 * 1024 * 5) {
      return ctx.with(
        'simple-put',
        {},
        async () => {
          const cmd = new PutObjectCommand({
            Bucket: this.getBucketId(workspaceId),
            Key: this.getDocumentKey(workspaceId, objectName),
            ContentType: contentType,
            ContentLength: size,
            Body: stream
          })
          const response = await this.client.send(cmd)
          return {
            etag: response.ETag ?? '',
            versionId: response.VersionId ?? null
          }
        },
        { size, objectName, workspaceId }
      )
      // Less 5Mb
    } else {
      return ctx.with(
        'multipart-upload',
        {},
        async () => {
          const uploadTask = new Upload({
            client: this.client,
            params: {
              Bucket: this.getBucketId(workspaceId),
              Key: this.getDocumentKey(workspaceId, objectName),
              ContentType: contentType,
              Body: stream
            },

            // (optional) concurrency configuration
            // queueSize: 1,

            // (optional) size of each part, in bytes, at least 5MB
            partSize: 1024 * 1024 * 5,
            leavePartsOnError: false
          })

          const output = await uploadTask.done()
          return {
            etag: output.ETag ?? '',
            versionId: output.VersionId ?? null
          }
        },
        { size, objectName, workspaceId }
      )
    }
  }

  @withContext('read')
  async read (ctx: MeasureContext, workspaceId: WorkspaceUuid, name: string): Promise<Buffer[]> {
    const data = await this.doGet(ctx, workspaceId, name)
    const chunks: Buffer[] = []

    await new Promise((resolve, reject) => {
      data.on('data', (chunk) => {
        chunks.push(chunk)
      })

      data.on('end', () => {
        data.destroy()
        resolve(null)
      })
      data.on('error', (err) => {
        data.destroy()
        reject(err)
      })
    })
    return chunks
  }

  @withContext('partial')
  async partial (
    ctx: MeasureContext,
    workspaceId: WorkspaceUuid,
    objectName: string,
    offset: number,
    length?: number
  ): Promise<Readable> {
    const range = length !== undefined ? `bytes=${offset}-${offset + length}` : `bytes=${offset}-`
    return await this.doGet(ctx, workspaceId, objectName, range)
  }

  @withContext('getUrl')
  async getUrl (ctx: MeasureContext, workspaceId: WorkspaceUuid, objectName: string): Promise<string> {
    const filesUrl = getMetadata(serverCore.metadata.FilesUrl) ?? ''
    return filesUrl.replaceAll(':workspace', workspaceId).replaceAll(':blobId', objectName)
  }
}

export function processConfigFromEnv (storageConfig: StorageConfiguration): string | undefined {
  const endpoint = process.env.S3_ENDPOINT
  if (endpoint === undefined) {
    return 'S3_ENDPOINT'
  }
  const accessKey = process.env.S3_ACCESS_KEY
  if (accessKey === undefined) {
    return 'S3_ACCESS_KEY'
  }

  const secretKey = process.env.S3_SECRET_KEY
  if (secretKey === undefined) {
    return 'S3_SECRET_KEY'
  }

  const config: S3Config = {
    kind: 's3',
    name: 's3',
    region: 'auto',
    endpoint,
    accessKey,
    secretKey
  }
  storageConfig.storages.push(config)
  storageConfig.default = 's3'
}
