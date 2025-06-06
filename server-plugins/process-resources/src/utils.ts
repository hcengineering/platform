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

import { Doc } from '@hcengineering/core'
import { getResource } from '@hcengineering/platform'
import { Execution, Transition, parseContext } from '@hcengineering/process'
import { TriggerControl } from '@hcengineering/server-core'
import serverProcess from '@hcengineering/server-process'

export async function pickTransition (
  control: TriggerControl,
  execution: Execution,
  transitions: Transition[],
  doc: Doc
): Promise<Transition | undefined> {
  for (const tr of transitions) {
    const trigger = control.modelDb.findObject(tr.trigger)
    if (trigger === undefined) continue
    if (trigger.checkFunction === undefined) return tr
    const impl = control.hierarchy.as(trigger, serverProcess.mixin.TriggerImpl)
    if (impl?.serverCheckFunc === undefined) return tr
    const filled = fillParams(tr.triggerParams, execution)
    const checkFunc = await getResource(impl.serverCheckFunc)
    if (checkFunc === undefined) continue
    const res = await checkFunc(filled, doc)
    if (res) return tr
  }
}

function fillParams (params: Record<string, any>, execution: Execution): Record<string, any> {
  const res: Record<string, any> = {}
  for (const key in params) {
    const value = params[key]
    const context = parseContext(value)
    if (context === undefined) {
      res[key] = value
      continue
    }
    if (context.type === 'context') {
      res[key] = execution.context[context.id]
    }
  }
  return res
}
