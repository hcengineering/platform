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
  type AttachedDoc,
  type Class,
  type Doc,
  type DocumentQuery,
  type Hierarchy,
  type MeasureContext,
  type Obj,
  type Ref,
  type Tx,
  type TxCollectionCUD,
  type TxCreateDoc,
  TxFactory,
  matchQuery
} from '@hcengineering/core'

import { type Resource, getResource } from '@hcengineering/platform'
import type { Trigger, TriggerControl, TriggerFunc } from './types'

import serverCore from './plugin'

/**
 * @public
 */
export class Triggers {
  private readonly triggers: [DocumentQuery<Tx> | undefined, TriggerFunc, Resource<TriggerFunc>][] = []

  constructor (protected readonly hierarchy: Hierarchy) {}

  async tx (tx: Tx): Promise<void> {
    if (tx._class === core.class.TxCollectionCUD) {
      tx = (tx as TxCollectionCUD<Doc, AttachedDoc>).tx
    }
    if (tx._class === core.class.TxCreateDoc) {
      const createTx = tx as TxCreateDoc<Doc>
      if (createTx.objectClass === serverCore.class.Trigger) {
        const trigger = (createTx as TxCreateDoc<Trigger>).attributes.trigger
        const match = (createTx as TxCreateDoc<Trigger>).attributes.txMatch
        const func = await getResource(trigger)
        this.triggers.push([match, func, trigger])
      }
    }
  }

  async apply (ctx: MeasureContext, tx: Tx[], ctrl: Omit<TriggerControl, 'txFactory'>): Promise<Tx[]> {
    const result: Tx[] = []
    for (const [query, trigger, resource] of this.triggers) {
      let matches = tx
      if (query !== undefined) {
        this.addDerived(query, 'objectClass')
        this.addDerived(query, 'tx.objectClass')
        matches = matchQuery(tx, query, core.class.Tx, ctrl.hierarchy) as Tx[]
      }
      if (matches.length > 0) {
        await ctx.with(resource, {}, async (ctx) => {
          for (const tx of matches) {
            result.push(
              ...(await trigger(tx, {
                ...ctrl,
                ctx,
                txFactory: new TxFactory(tx.modifiedBy, true),
                findAll: async (clazz, query, options) => await ctrl.findAllCtx(ctx, clazz, query, options),
                apply: async (tx, broadcast, target) => {
                  return await ctrl.applyCtx(ctx, tx, broadcast, target)
                },
                result
              }))
            )
          }
        })
      }
    }
    return result
  }

  private addDerived (q: DocumentQuery<Tx>, key: string): void {
    if (q[key] === undefined) {
      return
    }
    if (typeof q[key] === 'string') {
      const descendants = this.hierarchy.getDescendants(q[key])
      q[key] = {
        $in: [...(q[key].$in ?? []), ...descendants]
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
