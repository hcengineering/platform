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
import { type Class, type Doc, type Ref } from '@hcengineering/core'
import { getMetadata } from '@hcengineering/platform'
import presentation from '@hcengineering/presentation'

import { createPulseClient } from './pulse'

export interface PresenceInfo {
  personId: Ref<Person>
  objectId: Ref<Doc>
  objectClass: Ref<Class<Doc>>
}

export interface PresenceActionParams {
  personId: Ref<Employee>
  objectId: Ref<Doc>
  objectClass: Ref<Class<Doc>>
  onPresence: (presence: Map<string, Ref<Person>>) => void
}

export function presence (node: HTMLElement, params: PresenceActionParams): any {
  let unsubscribe: Promise<UnsubscribeCallback> | undefined
  let presence = new Map<string, Ref<Person>>()

  let personId = params.personId
  let objectId = params.objectId
  let objectClass = params.objectClass
  let onPresence = params.onPresence

  function handlePresenceInfo (key: string, value: PresenceInfo | undefined): void {
    if (value?.personId === personId) {
      return
    }

    if (value === undefined) {
      presence.delete(key)
    } else {
      presence.set(key, value.personId)
    }

    onPresence(presence)
  }

  unsubscribe = subscribePresence(params.objectClass, params.objectId, handlePresenceInfo)

  return {
    update: (params: PresenceActionParams) => {
      if (objectId !== params.objectId || objectClass !== params.objectClass) {
        personId = params.personId
        objectId = params.objectId
        objectClass = params.objectClass
        onPresence = params.onPresence

        void unsubscribe?.then((unsub) => {
          void unsub()
        })

        presence = new Map<string, Ref<Person>>()
        unsubscribe = subscribePresence(params.objectClass, params.objectId, handlePresenceInfo)

        onPresence(presence)
      }
    },
    destroy: () => {
      void unsubscribe?.then((unsub) => {
        void unsub()
      })
    }
  }
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
