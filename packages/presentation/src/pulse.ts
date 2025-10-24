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
// limitations under the License

import { HulypulseClient } from '@hcengineering/hulypulse-client'
import { getMetadata } from '@hcengineering/platform'
import presentation from './plugin'

let currentWorkspaceUuid: string | undefined
let currentToken: string | undefined
let promise: Promise<HulypulseClient | undefined> | undefined

export async function createPulseClient (): Promise<HulypulseClient | undefined> {
  const pulseUrl = getMetadata(presentation.metadata.PulseUrl) ?? ''
  const token = getMetadata(presentation.metadata.Token) ?? ''
  const workspaceUuid = getMetadata(presentation.metadata.WorkspaceUuid) ?? ''

  if (pulseUrl === '' || token === '' || workspaceUuid === '') {
    return undefined
  }

  // Token or workspace changed, need to reconnect
  if (token !== currentToken || workspaceUuid !== currentWorkspaceUuid) {
    closePulseClient()
  }

  if (promise !== undefined) {
    // eslint-disable-next-line @typescript-eslint/return-await
    return promise
  }

  promise = new Promise((resolve) => {
    HulypulseClient.connect(`${pulseUrl}?token=${token}`)
      .then(resolve)
      .catch(() => {
        resolve(undefined)
      })
  })
  currentToken = token
  currentWorkspaceUuid = workspaceUuid

  // eslint-disable-next-line @typescript-eslint/return-await
  return promise
}

export function closePulseClient (): void {
  if (promise !== undefined) {
    void promise.then((client) => {
      client?.close()
    })
  }
  promise = undefined
  currentToken = undefined
  currentWorkspaceUuid = undefined
}
