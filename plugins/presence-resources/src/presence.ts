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

import { type Person } from '@hcengineering/contact'
import { type UnsubscribeCallback, type Callback } from '@hcengineering/hulypulse-client'
import { type Class, type Doc, type Ref } from '@hcengineering/core'
import { getMetadata } from '@hcengineering/platform'
import presentation from '@hcengineering/presentation'

import { createPulseClient } from './pulse'

export interface PresenceInfo {
  personId: Ref<Person>
  objectId: Ref<Doc>
  objectClass: Ref<Class<Doc>>
}

export async function subscribePresence (
  objectClass: Ref<Class<Doc>>,
  objectId: Ref<Doc>,
  callback: Callback<PresenceInfo | undefined>
): Promise<UnsubscribeCallback> {
  const client = await createPulseClient()

  if (client !== undefined) {
    const workspace = getMetadata(presentation.metadata.WorkspaceUuid) ?? ''
    return await client.subscribe(`${workspace}/presence/${objectId}/`, callback)
  }

  return async () => false
}

export async function updatePresence (presence: PresenceInfo, presenceTtlSeconds: number): Promise<void> {
  const client = await createPulseClient()

  if (client !== undefined) {
    const workspace = getMetadata(presentation.metadata.WorkspaceUuid) ?? ''
    const { personId, objectId } = presence
    try {
      await client.put(`${workspace}/presence/${objectId}/${personId}`, presence, presenceTtlSeconds)
    } catch (error) {
      console.warn('failed to put presence info:', error)
    }
  }
}

export async function deletePresence (presence: PresenceInfo): Promise<void> {
  const client = await createPulseClient()

  if (client !== undefined) {
    const workspace = getMetadata(presentation.metadata.WorkspaceUuid) ?? ''
    const { personId, objectId } = presence
    try {
      await client.delete(`${workspace}/presence/${objectId}/${personId}`)
    } catch (error) {
      console.warn('failed to delete presence info:', error)
    }
  }
}
