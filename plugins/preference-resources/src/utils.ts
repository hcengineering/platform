//
// Copyright © 2022 Hardcore Engineering Inc.
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

import core, { Class, Data, Doc, DocumentUpdate, Ref, TxOperations } from '@anticrm/core'
import preference, { Preference, PreferenceClient } from '@anticrm/preference'
import { createQuery, getClient } from '@anticrm/presentation'
import { writable, Writable } from 'svelte/store'

/**
 * @public
 */
export class PreferenceClientImpl implements PreferenceClient {
  protected static _instance: PreferenceClientImpl | undefined = undefined
  private readonly preferences = new Map<Ref<Doc>, Preference>()
  private readonly preferencesStore = writable(new Map<Ref<Doc>, Preference>())
  private readonly client: TxOperations
  private readonly preferencesQuery = createQuery()

  private constructor () {
    this.client = getClient()
    this.preferencesQuery.query(preference.class.Preference, { }, (result) => {
      this.preferences.clear()
      result.forEach((p) => {
        this.preferences.set(p.attachedTo, p)
      })
      this.preferencesStore.set(this.preferences)
    })
  }

  static getClient (): PreferenceClientImpl {
    if (PreferenceClientImpl._instance === undefined) {
      PreferenceClientImpl._instance = new PreferenceClientImpl()
    }
    return PreferenceClientImpl._instance
  }

  getPreferences (): Writable<Map<Ref<Doc>, Preference>> {
    this.preferencesStore
    return this.preferencesStore
  }

  get (_id: Ref<Doc>): Preference | undefined {
    return this.preferences.get(_id)
  }

  async update<T extends Preference> (doc: T, operations: DocumentUpdate<T>): Promise<void> {
    const tx = this.client.txFactory.createTxUpdateDoc(doc._class, doc.space, doc._id, operations)
    tx.space = core.space.DerivedTx
    await this.client.tx(tx)
  }

  async set<T extends Preference> (_class: Ref<Class<T>>, _id: Ref<Doc>, data: Omit<Data<T>, 'attachedTo'>): Promise<void> {
    const current = this.preferences.get(_id)
    if (current !== undefined) {
      await this.update(current, data)
    } else {
      const tx = this.client.txFactory.createTxCreateDoc(_class, preference.space.Preference, {
        ...data,
        attachedTo: _id
      } as Data<T>)
      tx.space = core.space.DerivedTx
      await this.client.tx(tx)
    }
  }

  async unset (_id: Ref<Doc>): Promise<void> {
    const current = this.preferences.get(_id)
    if (current === undefined) return
    const tx = this.client.txFactory.createTxRemoveDoc(current._class, current.space, current._id)
    tx.space = core.space.DerivedTx
    await this.client.tx(tx)
  }
}
