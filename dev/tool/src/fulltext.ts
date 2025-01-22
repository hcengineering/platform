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

import { type MeasureContext } from '@hcengineering/core'

export async function reindexWorkspace (ctx: MeasureContext, fulltextUrl: string, token: string): Promise<void> {
  try {
    const res = await fetch(fulltextUrl + '/api/v1/reindex', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token })
    })
    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status} ${res.statusText}`)
    }
  } catch (err: any) {
    ctx.error('failed to reset index', { err })
  }
}
