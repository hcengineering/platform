//
// Copyright © 2026 TraceX SAS.
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

import cardPlugin from '@hcengineering/card'
import type { Card } from '@hcengineering/card'
import core, { TxFactory, TxProcessor } from '@hcengineering/core'
import type { Ref, Space, TxCreateDoc, TxCUD } from '@hcengineering/core'
import process from '@hcengineering/process'
import type { Execution, MethodParams, Process, Transition, Trigger } from '@hcengineering/process'
import type { ProcessControl } from '@hcengineering/server-process'
import { CreateCard } from '../functions'

const parentSpace = 'parent-space' as Ref<Space>
const selectedSpace = 'selected-space' as Ref<Space>

function createControl (trigger: Ref<Trigger> = process.trigger.OnExecutionStart): ProcessControl {
  const hierarchy = {
    getAllAttributes: () => new Map(),
    getAncestors: () => [cardPlugin.class.Card],
    isDerived: (_class: string, base: string) => base === cardPlugin.class.Card
  }
  const childProcess = 'child-process' as Ref<Process>
  const initialTransition = {
    _id: 'initial-transition' as Ref<Transition>,
    process: childProcess,
    from: null,
    trigger
  }
  const model = {
    findObject: () => ({ bindings: { spaceSlot: 'space' } }),
    findAllSync: (_class: string, query: Partial<Transition>) =>
      _class === process.class.Process
        ? [{ _id: childProcess }]
        : [initialTransition].filter(
            (transition) =>
              transition.process === query.process &&
              transition.from === query.from &&
              (query.trigger === undefined || transition.trigger === query.trigger)
          )
  }
  return {
    client: {
      getModel: () => model,
      getHierarchy: () => hierarchy,
      txFactory: new TxFactory(core.account.System)
    }
  } as unknown as ProcessControl
}

describe('CreateCard space', () => {
  it.each([
    { name: 'explicit space', params: { space: selectedSpace }, expectedSpace: selectedSpace },
    { name: 'required fields', params: { requiredFields: { space: selectedSpace } }, expectedSpace: selectedSpace },
    { name: 'bound attribute', params: { spaceSlot: selectedSpace }, expectedSpace: selectedSpace },
    { name: 'unspecified space', params: {}, expectedSpace: parentSpace }
  ])('uses $name for the card, child execution and rollback', async ({ params, expectedSpace }) => {
    const execution: Partial<Execution> = {
      _id: 'execution' as Ref<Execution>,
      process: 'parent-process' as Ref<Process>,
      space: parentSpace
    }
    const control = createControl()

    const cardParams: MethodParams<Card> = { _class: cardPlugin.class.Card, title: 'New card', ...params }
    const result = await CreateCard(cardParams, execution as Execution, control)

    if (!('txes' in result) || result.rollback === undefined) {
      throw new Error('Expected card creation to succeed with rollback transactions')
    }
    expect(result.txes).toHaveLength(2)
    expect(result.rollback).toHaveLength(2)
    for (const tx of [...result.txes, ...result.rollback]) {
      expect((tx as TxCUD<Card>).objectSpace).toBe(expectedSpace)
    }
    const cardTx = result.txes[0] as TxCreateDoc<Card>
    const childTx = result.txes[1] as TxCreateDoc<Execution>
    expect(cardTx.attributes).not.toHaveProperty('space')
    expect(TxProcessor.createDoc2Doc(cardTx).space).toBe(expectedSpace)
    expect(childTx.attributes.card).toBe(cardTx.objectId)
    expect(result.context).toEqual([{ _id: cardTx.objectId, value: TxProcessor.createDoc2Doc(cardTx) }])
    expect(execution.space).toBe(parentSpace)
  })
})

describe('CreateCard auto-start', () => {
  it.each([
    { name: 'execution start', trigger: process.trigger.OnExecutionStart, starts: true },
    { name: 'new version', trigger: process.trigger.OnNewVersion, starts: false },
    { name: 'effective version', trigger: process.trigger.OnVersionEffective, starts: false },
    { name: 'ineffective version', trigger: process.trigger.OnVersionIneffective, starts: false }
  ])('handles the $name trigger when a process creates a card', async ({ trigger, starts }) => {
    const execution: Partial<Execution> = {
      _id: 'execution' as Ref<Execution>,
      process: 'parent-process' as Ref<Process>,
      space: parentSpace
    }
    const control = createControl(trigger)
    const result = await CreateCard(
      { _class: cardPlugin.class.Card, title: 'New card' },
      execution as Execution,
      control
    )

    if (!('txes' in result) || result.rollback === undefined) {
      throw new Error('Expected card creation to succeed with rollback transactions')
    }
    const childTxes = result.txes.filter((tx) => (tx as TxCreateDoc<Execution>).objectClass === process.class.Execution)
    expect(childTxes).toHaveLength(starts ? 1 : 0)
    expect(result.txes).toHaveLength(starts ? 2 : 1)
    expect(result.rollback).toHaveLength(starts ? 2 : 1)
  })
})
