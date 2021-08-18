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

import type { Doc, Tx, TxCreateDoc, TxFactory, Ref, Class } from '@anticrm/core'
import type { Resource, Plugin } from '@anticrm/platform'
import { getResource, plugin } from '@anticrm/platform'

import core from '@anticrm/core'

/**
 * @public
 */
export type TriggerFunc = (tx: Tx, txFactory: TxFactory) => Promise<Tx[]>

/**
  * @public
  */
export interface Trigger extends Doc {
  trigger: Resource<TriggerFunc>
}

/**
 * @public
 */
export class Triggers {
  private readonly triggers: TriggerFunc[] = []

  constructor (private readonly txFactory: TxFactory) {

  }

  async tx (tx: Tx): Promise<void> {
    if (tx._class === core.class.TxCreateDoc) {
      const createTx = tx as TxCreateDoc<Doc>
      if (createTx.objectClass === serverCore.class.Trigger) {
        const trigger = (createTx as TxCreateDoc<Trigger>).attributes.trigger
        const func = await getResource(trigger)
        this.triggers.push(func)
      }
    }
  }

  async apply (tx: Tx): Promise<Tx[]> {
    const derived = this.triggers.map(trigger => trigger(tx, this.txFactory))
    const result = await Promise.all(derived)
    return result.flatMap(x => x)
  }
}

/**
 * @public
 */
export const serverCoreId = 'server-core' as Plugin

/**
 * @public
 */
const serverCore = plugin(serverCoreId, {
  class: {
    Trigger: '' as Ref<Class<Trigger>>
  }
})

export default serverCore
