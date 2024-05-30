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

import { GetObjectCommand, S3 } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import core, {
  toWorkspaceString,
  withContext,
  type Blob,
  type BlobLookup,
  type MeasureContext,
  type Ref,
  type WorkspaceId,
  type WorkspaceIdWithUrl
} from '@hcengineering/core'

import {
  addBlobPreviewLookup,
  type BlobStorageIterator,
  type ListBlobResult,
  type StorageAdapter,
  type StorageConfig,
  type UploadedObjectInfo
} from '@hcengineering/server-core'
import { Readable } from 'stream'

import { removeAllObjects, type BlobLookupResult, type BucketInfo } from '@hcengineering/storage'
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

  // Override preview URL.
  // :workspace - will be replaced with current workspace
  // :downloadFile - will be replaced with direct download link
  // :blobId - will be replaced with blobId
  previewUrl?: string
  // Comma separated list of preview formats
  // Defaults: ['avif', 'webp', 'heif', 'jpeg']
  formats?: string

  allowPresign?: boolean
}

/**
 * @public
 */
export class S3Service implements StorageAdapter {
  static config = 's3'
  client: S3
  constructor (readonly opt: S3Config) {
    this.client = new S3({
      endpoint: opt.endpoint,
      credentials: {
        accessKeyId: opt.accessKey,
        secretAccessKey: opt.secretKey
      },
      region: opt.region ?? 'auto'
    })
  }

  /**
   * @public
   */
  getBucketId (workspaceId: WorkspaceId): string {
    return this.opt.rootBucket ?? (this.opt.bucketPrefix ?? '') + toWorkspaceString(workspaceId, '.')
  }

  getBucketFolder (workspaceId: WorkspaceId): string {
    return toWorkspaceString(workspaceId, '.')
  }

  async initialize (ctx: MeasureContext, workspaceId: WorkspaceId): Promise<void> {}

  async close (): Promise<void> {}

  async lookup (ctx: MeasureContext, workspaceId: WorkspaceIdWithUrl, docs: Blob[]): Promise<BlobLookupResult> {
    const result: BlobLookupResult = {
      lookups: [],
      updates: new Map()
    }
    for (const d of docs) {
      // Let's add current from URI for previews.
      const bl = d as BlobLookup
      const command = new GetObjectCommand({
        Bucket: this.getBucketId(workspaceId),
        Key: this.getDocumentKey(workspaceId, d.storageId)
      })
      if (bl.downloadUrl === undefined && (this.opt.allowPresign ?? true)) {
        bl.downloadUrl = await getSignedUrl(this.client, command)
        result.updates?.set(bl._id, {
          downloadUrl: bl.downloadUrl
        })
      }

      // Add default or override preview service
      addBlobPreviewLookup(workspaceId, bl, this.opt.formats, this.opt.previewUrl)
      result.lookups.push(bl)
    }
    // this.client.presignedUrl(httpMethod, bucketName, objectName, callback)
    return result
  }

