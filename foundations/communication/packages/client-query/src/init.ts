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

import { LiveQueries } from '@hcengineering/communication-query'
import type { FindClient } from '@hcengineering/communication-sdk-types'
import { type HulylakeWorkspaceClient } from '@hcengineering/hulylake-client'

export type { MessageQueryParams } from '@hcengineering/communication-query'

let lq: LiveQueries
let onDestroy: (fn: () => void) => void = () => {}

export function getLiveQueries (): LiveQueries {
  return lq
}

export function getOnDestroy (): (fn: () => void) => void {
  return onDestroy
}

export function initLiveQueries (
  client: FindClient,
  hulylake: HulylakeWorkspaceClient,
  destroyFn?: (fn: () => void) => void
): void {
  if (lq != null) {
    lq.close()
  }

  if (destroyFn != null) {
    onDestroy = destroyFn
  }

  lq = new LiveQueries(client, hulylake)
}

export async function refreshLiveQueries (): Promise<void> {
  if (lq != null) {
    await lq.refresh()
  }
}
export function closeLiveQueries (): void {
  if (lq != null) {
    lq.close()
  }
}
