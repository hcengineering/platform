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
import { error } from 'itty-router'

import { handleBlobUploaded } from './blob'
import { type BlobRequest, type UUID } from './types'
import { selectStorage, type Storage } from './storage'

const S3_SIGNED_LINK_TTL = 3600

interface SignBlobInfo {
  uuid: UUID
}

function signBlobKey (workspace: string, name: string): string {
  return `s/${workspace}/${name}`
}

function getS3Client (storage: Storage): AwsClient {
  return new AwsClient({
    service: 's3',
    region: 'auto',
    accessKeyId: storage.bucketAccessKey,
    secretAccessKey: storage.bucketSecretKey
  })
}

export async function handleSignCreate (request: BlobRequest, env: Env, ctx: ExecutionContext): Promise<Response> {
  const { workspace, name } = request
  const storage = selectStorage(env, workspace)
  const accountId = env.R2_ACCOUNT_ID

  const key = signBlobKey(workspace, name)
  const uuid = crypto.randomUUID() as UUID

  // Generate R2 object link
  const url = new URL(`https://${storage.bucketName}.${accountId}.r2.cloudflarestorage.com`)
  url.pathname = uuid
  url.searchParams.set('X-Amz-Expires', S3_SIGNED_LINK_TTL.toString())

  // Sign R2 object link
  let signed: Request
  try {
    const client = getS3Client(storage)

    signed = await client.sign(new Request(url, { method: 'PUT' }), { aws: { signQuery: true } })
  } catch (err: any) {
    console.error({ error: 'failed to generate signed url', message: `${err}` })
    return error(500, 'failed to generate signed url')
  }

  // Save upload details
  const s3BlobInfo: SignBlobInfo = { uuid }
  await env.datalake_blobs.put(key, JSON.stringify(s3BlobInfo), { expirationTtl: S3_SIGNED_LINK_TTL })

  const headers = new Headers({
    Expires: new Date(Date.now() + S3_SIGNED_LINK_TTL * 1000).toISOString()
  })
  return new Response(signed.url, { status: 200, headers })
}

export async function handleSignComplete (request: BlobRequest, env: Env, ctx: ExecutionContext): Promise<Response> {
  const { workspace, name } = request

  const { bucket } = selectStorage(env, workspace)
  const key = signBlobKey(workspace, name)

  // Ensure we generated presigned URL earlier
  // TODO what if we came after expiration date?
  const signBlobInfo = await env.datalake_blobs.get<SignBlobInfo>(key, { type: 'json' })
  if (signBlobInfo === null) {
    console.error({ error: 'blob sign info not found', workspace, name })
    return error(404)
  }

  // Ensure the blob has been uploaded
  const { uuid } = signBlobInfo
  const head = await bucket.get(uuid)
  if (head === null) {
    console.error({ error: 'blob not found', workspace, name, uuid })
    return error(400)
  }

  try {
    await handleBlobUploaded(env, ctx, workspace, name, uuid)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error({ error: message, workspace, name, uuid })
    return error(500, 'failed to upload blob')
  }

  await env.datalake_blobs.delete(key)

  return new Response(null, { status: 201 })
}

export async function handleSignAbort (request: BlobRequest, env: Env, ctx: ExecutionContext): Promise<Response> {
  const { workspace, name } = request

  const key = signBlobKey(workspace, name)

  // Check if the blob has been uploaded
  const s3BlobInfo = await env.datalake_blobs.get<SignBlobInfo>(key, { type: 'json' })
  if (s3BlobInfo !== null) {
    await env.datalake_blobs.delete(key)
  }

  return new Response(null, { status: 204 })
}
