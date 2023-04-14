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
  TxFactory
} from '@hcengineering/core'

import { getResource } from '@hcengineering/platform'
import type { Trigger, TriggerFunc, TriggerControl } from './types'

import serverCore from './plugin'

/**
 * @public
 */
export class Triggers {
  private readonly triggers: [DocumentQuery<Tx> | undefined, TriggerFunc][] = []

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
      .filter(([query]) => query === undefined || matchQuery([tx], query, core.class.Tx, control.hierarchy).length > 0)
      .map(([, trigger]) => trigger(tx, control))
    const result = await Promise.all(derived)
    return result.flatMap((x) => x)
  }
}
