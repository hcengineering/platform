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

import { type CloudflareResponse, type StreamUploadResponse } from './types'

export type StreamUploadState = 'ready' | 'error' | 'inprogress' | 'queued' | 'downloading' | 'pendingupload'

// https://developers.cloudflare.com/api/operations/stream-videos-list-videos#response-body
export interface StreamDetailsResponse extends CloudflareResponse {
  result: {
    uid: string
    thumbnail: string
    status: {
      state: StreamUploadState
    }
    playback: {
      hls: string
      dash: string
    }
  }
}

interface StreamBlobInfo {
  streamId: string
}

function streamBlobKey (workspace: string, name: string): string {
  return `v/${workspace}/${name}`
}

export async function getVideoMeta (
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  workspace: string,
  name: string
): Promise<Response> {
  const key = streamBlobKey(workspace, name)

  const streamInfo = await env.datalake_blobs.get<StreamBlobInfo>(key, { type: 'json' })
  if (streamInfo === null) {
    return error(404)
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${env.STREAMS_ACCOUNT_ID}/stream/${streamInfo.streamId}`
  const streamRequest = new Request(url, {
    headers: {
      Authorization: `Bearer ${env.STREAMS_AUTH_KEY}`,
      'Content-Type': 'application/json'
    }
  })

  const streamResponse = await fetch(streamRequest)
  const stream = await streamResponse.json<StreamDetailsResponse>()

  if (stream.success) {
    return json({
      status: stream.result.status.state,
      thumbnail: stream.result.thumbnail,
      hls: stream.result.playback.hls
    })
  } else {
    return error(500, { errors: stream.errors })
  }
}

export async function copyVideo (env: Env, source: string, workspace: string, name: string): Promise<void> {
  const key = streamBlobKey(workspace, name)

  const url = `https://api.cloudflare.com/client/v4/accounts/${env.STREAMS_ACCOUNT_ID}/stream/copy`
  const request = new Request(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.STREAMS_AUTH_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ url: source, meta: { name } })
  })

  const response = await fetch(request)
  const upload = await response.json<StreamUploadResponse>()

  if (upload.success) {
    const streamInfo: StreamBlobInfo = {
      streamId: upload.result.uid
    }
    await env.datalake_blobs.put(key, JSON.stringify(streamInfo))
  }
}

export async function deleteVideo (env: Env, workspace: string, name: string): Promise<void> {
  const key = streamBlobKey(workspace, name)

  const streamInfo = await env.datalake_blobs.get<StreamBlobInfo>(key, { type: 'json' })
  if (streamInfo !== null) {
    const url = `https://api.cloudflare.com/client/v4/accounts/${env.STREAMS_ACCOUNT_ID}/stream/${streamInfo.streamId}`
    const request = new Request(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${env.STREAMS_AUTH_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    await Promise.all([fetch(request), env.datalake_blobs.delete(key)])
  }
}
