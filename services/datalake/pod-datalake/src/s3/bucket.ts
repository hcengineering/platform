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

import { MeasureContext } from '@hcengineering/core'
import { S3, UploadPartCommandInput } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { Readable } from 'stream'
import { type ReadableStream } from 'stream/web'
import {
  type S3Bucket,
  type S3UploadPartOptions,
  type S3CreateMultipartUploadOptions,
  type S3GetOptions,
  type S3MultipartUpload,
  type S3MultipartUploadPart,
  type S3Object,
  type S3ObjectBody,
  type S3PutOptions
} from './types'

export async function createBucket (ctx: MeasureContext, client: S3, bucket: string): Promise<S3Bucket> {
  const impl = new S3BucketImpl(client, bucket)
  await impl.init(ctx)
  return impl
}

class S3BucketImpl implements S3Bucket {
  constructor (
    private readonly client: S3,
    readonly bucket: string
  ) {}

  async init (ctx: MeasureContext): Promise<void> {
    try {
      await this.client.headBucket({ Bucket: this.bucket })
    } catch (err: any) {
      if (err.name === 'NotFound') {
        ctx.warn('bucket not found, creating', { bucket: this.bucket })
        try {
          await this.client.createBucket({ Bucket: this.bucket })
          ctx.info('bucket created', { bucket: this.bucket })
        } catch (err: any) {
          ctx.error('failed to create bucket', { bucket: this.bucket, error: err.message })
          throw err
        }
      } else {
        throw err
      }
    }
  }

  async head (ctx: MeasureContext, key: string): Promise<S3Object | null> {
    try {
      const result = await ctx.with(
        's3.headObject',
        {},
        () => this.client.headObject({ Bucket: this.bucket, Key: key }),
        { bucket: this.bucket }
      )

      return {
        key,
        etag: result.ETag ?? '',
        size: result.ContentLength ?? 0,
        contentType: result.ContentType ?? '',
        lastModified: result.LastModified?.getTime() ?? 0,
        cacheControl: result.CacheControl
      }
    } catch (err: any) {
      if (err?.$metadata?.httpStatusCode !== 404) {
        ctx.warn('no object found', { error: err, bucket: this.bucket, key })
      }
      return null
    }
  }

  async get (ctx: MeasureContext, key: string, options?: S3GetOptions): Promise<S3ObjectBody | null> {
    try {
      const command = { Bucket: this.bucket, Key: key, Range: options?.range }

      const result = await ctx.with('s3.getObject', {}, () => this.client.getObject(command), { bucket: this.bucket })

      if (result.Body === undefined) {
        return null
      }

      const stream = result.Body?.transformToWebStream()
      if (stream === undefined) {
        return null
      }

      const lastModified =
        result.Metadata?.['last-modified'] !== undefined
          ? new Date(result.Metadata['last-modified']).getTime()
          : result.LastModified?.getTime()

      return {
        key,
        body: Readable.fromWeb(stream as ReadableStream<any>),
        range: result.ContentRange,
        etag: result.ETag ?? '',
        size: result.ContentLength ?? 0,
        contentType: result.ContentType ?? '',
        lastModified: lastModified ?? 0,
        cacheControl: result.CacheControl
      }
    } catch (err: any) {
      if (err?.$metadata?.httpStatusCode !== 404) {
        ctx.warn('no object found', { error: err, bucket: this.bucket, key })
      }
      return null
    }
  }

  async put (ctx: MeasureContext, key: string, body: Readable | Buffer | string, options: S3PutOptions): Promise<void> {
    const command = {
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: options.contentType,
      ContentLength: options.contentLength,
      CacheControl: options.cacheControl,
      Metadata: {
        'last-modified': new Date(options.lastModified).toISOString()
      }
    }

    if (Buffer.isBuffer(body)) {
      await ctx.with('s3.putObject', {}, () => this.client.putObject(command), { bucket: this.bucket })
    } else {
      const upload = new Upload({
        client: this.client,
        params: command,
        partSize: 1024 * 1024 * 5,
        leavePartsOnError: false
      })

      await ctx.with('s3.upload', {}, () => upload.done(), { bucket: this.bucket })
    }
  }

  async delete (ctx: MeasureContext, key: string): Promise<void> {
    await this.client.deleteObject({ Bucket: this.bucket, Key: key })
  }

  async createMultipartUpload (
    ctx: MeasureContext,
    key: string,
    options: S3CreateMultipartUploadOptions
  ): Promise<S3MultipartUpload> {
    const command = {
      Bucket: this.bucket,
      Key: key,
      ContentType: options.contentType,
      CacheControl: options.cacheControl,
      Metadata: {
        'last-modified': new Date(options.lastModified).toISOString()
      }
    }

    const result = await ctx.with('s3.createMultipartUpload', {}, () => this.client.createMultipartUpload(command), {
      bucket: this.bucket
    })
    if (result.UploadId === undefined) {
      throw new Error('failed to create multipart upload')
    }

    return {
      uploadId: result.UploadId
    }
  }

  async uploadMultipartPart (
    ctx: MeasureContext,
    key: string,
    multipart: S3MultipartUpload,
    body: Readable | Buffer | string,
    options: S3UploadPartOptions
  ): Promise<S3MultipartUploadPart> {
    const command: UploadPartCommandInput = {
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentLength: options.size,
      UploadId: multipart.uploadId,
      PartNumber: options.partNumber
    }
    const result = await ctx.with('s3.uploadPart', {}, () => this.client.uploadPart(command), { bucket: this.bucket })
    return {
      etag: result.ETag ?? '',
      partNumber: options.partNumber
    }
  }

  async completeMultipartUpload (
    ctx: MeasureContext,
    key: string,
    multipart: S3MultipartUpload,
    parts: S3MultipartUploadPart[]
  ): Promise<void> {
    const command = {
      Bucket: this.bucket,
      Key: key,
      UploadId: multipart.uploadId,
      MultipartUpload: {
        Parts: parts.map((part) => {
          return {
            ETag: part.etag,
            PartNumber: part.partNumber
          }
        })
      }
    }
    await ctx.with('s3.completeMultipartUpload', {}, () => this.client.completeMultipartUpload(command), {
      bucket: this.bucket
    })
  }

  async abortMultipartUpload (ctx: MeasureContext, key: string, multipart: S3MultipartUpload): Promise<void> {
    const command = {
      Bucket: this.bucket,
      Key: key,
      UploadId: multipart.uploadId
    }
    await ctx.with('s3.abortMultipartUpload', {}, () => this.client.abortMultipartUpload(command), {
      bucket: this.bucket
    })
  }
}
