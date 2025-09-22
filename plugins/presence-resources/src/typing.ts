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

import { type Employee, type Person } from '@hcengineering/contact'
import { type UnsubscribeCallback, type Callback } from '@hcengineering/hulypulse-client'
import { getMetadata } from '@hcengineering/platform'
import presentation from '@hcengineering/presentation'
import { type Doc, type Ref } from '@hcengineering/core'
import { createPulseClient } from './pulse'

const typingDelaySeconds = 2

function getWorkspace (): string {
  return getMetadata(presentation.metadata.WorkspaceUuid) ?? ''
}

export interface TypingInfo {
  personId: Ref<Person>
  objectId: Ref<Doc>
}

export async function subscribeTyping (
  objectId: Ref<Doc>,
  callback: Callback<TypingInfo | undefined>
): Promise<UnsubscribeCallback> {
  const client = await createPulseClient()
  if (client !== undefined) {
    const workspace = getWorkspace()
    try {
      return await client.subscribe(`${workspace}/typing/${objectId}/`, callback)
    } catch (error) {
      console.warn('failed to subscribe typing info:', error)
    }
  }

  return async () => false
}

export async function setTyping (personId: Ref<Employee>, objectId: Ref<Doc>): Promise<void> {
  const client = await createPulseClient()

  if (client !== undefined) {
    const workspace = getWorkspace()
    const typingInfo: TypingInfo = { personId, objectId }
    try {
      await client.put(`${workspace}/typing/${objectId}/${personId}`, typingInfo, typingDelaySeconds)
    } catch (error) {
      console.warn('failed to put typing info:', error)
    }
  }
}

export async function clearTyping (me: string, objectId: string): Promise<void> {
  const client = await createPulseClient()

  if (client !== undefined) {
    const workspace = getWorkspace()
    try {
      await client.delete(`${workspace}/typing/${objectId}/${me}`)
    } catch (error) {
      console.warn('failed to delete typing info:', error)
    }
  }
}
