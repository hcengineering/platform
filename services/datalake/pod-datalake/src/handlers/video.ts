//
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
//

import { MeasureContext } from '@hcengineering/core'
import config from '../config'

interface StreamRequest {
  source: string
  format: string
  workspace: string
  metadata?: Record<string, string>
}

export async function requestHLS (ctx: MeasureContext, workspace: string, name: string): Promise<void> {
  if (config.StreamUrl === undefined) {
    return
  }
  const streamReq: StreamRequest = { format: 'hls', source: name, workspace }

  const request = new Request(config.StreamUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(streamReq)
  })

  const resp = await fetch(request)
  if (!resp.ok) {
    ctx.error(resp.statusText)
  }
}
