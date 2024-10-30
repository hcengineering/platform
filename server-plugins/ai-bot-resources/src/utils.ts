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

import { getMetadata } from '@hcengineering/platform'
import serverAIBot from '@hcengineering/server-ai-bot'
import { AIEventRequest } from '@hcengineering/ai-bot'
import { concatLink, MeasureContext, systemAccountEmail, WorkspaceId } from '@hcengineering/core'
import { generateToken } from '@hcengineering/server-token'

export function getSupportWorkspaceId (): string | undefined {
  const supportWorkspaceId = getMetadata(serverAIBot.metadata.SupportWorkspaceId)

  if (supportWorkspaceId === '') {
    return undefined
  }

  return supportWorkspaceId
}

export async function sendAIEvents (
  events: AIEventRequest[],
  workspace: WorkspaceId,
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
        Authorization: 'Bearer ' + generateToken(systemAccountEmail, workspace),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(events)
    })
  } catch (err) {
    ctx.error('Could not send ai events', { err })
  }
}

export async function createAccountRequest (workspace: WorkspaceId, ctx: MeasureContext): Promise<void> {
  const url = getMetadata(serverAIBot.metadata.EndpointURL) ?? ''

  if (url === '') {
    return
  }

  try {
    await fetch(concatLink(url, '/connect'), {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + generateToken(systemAccountEmail, workspace),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    })
  } catch (err) {
    ctx.error('Could not send create ai account request', { err })
  }
}
