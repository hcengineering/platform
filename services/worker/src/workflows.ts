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

import type { Ref, WorkspaceUuid } from '@hcengineering/core'
import type { Execution } from '@hcengineering/process'
import { defineSignal, proxyActivities, setHandler, sleep } from '@temporalio/workflow'
import activities from './activities'

const { SendTimeEvent } = proxyActivities<typeof activities>({
  startToCloseTimeout: '10 minute'
})

const setDate = defineSignal<[number]>('setDate')

export async function processTimeWorkflow (
  _targetDate: number,
  ws: WorkspaceUuid,
  _execution: Ref<Execution>
): Promise<void> {
  let targetDate: number = _targetDate
  let currentPromise: Promise<void> | undefined

  while (true) {
    const when = new Date(targetDate).getTime()
    const delay = when - Date.now()

    if (delay > 0) {
      currentPromise = sleep(delay)
      try {
        await Promise.race([
          currentPromise,
          new Promise((resolve, reject) => {
            setHandler(setDate, (newDate) => {
              targetDate = newDate
              reject(new Error('Date updated'))
            })
          })
        ])
      } catch (error: any) {
        if (error instanceof Error && error.message === 'Date updated') {
          continue
        }
        throw error
      }
    }

    await SendTimeEvent(ws, _execution)
    break
  }
}
