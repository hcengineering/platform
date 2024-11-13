//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import core, {
  TxFactory,
  TxProcessor,
  generateId,
  groupByArray,
  matchQuery,
  type Class,
  type Doc,
  type DocumentQuery,
  type Hierarchy,
  type MeasureContext,
  type ModelDb,
  type Obj,
  type Ref,
  type Tx,
  type TxCreateDoc,
  type WithLookup
} from '@hcengineering/core'

import { Analytics } from '@hcengineering/analytics'
import { getResource, type Resource } from '@hcengineering/platform'
import type { Trigger, TriggerControl, TriggerFunc } from './types'

import serverCore from './plugin'

interface TriggerRecord {
  query?: DocumentQuery<Tx>
  trigger: { op: TriggerFunc | Promise<TriggerFunc>, resource: Resource<TriggerFunc>, isAsync: boolean }
}
/**
 * @public
 */
export class Triggers {
  private readonly triggers: TriggerRecord[] = []

  constructor (protected readonly hierarchy: Hierarchy) {}

  init (model: ModelDb): void {
    const allTriggers = model.findAllSync(serverCore.class.Trigger, {})
    for (const t of allTriggers) {
      this.addTrigger(t)
    }
  }

  private addTrigger (t: WithLookup<Trigger>): void {
    const match = t.txMatch

    const trigger = t.trigger
    const func = getResource(trigger)
    const isAsync = t.isAsync === true
    this.triggers.push({
      query: match,
      trigger: { op: func, resource: trigger, isAsync }
    })
  }

  tresolve = Promise.resolve()
  tx (txes: Tx[]): Promise<void> {
    for (const tx of txes) {
      if (tx._class === core.class.TxCreateDoc) {
        const createTx = tx as TxCreateDoc<Doc>
        if (createTx.objectClass === serverCore.class.Trigger) {
          const trigger = TxProcessor.createDoc2Doc(createTx as TxCreateDoc<Trigger>)
          this.addTrigger(trigger)
        }
      }
    }
    return this.tresolve
  }

  async applyTrigger (
    ctx: MeasureContext,
    ctrl: Omit<TriggerControl, 'txFactory'>,
    matches: Tx[],
    { trigger }: TriggerRecord
  ): Promise<Tx[]> {
    const result: Tx[] = []
    const apply: Tx[] = []
    const group = groupByArray(matches, (it) => it.modifiedBy)

    const tctrl: TriggerControl = {
      ...ctrl,
      ctx,
      txFactory: null as any, // Will be set later
      apply: (ctx, tx, needResult) => {
        if (needResult !== true) {
          apply.push(...tx)
        }
        ctrl.txes.push(...tx) // We need to put them so other triggers could check if similar operation is already performed.
        return ctrl.apply(ctx, tx, needResult)
      }
    }
    if (trigger.op instanceof Promise) {
      trigger.op = await trigger.op
    }
    for (const [k, v] of group.entries()) {
      tctrl.txFactory = new TxFactory(k, true)
      try {
        const tresult = await trigger.op(v, tctrl)
        result.push(...tresult)
        ctrl.txes.push(...tresult)
      } catch (err: any) {
        ctx.error('failed to process trigger', { trigger: trigger.resource, err })
        Analytics.handleError(err)
      }
    }
    return result.concat(apply)
  }

  async apply (
    ctx: MeasureContext,
    tx: Tx[],
    ctrl: Omit<TriggerControl, 'txFactory'>,
    mode: 'sync' | 'async'
  ): Promise<Tx[]> {
    const result: Tx[] = []
    for (const { query, trigger } of this.triggers) {
      if ((trigger.isAsync ? 'async' : 'sync') !== mode) {
        continue
      }
      let matches = tx
      if (query !== undefined) {
        this.addDerived(query, 'objectClass')
        this.addDerived(query, 'tx.objectClass')
        matches = matchQuery(tx, query, core.class.Tx, ctrl.hierarchy) as Tx[]
      }
      if (matches.length > 0) {
        await ctx.with(
          trigger.resource,
          {},
          async (ctx) => {
            if (mode === 'async') {
              ctx.id = generateId()
            }
            const tresult = await this.applyTrigger(ctx, ctrl, matches, { trigger })
            result.push(...tresult)
            if (ctx.onEnd !== undefined && mode === 'async') {
              await ctx.onEnd(ctx)
            }
          },
          { count: matches.length }
        )
      }
    }

    return result
  }

  private addDerived (q: DocumentQuery<Tx>, key: string): void {
    if (q[key] === undefined) {
      return
    }
    if (typeof q[key] === 'string') {
      const descendants = this.hierarchy.getDescendants(q[key] as Ref<Class<Doc>>)
      q[key] = {
        $in: [q[key] as Ref<Class<Doc>>, ...descendants]
      }
    } else {
      if (Array.isArray(q[key].$in)) {
        const oldIn = q[key].$in
        const newIn = new Set(oldIn)
        q[key].$in.forEach((element: Ref<Class<Obj>>) => {
          const descendants = this.hierarchy.getDescendants(element)
          descendants.forEach((d) => newIn.add(d))
        })
        q[key].$in = Array.from(newIn.values())
      }
      if (Array.isArray(q[key].$nin)) {
        const oldNin = q[key].$nin
        const newNin = new Set(oldNin)
        q[key].$nin.forEach((element: Ref<Class<Obj>>) => {
          const descendants = this.hierarchy.getDescendants(element)
          descendants.forEach((d) => newNin.add(d))
        })
        q[key].$nin = Array.from(newNin.values())
      }
      if (q[key].$ne !== undefined) {
        const descendants = this.hierarchy.getDescendants(q[key].$ne)
        delete q[key].$ne
        q[key].$nin = [...(q[key].$nin ?? []), ...descendants]
      }
    }
  }
}
