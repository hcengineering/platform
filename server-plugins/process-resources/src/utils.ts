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

import { Doc, getObjectValue } from '@hcengineering/core'
import card from '@hcengineering/card'
import { getEmbeddedLabel, getResource } from '@hcengineering/platform'
import process, { Execution, SelectedContext, Transition, parseContext, processError } from '@hcengineering/process'
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
    const res = await checkFunc(filled, doc, control.hierarchy)
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

export async function getAttributeValue (
  control: TriggerControl,
  execution: Execution,
  context: SelectedContext
): Promise<any> {
  const cardValue = await control.findAll(control.ctx, card.class.Card, { _id: execution.card }, { limit: 1 })
  if (cardValue.length > 0) {
    const val = getObjectValue(context.key, cardValue[0])
    if (val == null) {
      const attr = control.hierarchy.findAttribute(cardValue[0]._class, context.key)
      throw processError(
        process.error.EmptyAttributeContextValue,
        {},
        { attr: attr?.label ?? getEmbeddedLabel(context.key) }
      )
    }
    return val
  } else {
    throw processError(process.error.ObjectNotFound, { _id: execution.card }, {}, true)
  }
}
