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

import { error, json } from 'itty-router'
import { type BlobDB, withPostgres } from './db'
import { cacheControl, hashLimit } from './const'
import { toUUID } from './encodings'
import { getSha256 } from './hash'
import { selectStorage } from './storage'
import { type BlobRequest, type WorkspaceRequest, type UUID } from './types'
import { copyVideo, deleteVideo } from './video'
import { type MetricsContext, LoggedCache } from './metrics'

export interface BlobMetadata {
  lastModified: number
  type: string
  size: number
  name: string
  etag: string
}

export function getBlobURL (request: Request, workspace: string, name: string): string {
  const path = `/blob/${workspace}/${name}`
  return new URL(path, request.url).toString()
}

export async function handleBlobList (
  request: WorkspaceRequest,
  env: Env,
  ctx: ExecutionContext,
  metrics: MetricsContext
): Promise<Response> {
  const { workspace } = request
  const cursor = extractStrParam(request.query.cursor)
  const limit = extractIntParam(request.query.limit)

  const response = await withPostgres(env, ctx, metrics, (db) => {
    return db.listBlobs(workspace, cursor, limit)
  })

  const blobs = response.blobs.map((blob) => {
    const { name, size, type, hash } = blob
    return { name, size, type, etag: hash }
  })

  return json({ blobs, cursor: response.cursor })
}

export async function handleBlobGet (
  request: BlobRequest,
  env: Env,
  ctx: ExecutionContext,
  metrics: MetricsContext
): Promise<Response> {
  const { workspace, name } = request

  const cache = new LoggedCache(caches.default, metrics)

  const cacheControl = request.headers.get('Cache-Control') ?? ''
  if (!cacheControl.includes('no-cache')) {
    const cached = await cache.match(request)
    if (cached !== undefined) {
      return cached
    }
  }

  const { bucket } = selectStorage(env, workspace)

  const blob = await withPostgres(env, ctx, metrics, (db) => {
    return db.getBlob({ workspace, name })
  })
  if (blob === null || blob.deleted) {
    return error(404)
  }

  const range = request.headers.has('Range') ? request.headers : undefined
  const object = await bucket.get(blob.filename, { range })
  if (object === null) {
    return error(404)
  }

  const headers = r2MetadataHeaders(blob.hash, object)
  if (range !== undefined && object?.range !== undefined) {
    headers.set('Content-Range', rangeHeader(object.range, object.size))
  }

  const length = object?.range !== undefined && 'length' in object.range ? object?.range?.length : undefined
  const status = length !== undefined && length < object.size ? 206 : 200
  if (length !== undefined && length < object.size) {
    // for partial content use etag returned by R2
    headers.set('ETag', object.httpEtag)
  }

  const response = new Response(object?.body, { headers, status })

  if (response.status === 200) {
    if (!cacheControl.includes('no-store')) {
      const clone = metrics.withSync('response.clone', () => response.clone())
      ctx.waitUntil(cache.put(request, clone))
    }
  }

  return response
}

export async function handleBlobHead (
  request: BlobRequest,
  env: Env,
  ctx: ExecutionContext,
  metrics: MetricsContext
): Promise<Response> {
  const { workspace, name } = request

  const { bucket } = selectStorage(env, workspace)

  const blob = await withPostgres(env, ctx, metrics, (db) => {
    return db.getBlob({ workspace, name })
  })
  if (blob === null || blob.deleted) {
    return error(404)
  }

  const head = await bucket.head(blob.filename)
  if (head?.httpMetadata === undefined) {
    return error(404)
  }

  const headers = r2MetadataHeaders(blob.hash, head)
  return new Response(null, { headers, status: 200 })
}

export async function handleBlobDelete (
  request: BlobRequest,
  env: Env,
  ctx: ExecutionContext,
  metrics: MetricsContext
): Promise<Response> {
  const { workspace, name } = request

  try {
    await withPostgres(env, ctx, metrics, (db) => {
      return Promise.all([db.deleteBlob({ workspace, name }), deleteVideo(env, workspace, name)])
    })

    return new Response(null, { status: 204 })
  } catch (err: any) {
    const message = err instanceof Error ? err.message : String(err)
    console.error({ error: 'failed to delete blob:' + message })
    return error(500)
  }
}

export async function handleUploadFormData (
  request: WorkspaceRequest,
  env: Env,
  ctx: ExecutionContext,
  metrics: MetricsContext
): Promise<Response> {
  const contentType = request.headers.get('Content-Type')
  if (contentType === null || !contentType.includes('multipart/form-data')) {
    console.error({ error: 'expected multipart/form-data' })
    return error(400, 'expected multipart/form-data')
  }

  const { workspace } = request

  let formData: FormData
  try {
    formData = await metrics.with('request.formData', () => request.formData())
  } catch (err: any) {
    const message = err instanceof Error ? err.message : String(err)
    console.error({ error: 'failed to parse form data', message })
    return error(400, 'failed to parse form data')
  }

  const files: [File, key: string][] = []
  formData.forEach((value: any, key: string) => {
    if (typeof value === 'object') files.push([value, key])
  })

  const result = await Promise.all(
    files.map(async ([file, key]) => {
      const { name, type, lastModified } = file
      try {
        const metadata = await withPostgres(env, ctx, metrics, (db) => {
          return saveBlob(env, db, file.stream(), workspace, name, { type, size: file.size, lastModified })
        })

        // TODO this probably should happen via queue, let it be here for now
        if (type.startsWith('video/')) {
          const blobURL = getBlobURL(request, workspace, name)
          await copyVideo(env, blobURL, workspace, name)
        }

        return { key, metadata }
      } catch (err: any) {
        const error = err instanceof Error ? err.message : String(err)
        console.error('failed to upload blob:', error)
        return { key, error }
      }
    })
  )

  return json(result)
}

