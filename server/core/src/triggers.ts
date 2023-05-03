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
  Tx,
  Doc,
  TxCreateDoc,
  Ref,
  Account,
  TxCollectionCUD,
  AttachedDoc,
  DocumentQuery,
  matchQuery,
  TxFactory,
  Hierarchy,
  Class,
  Obj
} from '@hcengineering/core'

import { getResource } from '@hcengineering/platform'
import type { Trigger, TriggerFunc, TriggerControl } from './types'

import serverCore from './plugin'

/**
 * @public
 */
export class Triggers {
  private readonly triggers: [DocumentQuery<Tx> | undefined, TriggerFunc][] = []

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
        this.triggers.push([match, func])
      }
    }
  }

  async apply (account: Ref<Account>, tx: Tx, ctrl: Omit<TriggerControl, 'txFactory'>): Promise<Tx[]> {
    const control = { ...ctrl, txFactory: new TxFactory(account, true) }
    const derived = this.triggers
      .filter(([query]) => {
        if (query === undefined) {
          return true
        }
        if (query['tx.objectClass'] !== undefined) {
          if (query['tx.objectClass'].$in !== undefined) {
            const oldIn = query['tx.objectClass'].$in
            const newIn = new Set(oldIn)
            query['tx.objectClass'].$in.forEach((element: Ref<Class<Obj>>) => {
              const descendants = this.hierarchy.getDescendants(element)
              newIn.add(descendants)
            })
            query['tx.objectClass'].$in = Array.from(newIn.values())
          } else if (query['tx.objectClass'].$nin !== undefined) {
            const oldNin = query['tx.objectClass'].$nin
            const newNin = new Set(oldNin)
            query['tx.objectClass'].$nin.forEach((element: Ref<Class<Obj>>) => {
              const descendants = this.hierarchy.getDescendants(element)
              newNin.add(descendants)
            })
            query['tx.objectClass'].$nin = Array.from(newNin.values())
          } else if (query['tx.objectClass'].$ne !== undefined) {
            const descendants = this.hierarchy.getDescendants(query['tx.objectClass'].$ne)
            delete query['tx.objectClass'].$ne
            query['tx.objectClass'].$nin = [...(query['tx.objectClass'].$nin ?? []), ...descendants]
          } else {
            const descendants = this.hierarchy.getDescendants(query['tx.objectClass'])
            query['tx.objectClass'] = {
              $in: [...(query['tx.objectClass'].$in ?? []), ...descendants]
            }
          }
        }
        return matchQuery([tx], query, core.class.Tx, control.hierarchy).length > 0
      })
      .map(([, trigger]) => trigger(tx, control))
    const result = await Promise.all(derived)
    return result.flatMap((x) => x)
  }
}
