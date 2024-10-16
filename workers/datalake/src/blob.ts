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
import postgres from 'postgres'
import * as db from './db'
import { toUUID } from './encodings'
import { copyVideo, deleteVideo } from './video'
import { type Location, type UUID } from './types'

const expires = 86400
const cacheControl = `public,max-age=${expires}`

// 64MB hash limit
const HASH_LIMIT = 64 * 1024 * 1024

interface BlobMetadata {
  lastModified: number
  type: string
  size: number
  name: string
}

export function getBlobURL (request: Request, workspace: string, name: string): string {
  const path = `/blob/${workspace}/${name}`
  return new URL(path, request.url).toString()
}

export async function getBlob (
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  workspace: string,
  name: string
): Promise<Response> {
  const sql = postgres(env.HYPERDRIVE.connectionString)
  const { bucket } = selectLocation(env, workspace)

  const blob = await db.getBlob(sql, { workspace, name })
  if (blob === null || blob.deleted) {
    return error(404)
  }

  const cache = caches.default
  const cached = await cache.match(request)
  if (cached !== undefined) {
    return cached
  }

  const range = request.headers.has('Range') ? request.headers : undefined
  const object = await bucket.get(blob.filename, { range })
  if (object === null) {
    return error(404)
  }

  const headers = r2MetadataHeaders(object)
  if (range !== undefined && object?.range !== undefined) {
    headers.set('Content-Range', rangeHeader(object.range, object.size))
  }

  const length = object?.range !== undefined && 'length' in object.range ? object?.range?.length : undefined
  const status = length !== undefined && length < object.size ? 206 : 200

  const response = new Response(object?.body, { headers, status })
  ctx.waitUntil(cache.put(request, response.clone()))

  return response
}

export async function headBlob (
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  workspace: string,
  name: string
): Promise<Response> {
  const sql = postgres(env.HYPERDRIVE.connectionString)
  const { bucket } = selectLocation(env, workspace)

  const blob = await db.getBlob(sql, { workspace, name })
  if (blob === null) {
    return error(404)
  }

  const head = await bucket.head(blob.filename)
  if (head?.httpMetadata === undefined) {
    return error(404)
  }

  const headers = r2MetadataHeaders(head)
  return new Response(null, { headers, status: 200 })
}

export async function deleteBlob (env: Env, workspace: string, name: string): Promise<Response> {
  const sql = postgres(env.HYPERDRIVE.connectionString)

  try {
    await Promise.all([db.deleteBlob(sql, { workspace, name }), deleteVideo(env, workspace, name)])

    return new Response(null, { status: 204 })
  } catch (err: any) {
    const message = err instanceof Error ? err.message : String(err)
    console.error({ error: 'failed to delete blob:' + message })
    return error(500)
  }
}

export async function postBlobFormData (request: Request, env: Env, workspace: string): Promise<Response> {
  const sql = postgres(env.HYPERDRIVE.connectionString)
  const formData = await request.formData()

  const files: [File, key: string][] = []
  formData.forEach((value: any, key: string) => {
    if (typeof value === 'object') files.push([value, key])
  })

  const result = await Promise.all(
    files.map(async ([file, key]) => {
      const { name, type, lastModified } = file
      try {
        const metadata = await saveBlob(env, sql, file, type, workspace, name, lastModified)

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

async function saveBlob (
  env: Env,
  sql: postgres.Sql,
  file: File,
  type: string,
  workspace: string,
  name: string,
  lastModified: number
): Promise<BlobMetadata> {
  const { location, bucket } = selectLocation(env, workspace)

  const size = file.size
  const [mimetype, subtype] = type.split('/')
  const httpMetadata = { contentType: type, cacheControl }
  const filename = getUniqueFilename()

  const sha256hash = await getSha256(file)

  if (sha256hash !== null) {
    // Lucky boy, nothing to upload, use existing blob
    const hash = sha256hash

    const data = await db.getData(sql, { hash, location })
    if (data !== null) {
      await db.createBlob(sql, { workspace, name, hash, location })
    } else {
      await bucket.put(filename, file, { httpMetadata })
      await sql.begin((sql) => [
        db.createData(sql, { hash, location, filename, type: mimetype, subtype, size }),
        db.createBlob(sql, { workspace, name, hash, location })
      ])
    }

    return { type, size, lastModified, name }
  } else {
    // For large files we cannot calculate checksum beforehead
    // upload file with unique filename and then obtain checksum
    const object = await bucket.put(filename, file, { httpMetadata })

    const hash =
      object.checksums.md5 !== undefined ? getMd5Checksum(object.checksums.md5) : (crypto.randomUUID() as UUID)

    const data = await db.getData(sql, { hash, location })
    if (data !== null) {
      // We found an existing blob with the same hash
      // we can safely remove the existing blob from storage
      await Promise.all([bucket.delete(filename), db.createBlob(sql, { workspace, name, hash, location })])
    } else {
      // Otherwise register a new hash and blob
      await sql.begin((sql) => [
        db.createData(sql, { hash, location, filename, type: mimetype, subtype, size }),
        db.createBlob(sql, { workspace, name, hash, location })
      ])
    }

    return { type, size, lastModified, name }
  }
}

export async function handleBlobUploaded (env: Env, workspace: string, name: string, filename: UUID): Promise<void> {
  const sql = postgres(env.HYPERDRIVE.connectionString)
  const { location, bucket } = selectLocation(env, workspace)

  const object = await bucket.head(filename)
  if (object?.httpMetadata === undefined) {
    throw Error('blob not found')
  }

  const hash = object.checksums.md5 !== undefined ? getMd5Checksum(object.checksums.md5) : (crypto.randomUUID() as UUID)

  const data = await db.getData(sql, { hash, location })
  if (data !== null) {
    await Promise.all([bucket.delete(filename), db.createBlob(sql, { workspace, name, hash, location })])
  } else {
    const size = object.size
    const type = object.httpMetadata.contentType ?? 'application/octet-stream'
    const [mimetype, subtype] = type.split('/')

    await db.createData(sql, { hash, location, filename, type: mimetype, subtype, size })
    await db.createBlob(sql, { workspace, name, hash, location })
  }
}

function selectLocation (env: Env, workspace: string): { location: Location, bucket: R2Bucket } {
  // TODO Select location based on workspace
  return {
    location: 'weur',
    bucket: env.datalake_eu_west
  }
}

function getUniqueFilename (): UUID {
  return crypto.randomUUID() as UUID
}

async function getSha256 (file: File): Promise<UUID | null> {
  if (file.size > HASH_LIMIT) {
    return null
  }

  const digestStream = new crypto.DigestStream('SHA-256')
  await file.stream().pipeTo(digestStream)
  const digest = await digestStream.digest

  return toUUID(new Uint8Array(digest))
}

function getMd5Checksum (digest: ArrayBuffer): UUID {
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

function r2MetadataHeaders (head: R2Object): Headers {
  return head.httpMetadata !== undefined
    ? new Headers({
      'Accept-Ranges': 'bytes',
      'Content-Length': head.size.toString(),
      'Content-Type': head.httpMetadata.contentType ?? '',
      'Cache-Control': head.httpMetadata.cacheControl ?? cacheControl,
      'Last-Modified': head.uploaded.toUTCString(),
      ETag: head.httpEtag
    })
    : new Headers({
      'Accept-Ranges': 'bytes',
      'Content-Length': head.size.toString(),
      'Cache-Control': cacheControl,
      'Last-Modified': head.uploaded.toUTCString(),
      ETag: head.httpEtag
    })
}
