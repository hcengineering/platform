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

import type { Tx, Doc, TxCreateDoc, Ref, Account, Hierarchy, TxCollectionCUD, AttachedDoc } from '@anticrm/core'
import core, { TxFactory } from '@anticrm/core'

import { getResource } from '@anticrm/platform'
import type { Trigger, TriggerFunc, FindAll } from './types'

import serverCore from './plugin'

/**
 * @public
 */
export class Triggers {
  private readonly triggers: TriggerFunc[] = []

  async tx (tx: Tx): Promise<void> {
    if (tx._class === core.class.TxCollectionCUD) {
      tx = (tx as TxCollectionCUD<Doc, AttachedDoc>).tx
    }
    if (tx._class === core.class.TxCreateDoc) {
      const createTx = tx as TxCreateDoc<Doc>
      if (createTx.objectClass === serverCore.class.Trigger) {
        const trigger = (createTx as TxCreateDoc<Trigger>).attributes.trigger
        const func = await getResource(trigger)
        this.triggers.push(func)
      }
    }
  }

  async apply (account: Ref<Account>, tx: Tx, findAll: FindAll<Doc>, hierarchy: Hierarchy): Promise<Tx[]> {
    const derived = this.triggers.map((trigger) => trigger(tx, new TxFactory(account), findAll, hierarchy))
    const result = await Promise.all(derived)
    return result.flatMap((x) => x)
  }
}
