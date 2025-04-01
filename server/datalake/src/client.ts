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

import { type MeasureContext, type WorkspaceId, concatLink } from '@hcengineering/core'
import FormData from 'form-data'
import fetch, { type RequestInfo, type RequestInit, type Response } from 'node-fetch'
import { Readable } from 'stream'

import { DatalakeError, NetworkError, NotFoundError } from './error'

/** @public */
export interface ObjectMetadata {
  lastModified: number
  name: string
  type: string
  etag: string
  size?: number
}

/** @public */
export interface ListObjectOutput {
  cursor: string | undefined
  blobs: Omit<ObjectMetadata, 'lastModified'>[]
}

/** @public */
export interface StatObjectOutput {
  lastModified: number
  type: string
  etag?: string
  size?: number
}

/** @public */
export interface UploadObjectParams {
  lastModified: number
  type: string
  size?: number
}

interface BlobUploadError {
  key: string
  error: string
}

interface BlobUploadSuccess {
  key: string
  id: string
  metadata: ObjectMetadata
}

type BlobUploadResult = BlobUploadSuccess | BlobUploadError

interface MultipartUpload {
  uploadId: string
}

interface MultipartUploadPart {
  partNumber: number
  etag: string
}

export interface R2UploadParams {
  location: string
  bucket: string
}

/** @public */
export class DatalakeClient {
  private readonly headers: Record<string, string>

  constructor (
    private readonly endpoint: string,
    private readonly token: string
  ) {
    this.headers = { Authorization: 'Bearer ' + token }
  }

  getObjectUrl (ctx: MeasureContext, workspace: WorkspaceId, objectName: string): string {
    const path = `/blob/${workspace.name}/${encodeURIComponent(objectName)}`
    return concatLink(this.endpoint, path)
  }

  async listObjects (
    ctx: MeasureContext,
    workspace: WorkspaceId,
    cursor: string | undefined,
    limit: number = 100
  ): Promise<ListObjectOutput> {
    const path = `/blob/${workspace.name}`
    const url = new URL(concatLink(this.endpoint, path))
    url.searchParams.append('limit', String(limit))
    if (cursor !== undefined) {
      url.searchParams.append('cursor', cursor)
    }

    const response = await fetchSafe(ctx, url, { headers: { ...this.headers } })
    return (await response.json()) as ListObjectOutput
  }

  async getObject (ctx: MeasureContext, workspace: WorkspaceId, objectName: string): Promise<Readable> {
    const url = this.getObjectUrl(ctx, workspace, objectName)

    let response
    try {
      response = await fetchSafe(ctx, url, { headers: { ...this.headers } })
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        console.error('failed to get object', { workspace, objectName, err })
      }
      throw err
    }

    if (response.body == null) {
      ctx.error('bad datalake response', { objectName })
      throw new DatalakeError('Missing response body')
    }

