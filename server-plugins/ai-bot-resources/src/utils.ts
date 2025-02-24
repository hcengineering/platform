//
// Copyright © 2024-2025 Hardcore Engineering Inc.
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

import { getMetadata } from '@hcengineering/platform'
import serverAIBot from '@hcengineering/server-ai-bot'
import { concatLink, MeasureContext, systemAccountUuid, WorkspaceUuid } from '@hcengineering/core'
import { generateToken } from '@hcengineering/server-token'
import { AIEventRequest } from '@hcengineering/ai-bot'

export async function createAccountRequest (workspace: WorkspaceUuid, ctx: MeasureContext): Promise<void> {
  const url = getMetadata(serverAIBot.metadata.EndpointURL) ?? ''

  if (url === '') {
    return
  }

  try {
    ctx.info('Requesting AI account creation', { url, workspace })
    await fetch(concatLink(url, '/connect'), {
      method: 'POST',
      keepalive: true,
      headers: {
        Authorization: 'Bearer ' + generateToken(systemAccountUuid, workspace, { service: 'aibot' }),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    })
  } catch (err) {
    ctx.error('Could not send create ai account request', { err })
  }
}

export async function sendAIEvents (
  events: AIEventRequest[],
  workspace: WorkspaceUuid,
  ctx: MeasureContext
): Promise<void> {
  const url = getMetadata(serverAIBot.metadata.EndpointURL) ?? ''

  if (url === '') {
    return
  }

  try {
    await fetch(concatLink(url, '/events'), {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + generateToken(systemAccountUuid, workspace, { service: 'aibot' }),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(events)
    })
  } catch (err) {
    ctx.error('Could not send ai events', { err })
  }
}

export function hasAiEndpoint (): boolean {
  const url = getMetadata(serverAIBot.metadata.EndpointURL) ?? ''
  return url !== ''
}
