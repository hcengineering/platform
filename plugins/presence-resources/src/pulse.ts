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

import { type Person, getCurrentEmployee } from '@hcengineering/contact'
import { HulypulseClient, type UnsubscribeCallback, type Callback } from '@hcengineering/hulypulse-client'
import { getMetadata } from '@hcengineering/platform'
import presentation from '@hcengineering/presentation'
import { type Doc, type Ref } from '@hcengineering/core'

const typingDelaySeconds = 2

let pulseclient: HulypulseClient | undefined

function getWorkspace (): string {
  return getMetadata(presentation.metadata.WorkspaceUuid) ?? ''
}

export function getPulseClient (): HulypulseClient | undefined {
  return pulseclient
}

export async function createPulseClient (): Promise<HulypulseClient> {
  if (pulseclient == null) {
    const wsPulseUrl = getMetadata(presentation.metadata.PulseUrl)
    const token = getMetadata(presentation.metadata.Token)
    pulseclient = await HulypulseClient.connect(`${wsPulseUrl}?token=${token}`)
  }
  return pulseclient
}

export interface TypingInfo {
  personId: Ref<Person>
  objectId: Ref<Doc>
}

export async function subscribeTyping (
  objectId: Ref<Doc>,
  callback: Callback<TypingInfo | undefined>
): Promise<UnsubscribeCallback> {
  const workspace = getWorkspace()
  return (await pulseclient?.subscribe(`${workspace}/typing/${objectId}/`, callback)) ?? (async () => false)
}

export async function setTyping (me: string, objectId: Ref<Doc>): Promise<void> {
  const workspace = getWorkspace()
  const personId = getCurrentEmployee()
  const typingInfo: TypingInfo = { personId, objectId }
  try {
    await pulseclient?.put(`${workspace}/typing/${objectId}/${me}`, typingInfo, typingDelaySeconds)
  } catch (error) {
    console.warn('failed to put typing info:', error)
  }
}

export function clearTyping (me: string, objectId: string): void {
  const workspace = getWorkspace()
  void pulseclient?.delete(`${workspace}/typing/${objectId}/${me}`).catch((error) => {
    console.warn('failed to delete typing info:', error)
  })
}

export function closePulseClient (): void {
  pulseclient?.close()
  pulseclient = undefined
}