  async exists (ctx: MeasureContext, workspaceId: WorkspaceId): Promise<boolean> {
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
  async make (ctx: MeasureContext, workspaceId: WorkspaceId): Promise<void> {
    try {
      await this.client.createBucket({
        Bucket: this.getBucketId(workspaceId)
      })
    } catch (err: any) {
      ctx.error('error during create bucket', { err })
    }
  }

  async listBuckets (ctx: MeasureContext, productId: string): Promise<BucketInfo[]> {
    const productPostfix = this.getBucketFolder({
      name: '',
      productId
    })
    const buckets = await this.client.listBuckets()
    return (buckets.Buckets ?? [])
      .filter((it) => it.Name !== undefined && it.Name.endsWith(productPostfix))
      .map((it) => {
        let name = it.Name ?? ''
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

  getDocumentKey (workspace: WorkspaceId, name: string): string {
    return this.opt.rootBucket === undefined ? name : `${this.getBucketFolder(workspace)}/${name}`
  }

  @withContext('remove')
  async remove (ctx: MeasureContext, workspaceId: WorkspaceId, objectNames: string[]): Promise<void> {
    await this.client.deleteObjects({
      Bucket: this.getBucketId(workspaceId),
      Delete: {
        Objects: objectNames.map((it) => ({ Key: this.getDocumentKey(workspaceId, it) }))
      }
    })
  }

  @withContext('delete')
  async delete (ctx: MeasureContext, workspaceId: WorkspaceId): Promise<void> {
    if (this.opt.rootBucket === undefined) {
      // We should
      await this.client.deleteBucket({
        Bucket: this.getBucketId(workspaceId)
      })
    } else {
      await removeAllObjects(ctx, this, workspaceId, this.getBucketFolder(workspaceId) + '/')
    }
  }

  stripPrefix (prefix: string | undefined, key: string): string {
    if (prefix !== undefined && key.startsWith(prefix)) {
      return key.slice(prefix.length)
    }
    return key
  }

  @withContext('listStream')
  async listStream (
    ctx: MeasureContext,
    workspaceId: WorkspaceId,
    prefix?: string | undefined
  ): Promise<BlobStorageIterator> {
    const hasMore = true
    const buffer: ListBlobResult[] = []
    let token: string | undefined

    const rootPrefix = this.opt.rootBucket !== undefined ? this.getBucketFolder(workspaceId) + '/' : undefined
    return {
      next: async (): Promise<ListBlobResult | undefined> => {
        try {
          if (hasMore) {
            const res = await this.client.listObjectsV2({
              Bucket: this.getBucketId(workspaceId),
              Prefix: rootPrefix !== undefined ? rootPrefix + (prefix ?? '') : prefix ?? '',
              ContinuationToken: token
            })
            if (res.IsTruncated === true) {
              token = res.NextContinuationToken
            }

            for (const data of res.Contents ?? []) {
              const _id = this.stripPrefix(rootPrefix, data.Key ?? '')
              buffer.push({
                _id: _id as Ref<Blob>,
                _class: core.class.Blob,
                etag: data.ETag ?? '',
                size: data.Size ?? 0,
                provider: 's3',
                space: core.space.Configuration,
                modifiedBy: core.account.ConfigUser,
                modifiedOn: data.LastModified?.getTime() ?? 0,
                storageId: _id
              })
            }
          }
        } catch (err: any) {
          ctx.error('Failed to get list', { error: err, workspaceId: workspaceId.name, prefix })
        }

        if (buffer.length > 0) {
          return buffer.shift()
        }
        if (!hasMore) {
          return undefined
        }
      },
      close: async () => {}
    }
  }

  async stat (ctx: MeasureContext, workspaceId: WorkspaceId, objectName: string): Promise<Blob | undefined> {
    try {
      const result = await this.client.headObject({
        Bucket: this.getBucketId(workspaceId),
        Key: this.getDocumentKey(workspaceId, objectName)
      })
      return {
        provider: '',
        _class: core.class.Blob,
        _id: objectName as Ref<Blob>,
        storageId: objectName,
        contentType: result.ContentType ?? '',
        size: result.ContentLength ?? 0,
        etag: result.ETag ?? '',
        space: core.space.Configuration,
        modifiedBy: core.account.System,
        modifiedOn: result.LastModified?.getTime() ?? 0,
        version: result.VersionId ?? null
      }
    } catch (err: any) {
      ctx.error('no object found', { error: err, objectName, workspaceId: workspaceId.name })
    }
  }

  @withContext('get')
  async get (ctx: MeasureContext, workspaceId: WorkspaceId, objectName: string): Promise<Readable> {
    return await this.doGet(ctx, workspaceId, objectName)
  }

  async doGet (ctx: MeasureContext, workspaceId: WorkspaceId, objectName: string, range?: string): Promise<Readable> {
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
  }

  @withContext('put')
  async put (
    ctx: MeasureContext,
    workspaceId: WorkspaceId,
    objectName: string,
    stream: Readable | Buffer | string,
    contentType: string,
    size?: number
  ): Promise<UploadedObjectInfo> {
    if (size === undefined) {
      const uploadTask = new Upload({
        client: this.client,
        params: {
          Bucket: this.getBucketId(workspaceId),
          Key: this.getDocumentKey(workspaceId, objectName),
          ContentType: contentType,
          Body: stream
        },

        // (optional) concurrency configuration
        queueSize: 1,

        // (optional) size of each part, in bytes, at least 5MB
        partSize: 1024 * 1024 * 5,
        leavePartsOnError: false
      })

      const output = await uploadTask.done()
      return {
        etag: output.ETag ?? '',
        versionId: output.VersionId ?? null
      }
    }

    const result = await this.client.putObject({
      Bucket: this.getBucketId(workspaceId),
      Key: this.getDocumentKey(workspaceId, objectName),
      ContentType: contentType,
      ContentLength: size,
      Body: stream
    })
    return {
      etag: result.ETag ?? '',
      versionId: result.VersionId ?? null
    }
  }

  @withContext('read')
  async read (ctx: MeasureContext, workspaceId: WorkspaceId, name: string): Promise<Buffer[]> {
    const data = await this.doGet(ctx, workspaceId, name)
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
    const range = length !== undefined ? `bytes=${offset}-${offset + length}` : `bytes=${offset}-`
    return await this.doGet(ctx, workspaceId, objectName, range)
  }
}
