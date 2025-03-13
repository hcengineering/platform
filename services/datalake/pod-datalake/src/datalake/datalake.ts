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

import { type MeasureContext } from '@hcengineering/core'
import { Readable } from 'stream'

import { type BlobDB } from './db'
import { digestToUUID, stringToUUID } from './encodings'
import { type BlobHead, type BlobBody, type BlobList, type BlobStorage, type Datalake, type Location } from './types'

import { type S3Bucket } from '../s3'

export class DatalakeImpl implements Datalake {
  constructor (
    private readonly db: BlobDB,
    private readonly buckets: Array<{ location: Location, bucket: S3Bucket }>,
    private readonly options: {
      cacheControl: string
    }
  ) {}

  async list (ctx: MeasureContext, workspace: string, cursor?: string, limit?: number): Promise<BlobList> {
    const blobs = await this.db.listBlobs(ctx, workspace, cursor, limit)

    return {
      cursor: blobs.cursor,
      blobs: blobs.blobs.map((blob) => {
        const { name, size, type, hash } = blob
        return { name, size, contentType: type, etag: hash }
      })
    }
  }

  async head (ctx: MeasureContext, workspace: string, name: string): Promise<BlobHead | null> {
    const blob = await this.db.getBlob(ctx, { workspace, name })
    if (blob === null) {
      return null
    }

    const { bucket } = await this.selectStorage(ctx, workspace, blob.location)
    const head = await bucket.head(ctx, blob.filename)
    if (head == null) {
      return null
    }

    return {
      name: blob.name,
      etag: blob.hash,
      size: head.size,
      contentType: head.contentType,
      lastModified: head.lastModified,
      cacheControl: head.cacheControl
    }
  }

  async get (
    ctx: MeasureContext,
    workspace: string,
    name: string,
    options: { range?: string }
  ): Promise<BlobBody | null> {
    const blob = await this.db.getBlob(ctx, { workspace, name })
    if (blob === null) {
      return null
    }

    const { bucket } = await this.selectStorage(ctx, workspace, blob.location)

    const range = options.range
    const object = await bucket.get(ctx, blob.filename, { range })
    if (object == null) {
      return null
    }

    return {
      name: blob.name,
      etag: blob.hash,
      size: blob.size,
      body: object.body,
      bodyLength: object.size,
      bodyEtag: object.etag,
      bodyRange: object.range,
      contentType: object.contentType,
      lastModified: object.lastModified,
      cacheControl: object.cacheControl
    }
  }

  async delete (ctx: MeasureContext, workspace: string, name: string | string[]): Promise<void> {
    if (Array.isArray(name)) {
      await this.db.deleteBlobList(ctx, { workspace, names: name })
    } else {
      await this.db.deleteBlob(ctx, { workspace, name })
    }
  }

  async put (
    ctx: MeasureContext,
    workspace: string,
    name: string,
    sha256: string,
    body: Buffer | Readable,
    options: Omit<BlobHead, 'name' | 'etag'>
  ): Promise<BlobHead> {
    const cacheControl = options.cacheControl ?? this.options.cacheControl

    const { size, contentType, lastModified } = options
    const { location, bucket } = await this.selectStorage(ctx, workspace)

    const blob = await this.db.getBlob(ctx, { workspace, name })

    const hash = digestToUUID(sha256)
    const filename = hash

    // Check if we have the same blob already
    if (blob?.hash === hash && blob?.type === contentType) {
      return { name, size, contentType, lastModified, etag: hash }
    }

    const data = await this.db.getData(ctx, { hash, location })

    if (data !== null) {
      // Lucky boy, nothing to upload, use existing blob
      await this.db.createBlob(ctx, { workspace, name, hash, location })
      return { name, size, contentType, lastModified, etag: hash }
    } else {
      const putOptions = {
        contentLength: size,
        contentType,
        cacheControl,
        lastModified
      }
      await bucket.put(ctx, filename, body, putOptions)
      await this.db.createBlobData(ctx, { workspace, name, hash, location, filename, size, type: contentType })
      return { name, size, contentType, lastModified, etag: hash }
    }
  }

  async create (ctx: MeasureContext, workspace: string, name: string, filename: string): Promise<BlobHead | null> {
    const { location, bucket } = await this.selectStorage(ctx, workspace)

    const head = await bucket.head(ctx, filename)
    if (head == null) {
      return null
    }

    const hash = stringToUUID(head.etag)
    const size = head.size
    const contentType = head.contentType ?? 'application/octet-stream'
    const lastModified = head.lastModified

    const data = await this.db.getData(ctx, { hash, location })
    if (data !== null) {
      await Promise.all([bucket.delete(ctx, filename), this.db.createBlob(ctx, { workspace, name, hash, location })])
    } else {
      await this.db.createBlobData(ctx, { workspace, name, hash, location, filename, size, type: contentType })
    }

    return { name, size, contentType, lastModified, etag: hash }
  }

  async getMeta (ctx: MeasureContext, workspace: string, name: string): Promise<Record<string, any> | null> {
    return await this.db.getMeta(ctx, { workspace, name })
  }

  async setMeta (ctx: MeasureContext, workspace: string, name: string, meta: Record<string, any>): Promise<void> {
    await this.db.setMeta(ctx, { workspace, name }, meta)
  }

  async setParent (ctx: MeasureContext, workspace: string, name: string, parent: string | null): Promise<void> {
    await this.db.setParent(ctx, { workspace, name }, parent !== null ? { workspace, name: parent } : null)
  }

  async selectStorage (ctx: MeasureContext, workspace: string, location?: Location): Promise<BlobStorage> {
    location ??= this.selectLocation(workspace)

    const bucket = this.buckets.find((b) => b.location === location)?.bucket
    if (bucket == null) {
      throw new Error(`Unsupported location: ${location}`)
    }
    return { location, bucket }
  }

  selectLocation (workspace: string): Location {
    return this.buckets[0].location
  }
}
