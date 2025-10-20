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

import { type UnsubscribeCallback, type Callback } from '@hcengineering/hulypulse-client'
import { type IntlString, getMetadata } from '@hcengineering/platform'
import presentation, { createPulseClient } from '@hcengineering/presentation'
import { type Doc, type Ref, type PersonId } from '@hcengineering/core'

const typingDelaySeconds = 2

function getWorkspace (): string {
  return getMetadata(presentation.metadata.WorkspaceUuid) ?? ''
}

export interface TypingInfo {
  socialId: PersonId
  objectId: Ref<Doc>
  status?: IntlString
}

export interface TypingActionParams {
  socialId: PersonId
  objectId: Ref<Doc>
  onTyping: (presence: Map<string, TypingInfo>) => void
}

export function typing (node: HTMLElement, params: TypingActionParams): any {
  let unsubscribe: Promise<UnsubscribeCallback> | undefined
  let typing = new Map<string, TypingInfo>()

  let socialId = params.socialId
  let objectId = params.objectId
  let onTyping = params.onTyping

  function handleTypingInfo (key: string, value: TypingInfo | undefined): void {
    if (value?.socialId === socialId) {
      return
    }

    if (value === undefined) {
      typing.delete(key)
    } else {
      typing.set(key, value)
    }

    onTyping(typing)
  }

  unsubscribe = subscribeTyping(params.objectId, handleTypingInfo)

  return {
    update: (params: TypingActionParams) => {
      if (objectId !== params.objectId) {
        socialId = params.socialId
        objectId = params.objectId
        onTyping = params.onTyping

        void unsubscribe?.then((unsub) => {
          void unsub()
        })

        typing = new Map<string, TypingInfo>()
        unsubscribe = subscribeTyping(params.objectId, handleTypingInfo)

        onTyping(typing)
      }
    },
    destroy: () => {
      void unsubscribe?.then((unsub) => {
        void unsub()
      })
    }
  }
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

export async function setTyping (socialId: PersonId, objectId: Ref<Doc>, status?: IntlString): Promise<void> {
  const client = await createPulseClient()

  if (client !== undefined) {
    const workspace = getWorkspace()
    const typingInfo: TypingInfo = { socialId, objectId, status }
    try {
      await client.put(`${workspace}/typing/${objectId}/${socialId}`, typingInfo, typingDelaySeconds)
    } catch (error) {
      console.warn('failed to put typing info:', error)
    }
  }
}

export async function clearTyping (socialId: PersonId, objectId: string): Promise<void> {
  const client = await createPulseClient()

  if (client !== undefined) {
    const workspace = getWorkspace()
    try {
      await client.delete(`${workspace}/typing/${objectId}/${socialId}`)
    } catch (error) {
      console.warn('failed to delete typing info:', error)
    }
  }
}