export async function saveBlob (
  env: Env,
  db: BlobDB,
  stream: ReadableStream,
  workspace: string,
  name: string,
  metadata: Omit<BlobMetadata, 'etag' | 'name'>
): Promise<BlobMetadata> {
  const { location, bucket } = selectStorage(env, workspace)

  const { size, type, lastModified } = metadata
  const httpMetadata = { contentType: type, cacheControl, lastModified }
  const filename = getUniqueFilename()

  const blob = await db.getBlob({ workspace, name })

  if (size <= hashLimit) {
    const [hashStream, uploadStream] = stream.tee()

    const hash = await getSha256(hashStream)

    // Check if we have the same blob already
    if (blob?.hash === hash && blob?.type === type) {
      return { type, size, lastModified, name, etag: hash }
    }

    const data = await db.getData({ hash, location })

    if (data !== null) {
      // Lucky boy, nothing to upload, use existing blob
      await db.createBlob({ workspace, name, hash, location })

      return { type, size, lastModified, name, etag: data.hash }
    } else {
      await bucket.put(filename, uploadStream, { httpMetadata })

      await db.createData({ hash, location, filename, type, size })
      await db.createBlob({ workspace, name, hash, location })

      return { type, size, lastModified, name, etag: hash }
    }
  } else {
    // For large files we cannot calculate checksum beforehead
    // upload file with unique filename and then obtain checksum
    const { hash } = await uploadLargeFile(bucket, stream, filename, { httpMetadata })
    const data = await db.getData({ hash, location })
    if (data !== null) {
      // We found an existing blob with the same hash
      // we can safely remove the existing blob from storage
      await Promise.all([bucket.delete(filename), db.createBlob({ workspace, name, hash, location })])

      return { type, size, lastModified, name, etag: hash }
    } else {
      // Otherwise register a new hash and blob
      await db.createData({ hash, location, filename, type, size })
      await db.createBlob({ workspace, name, hash, location })

      return { type, size, lastModified, name, etag: hash }
    }
  }
}

export async function handleBlobUploaded (
  env: Env,
  ctx: ExecutionContext,
  metrics: MetricsContext,
  workspace: string,
  name: string,
  filename: UUID
): Promise<BlobMetadata> {
  const { location, bucket } = selectStorage(env, workspace)

  const object = await bucket.head(filename)
  if (object?.httpMetadata === undefined) {
    throw Error('blob not found')
  }

  const hash = object.checksums.md5 !== undefined ? digestToUUID(object.checksums.md5) : (crypto.randomUUID() as UUID)
  const size = object.size
  const type = object.httpMetadata?.contentType ?? 'application/octet-stream'

  await withPostgres(env, ctx, metrics, async (db) => {
    const data = await db.getData({ hash, location })
    if (data !== null) {
      await Promise.all([bucket.delete(filename), db.createBlob({ workspace, name, hash, location })])
    } else {
      await db.createData({ hash, location, filename, type, size })
      await db.createBlob({ workspace, name, hash, location })
    }
  })

  return { type, size, name, etag: hash, lastModified: object.uploaded.getTime() }
}

async function uploadLargeFile (
  bucket: R2Bucket,
  stream: ReadableStream,
  filename: string,
  options: R2PutOptions
): Promise<{ hash: UUID }> {
  const digestStream = new crypto.DigestStream('SHA-256')

  const [digestFS, uploadFS] = stream.tee()

  const digestPromise = digestFS.pipeTo(digestStream)
  const uploadPromise = bucket.put(filename, uploadFS, options)

  await Promise.all([digestPromise, uploadPromise])

  const hash = digestToUUID(await digestStream.digest)

  return { hash }
}

function getUniqueFilename (): UUID {
  return crypto.randomUUID() as UUID
}

function digestToUUID (digest: ArrayBuffer): UUID {
  return toUUID(new Uint8Array(digest))
}

function rangeHeader (range: R2Range, size: number): string {
  const offset = 'offset' in range ? range.offset : undefined
  const length = 'length' in range ? range.length : undefined
  const suffix = 'suffix' in range ? range.suffix : undefined

  const start = suffix !== undefined ? size - suffix : offset ?? 0
  const end = suffix !== undefined ? size : length !== undefined ? start + length : size

  return `bytes ${start}-${end - 1}/${size}`
}

function r2MetadataHeaders (hash: string, head: R2Object): Headers {
  return head.httpMetadata !== undefined
    ? new Headers({
      'Accept-Ranges': 'bytes',
      'Content-Length': head.size.toString(),
      'Content-Type': head.httpMetadata.contentType ?? '',
      'Content-Security-Policy': "default-src 'none';",
      'Cache-Control': head.httpMetadata.cacheControl ?? cacheControl,
      'Last-Modified': head.uploaded.toUTCString(),
      ETag: hash
    })
    : new Headers({
      'Accept-Ranges': 'bytes',
      'Content-Length': head.size.toString(),
      'Content-Security-Policy': "default-src 'none';",
      'Cache-Control': cacheControl,
      'Last-Modified': head.uploaded.toUTCString(),
      ETag: hash
    })
}

function extractStrParam (value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0]
  }

  return value
}

function extractIntParam (value: string | string[] | undefined): number | undefined {
  if (value === undefined) {
    return undefined
  }

  if (Array.isArray(value)) {
    value = value[0]
  }

  const intValue = Number.parseInt(value)
  if (Number.isInteger(intValue)) {
    return intValue
  }

  return undefined
}
