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

import { Analytics } from '@hcengineering/analytics'
import { type MeasureContext, getWorkspaceId, systemAccountEmail } from '@hcengineering/core'
import { generateToken } from '@hcengineering/server-token'

import config from '../config'

interface StreamRequest {
  source: string
  format: string
  workspace: string
  metadata?: Record<string, string>
}

export async function requestHLS (ctx: MeasureContext, workspace: string, name: string): Promise<void> {
  try {
    ctx.info('request for hls', { workspace, name })
    await postTranscodingTask(ctx, workspace, name)
  } catch (err: any) {
    Analytics.handleError(err)
    ctx.error('can not schedule a task', { err })
  }
}

async function postTranscodingTask (ctx: MeasureContext, workspace: string, name: string): Promise<void> {
  if (config.StreamUrl === undefined) {
    return
  }
  const streamReq: StreamRequest = { format: 'hls', source: name, workspace }
  const token = generateToken(systemAccountEmail, getWorkspaceId(''), { iss: 'datalake', aud: 'stream' })

  const request = new Request(config.StreamUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(streamReq)
  })

  const resp = await fetch(request)
  if (!resp.ok) {
    ctx.error(resp.statusText)
  }
}
