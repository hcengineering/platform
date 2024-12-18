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

import { AwsClient } from 'aws4fetch'
import { error, json } from 'itty-router'
import { withPostgres } from './db'
import { saveBlob } from './blob'
import { type MetricsContext } from './metrics'
import { type BlobRequest } from './types'

export interface S3UploadPayload {
  url: string
  region: string
  accessKeyId: string
  secretAccessKey: string
}

function getS3Client (payload: S3UploadPayload): AwsClient {
  return new AwsClient({
    service: 's3',
    region: payload.region,
    accessKeyId: payload.accessKeyId,
    secretAccessKey: payload.secretAccessKey
  })
}

export async function handleS3Blob (
  request: BlobRequest,
  env: Env,
  ctx: ExecutionContext,
  metrics: MetricsContext
): Promise<Response> {
  const { workspace, name } = request

  const payload = await request.json<S3UploadPayload>()

  const client = getS3Client(payload)

  return await withPostgres(env, ctx, metrics, async (db) => {
    // Ensure the blob does not exist
    const blob = await db.getBlob({ workspace, name })
    if (blob !== null) {
      return new Response(null, { status: 200 })
    }

    const object = await client.fetch(payload.url)
    if (!object.ok || object.status !== 200) {
      return error(object.status)
    }

    if (object.body === null) {
      return error(400)
    }

    const type = object.headers.get('content-type') ?? 'application/octet-stream'
    const contentLengthHeader = object.headers.get('content-length') ?? '0'
    const lastModifiedHeader = object.headers.get('last-modified')

    const size = Number.parseInt(contentLengthHeader)
    const lastModified = lastModifiedHeader !== null ? new Date(lastModifiedHeader).getTime() : Date.now()

    const metadata = await saveBlob(env, db, object.body, workspace, name, { lastModified, size, type })
    return json(metadata)
  })
}
