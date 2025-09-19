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
import presentation from '@hcengineering/presentation'

let pulseclient: HulypulseClient | undefined

export async function createPulseClient (): Promise<HulypulseClient | undefined> {
  if (pulseclient == null) {
    const wsPulseUrl = getMetadata(presentation.metadata.PulseUrl)
    if (wsPulseUrl == null || wsPulseUrl.trim().length === 0) return undefined
    const token = getMetadata(presentation.metadata.Token)
    pulseclient = await HulypulseClient.connect(`${wsPulseUrl}?token=${token}`)
  }
  return pulseclient
}

export function closePulseClient (): void {
  pulseclient?.close()
  pulseclient = undefined
}
