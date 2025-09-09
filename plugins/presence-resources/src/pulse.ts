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

import { HulypulseClient } from '@hcengineering/hulypulse-client'
import { getMetadata } from '@hcengineering/platform'
import presentation from '@hcengineering/presentation'
import { getCurrentAccount } from '@hcengineering/core' 

const typingDelaySeconds = 2

let pulseclient: HulypulseClient | undefined 

function getWorkspace(): string | undefined {
  return getMetadata(presentation.metadata.WorkspaceUuid)
}

export function getPulseClient(): HulypulseClient | undefined {
  return pulseclient
}

export async function createPulseClient(): Promise<HulypulseClient> {
  if(!pulseclient) {
    const ws_pulse_url = getMetadata(presentation.metadata.PulseUrl)
    const token = getMetadata(presentation.metadata.Token)
    pulseclient = await HulypulseClient.connect(`${ws_pulse_url}?token=${token}`)
  }
  return pulseclient
}

export async function setTyping(me: string, objectId: string): Promise<void> {
    const workspace = getWorkspace()
    const id = getCurrentAccount().socialIds[0];
    await pulseclient?.put(`${workspace}/typing/${objectId}/${me}`, "typing", typingDelaySeconds)
}

export function subscribeTyping(  
  callback: (
    key: string,
    value: any,
    options: {
      msg: string,
      subscribed_key: string,
      run_index: number
    }
  ) => void,
  objectId: string
): void {
    const workspace = getWorkspace()
    pulseclient?.subscribe(`${workspace}/typing/${objectId}/`, callback)
}

export function clearTyping(me: string, objectId: string): void {
    const workspace = getWorkspace()
    pulseclient?.delete(`${workspace}/typing/${objectId}/${me}`)
}

// export function setOnline(): void { TODO }

export function closePulseClient(): void {
    pulseclient?.close()
    pulseclient = undefined
}