    return Readable.from(response.body)
  }

  async getPartialObject (
    ctx: MeasureContext,
    workspace: WorkspaceId,
    objectName: string,
    offset: number,
    length?: number
  ): Promise<Readable> {
    const url = this.getObjectUrl(ctx, workspace, objectName)
    const headers = {
      ...this.headers,
      Range: length !== undefined ? `bytes=${offset}-${offset + length - 1}` : `bytes=${offset}`
    }

    let response
    try {
      response = await fetchSafe(ctx, url, { headers })
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        console.error('failed to get partial object', { workspace, objectName, err })
      }
      throw err
    }

    if (response.body == null) {
      ctx.error('bad datalake response', { objectName })
      throw new DatalakeError('Missing response body')
    }

    return Readable.from(response.body)
  }

  async statObject (
    ctx: MeasureContext,
    workspace: WorkspaceId,
    objectName: string
  ): Promise<StatObjectOutput | undefined> {
    const url = this.getObjectUrl(ctx, workspace, objectName)

    let response: Response
    try {
      response = await fetchSafe(ctx, url, {
        method: 'HEAD',
        headers: { ...this.headers }
      })
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        return
      }
      console.error('failed to stat object', { workspace, objectName, err })
      throw err
    }

    const headers = response.headers
    const lastModified = Date.parse(headers.get('Last-Modified') ?? '')
    const size = parseInt(headers.get('Content-Length') ?? '0', 10)

    return {
      lastModified: isNaN(lastModified) ? 0 : lastModified,
      size: isNaN(size) ? 0 : size,
      type: headers.get('Content-Type') ?? '',
      etag: headers.get('ETag') ?? ''
    }
  }

  async deleteObject (ctx: MeasureContext, workspace: WorkspaceId, objectName: string): Promise<void> {
    const url = this.getObjectUrl(ctx, workspace, objectName)
    try {
      await fetchSafe(ctx, url, {
        method: 'DELETE',
        headers: { ...this.headers }
      })
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        console.error('failed to delete object', { workspace, objectName, err })
        throw err
      }
    }
  }

  async putObject (
    ctx: MeasureContext,
    workspace: WorkspaceId,
    objectName: string,
    stream: Readable | Buffer | string,
    params: UploadObjectParams
  ): Promise<ObjectMetadata> {
    let size = params.size
    if (size === undefined) {
      if (Buffer.isBuffer(stream)) {
        size = stream.length
      } else if (typeof stream === 'string') {
        size = Buffer.byteLength(stream)
      } else {
        // TODO: Implement size calculation for Readable streams
        ctx.warn('unknown object size', { workspace, objectName })
      }
    }

    try {
      if (size === undefined || size < 64 * 1024 * 1024) {
        return await ctx.with('direct-upload', {}, (ctx) =>
          this.uploadWithFormData(ctx, workspace, objectName, stream, { ...params, size })
        )
      } else {
        return await ctx.with('multipart-upload', {}, (ctx) =>
          this.uploadWithMultipart(ctx, workspace, objectName, stream, { ...params, size })
        )
      }
    } catch (err) {
      console.error('failed to put object', { workspace, objectName, err })
      throw err
    }
  }

  async uploadWithFormData (
    ctx: MeasureContext,
    workspace: WorkspaceId,
    objectName: string,
    stream: Readable | Buffer | string,
    params: UploadObjectParams
  ): Promise<ObjectMetadata> {
    const path = `/upload/form-data/${workspace.name}`
    const url = concatLink(this.endpoint, path)

    const form = new FormData()
    const options: FormData.AppendOptions = {
      filename: objectName,
      contentType: params.type,
      knownLength: params.size,
      header: {
        'Last-Modified': params.lastModified
      }
    }
    form.append('file', stream, options)

    const response = await fetchSafe(ctx, url, {
      method: 'POST',
      body: form,
      headers: { ...this.headers }
    })

    const result = (await response.json()) as BlobUploadResult[]
    if (result.length !== 1) {
      throw new DatalakeError('Bad datalake response: ' + result.toString())
    }

    const uploadResult = result[0]

    if ('error' in uploadResult) {
      throw new DatalakeError('Upload failed: ' + uploadResult.error)
    }

    return uploadResult.metadata
  }

  async uploadWithMultipart (
    ctx: MeasureContext,
    workspace: WorkspaceId,
    objectName: string,
    stream: Readable | Buffer | string,
    params: UploadObjectParams
  ): Promise<ObjectMetadata> {
    const chunkSize = 10 * 1024 * 1024

    const multipart = await this.multipartUploadStart(ctx, workspace, objectName, params)

    try {
      const parts: MultipartUploadPart[] = []

      let partNumber = 1
      for await (const chunk of getChunks(stream, chunkSize)) {
        const part = await this.multipartUploadPart(ctx, workspace, objectName, multipart, partNumber, chunk)
        parts.push(part)
        partNumber++
      }

      return await this.multipartUploadComplete(ctx, workspace, objectName, multipart, parts)
    } catch (err: any) {
      await this.multipartUploadAbort(ctx, workspace, objectName, multipart)
      throw err
    }
  }

  // S3

  async uploadFromS3 (
    ctx: MeasureContext,
    workspace: WorkspaceId,
    objectName: string,
    params: {
      url: string
      accessKeyId: string
      secretAccessKey: string
    }
  ): Promise<void> {
    const path = `/upload/s3/${workspace.name}/${encodeURIComponent(objectName)}`
    const url = concatLink(this.endpoint, path)

    await fetchSafe(ctx, url, {
      method: 'POST',
      headers: {
        ...this.headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    })
  }

  async getS3UploadParams (ctx: MeasureContext, workspace: WorkspaceId): Promise<R2UploadParams> {
    const path = `/upload/s3/${workspace.name}`
    const url = concatLink(this.endpoint, path)

    const response = await fetchSafe(ctx, url, { headers: { ...this.headers } })
    const json = (await response.json()) as R2UploadParams
    return json
  }

  async createFromS3 (
    ctx: MeasureContext,
    workspace: WorkspaceId,
    objectName: string,
    params: {
      filename: string
    }
  ): Promise<void> {
    const path = `/upload/s3/${workspace.name}/${encodeURIComponent(objectName)}`
    const url = concatLink(this.endpoint, path)

    await fetchSafe(ctx, url, {
      method: 'POST',
      headers: {
        ...this.headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    })
  }

  // Multipart

  private async multipartUploadStart (
    ctx: MeasureContext,
    workspace: WorkspaceId,
    objectName: string,
    params: UploadObjectParams
  ): Promise<MultipartUpload> {
    const path = `/upload/multipart/${workspace.name}/${encodeURIComponent(objectName)}`
    const url = concatLink(this.endpoint, path)

    try {
      const headers = {
        ...this.headers,
        'Content-Type': params.type,
        'Content-Length': params.size?.toString() ?? '0',
        'Last-Modified': new Date(params.lastModified).toUTCString()
      }
      const response = await fetchSafe(ctx, url, { method: 'POST', headers })
      return (await response.json()) as MultipartUpload
    } catch (err: any) {
      ctx.error('failed to start multipart upload', { workspace, objectName, err })
      throw new DatalakeError('Failed to start multipart upload')
    }
  }

  private async multipartUploadPart (
    ctx: MeasureContext,
    workspace: WorkspaceId,
    objectName: string,
    multipart: MultipartUpload,
    partNumber: number,
    body: Readable | Buffer | string
  ): Promise<MultipartUploadPart> {
    const path = `/upload/multipart/${workspace.name}/${encodeURIComponent(objectName)}/part`
    const url = new URL(concatLink(this.endpoint, path))
    url.searchParams.set('uploadId', multipart.uploadId)
    url.searchParams.set('partNumber', partNumber.toString())

    try {
      const response = await fetchSafe(ctx, url, {
        method: 'PUT',
        body,
        headers: { ...this.headers }
      })
      return (await response.json()) as MultipartUploadPart
    } catch (err: any) {
      ctx.error('failed to upload multipart part', { workspace, objectName, err })
      throw new DatalakeError('Failed to upload multipart part')
    }
  }

  private async multipartUploadComplete (
    ctx: MeasureContext,
    workspace: WorkspaceId,
    objectName: string,
    multipart: MultipartUpload,
    parts: MultipartUploadPart[]
  ): Promise<ObjectMetadata> {
    const path = `/upload/multipart/${workspace.name}/${encodeURIComponent(objectName)}/complete`
    const url = new URL(concatLink(this.endpoint, path))
    url.searchParams.set('uploadId', multipart.uploadId)

    try {
      const res = await fetchSafe(ctx, url, {
        method: 'POST',
        body: JSON.stringify({ parts }),
        headers: {
          'Content-Type': 'application/json',
          ...this.headers
        }
      })
      return (await res.json()) as ObjectMetadata
    } catch (err: any) {
      ctx.error('failed to complete multipart upload', { workspace, objectName, err })
      throw new DatalakeError('Failed to complete multipart upload')
    }
  }

  private async multipartUploadAbort (
    ctx: MeasureContext,
    workspace: WorkspaceId,
    objectName: string,
    multipart: MultipartUpload
  ): Promise<void> {
    const path = `/upload/multipart/${workspace.name}/${encodeURIComponent(objectName)}/abort`
    const url = new URL(concatLink(this.endpoint, path))
    url.searchParams.set('uploadId', multipart.uploadId)

    try {
      await fetchSafe(ctx, url, { method: 'POST', headers: { ...this.headers } })
    } catch (err: any) {
      ctx.error('failed to abort multipart upload', { workspace, objectName, err })
      throw new DatalakeError('Failed to abort multipart upload')
    }
  }
}

async function * getChunks (data: Buffer | string | Readable, chunkSize: number): AsyncGenerator<Buffer> {
  if (Buffer.isBuffer(data)) {
    let offset = 0
    while (offset < data.length) {
      yield data.subarray(offset, offset + chunkSize)
      offset += chunkSize
    }
  } else if (typeof data === 'string') {
    const buffer = Buffer.from(data)
    yield * getChunks(buffer, chunkSize)
  } else if (data instanceof Readable) {
    let buffer = Buffer.alloc(0)

    for await (const chunk of data) {
      buffer = Buffer.concat([buffer, chunk])

      while (buffer.length >= chunkSize) {
        yield buffer.subarray(0, chunkSize)
        buffer = buffer.subarray(chunkSize)
      }
    }
    if (buffer.length > 0) {
      yield buffer
    }
  }
}

async function fetchSafe (ctx: MeasureContext, url: RequestInfo, init?: RequestInit): Promise<Response> {
  let response
  try {
    response = await fetch(url, init)
  } catch (err: any) {
    ctx.error('network error', { err })
    throw new NetworkError(`Network error ${err}`)
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new NotFoundError()
    } else {
      throw new DatalakeError(`${response.status} ${response.statusText}`)
    }
  }

  return response
}
