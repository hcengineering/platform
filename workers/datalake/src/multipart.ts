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
import { withPostgres } from './db'
import { cacheControl } from './const'
import { toUUID } from './encodings'
import { type MetricsContext } from './metrics'
import { selectStorage } from './storage'
import { type BlobRequest, type UUID } from './types'

export interface MultipartUpload {
  key: string
  uploadId: string
}

export interface MultipartUploadPart {
  partNumber: number
  etag: string
}

export interface MultipartUploadCompleteRequest {
  parts: MultipartUploadPart[]
}

export async function handleMultipartUploadStart (
  request: BlobRequest,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const { workspace } = request

  const { bucket } = selectStorage(env, workspace)

  const contentType = request.headers.get('content-type') ?? 'application/octet-stream'
  const lastModifiedHeader = request.headers.get('last-modified')
  const lastModified = lastModifiedHeader !== null ? new Date(lastModifiedHeader).getTime() : Date.now()
  const httpMetadata = { contentType, cacheControl, lastModified }
  const uuid = crypto.randomUUID() as UUID

  const multipart = await bucket.createMultipartUpload(uuid, { httpMetadata })
  return json({ key: multipart.key, uploadId: multipart.uploadId })
}

export async function handleMultipartUploadPart (
  request: BlobRequest,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const { workspace } = request

  const multipartKey = request.query?.key
  const multipartUploadId = request.query?.uploadId
  const partNumber = request.query?.partNumber
  if (typeof multipartKey !== 'string' || typeof multipartUploadId !== 'string' || typeof partNumber !== 'string') {
    return error(400, 'missing key or uploadId or partNumber')
  }

  if (request.body === null) {
    return error(400, 'missing body')
  }

  const { bucket } = selectStorage(env, workspace)

  const upload = bucket.resumeMultipartUpload(multipartKey, multipartUploadId)
  const part = await upload.uploadPart(Number.parseInt(partNumber), request.body)

  return json({ partNumber: part.partNumber, etag: part.etag })
}

export async function handleMultipartUploadComplete (
  request: BlobRequest,
  env: Env,
  ctx: ExecutionContext,
  metrics: MetricsContext
): Promise<Response> {
  const { workspace, name } = request

  const multipartKey = request.query?.key
  const multipartUploadId = request.query?.uploadId
  if (typeof multipartKey !== 'string' || typeof multipartUploadId !== 'string') {
    return error(400, 'missing key or uploadId')
  }

  const { parts } = await request.json<MultipartUploadCompleteRequest>()

  const { bucket, location } = selectStorage(env, workspace)

  const upload = bucket.resumeMultipartUpload(multipartKey, multipartUploadId)
  const object = await upload.complete(parts)

  const hash =
    object.checksums.md5 !== undefined ? toUUID(new Uint8Array(object.checksums.md5)) : (crypto.randomUUID() as UUID)
  const type = object.httpMetadata?.contentType ?? 'application/octet-stream'
  const size = object.size ?? 0
  const filename = multipartKey as UUID

  await withPostgres(env, ctx, metrics, async (db) => {
    const data = await db.getData({ hash, location })
    if (data !== null) {
      // blob already exists
      await Promise.all([bucket.delete(filename), db.createBlob({ workspace, name, hash, location })])
    } else {
      // Otherwise register a new hash and blob
      await db.createData({ hash, location, filename, type, size })
      await db.createBlob({ workspace, name, hash, location })
    }
  })

  return new Response(null, { status: 204 })
}

export async function handleMultipartUploadAbort (
  request: BlobRequest,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const { workspace } = request

  const multipartKey = request.query?.key
  const multipartUploadId = request.query?.uploadId
  if (typeof multipartKey !== 'string' || typeof multipartUploadId !== 'string') {
    return error(400, 'missing key or uploadId')
  }

  const { bucket } = selectStorage(env, workspace)

  const upload = bucket.resumeMultipartUpload(multipartKey, multipartUploadId)
  await upload.abort()
  return new Response(null, { status: 204 })
}
