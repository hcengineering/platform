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

import { type Readable, type Writable, writable } from 'svelte/store'
import { type PersonId, type Ref } from '@hcengineering/core'
import { contactCache, type ContactCacheChange, type Person } from '@hcengineering/contact'

import { getPersonRefsByPersonIds, getPersonsByPersonIds, getPersonsByPersonRefs } from './utils'

enum PersonStoreType {
  PersonRefByPersonId = 'prpi',
  PersonByPersonId = 'pepi',
  PersonByPersonRef = 'pepr',
}

export default class ContactCacheStoreManager {
  private static _instance: ContactCacheStoreManager

  private constructor () {
    contactCache.addChangeListener(this.handlePersonCacheChange)
  }

  public cleanup (): void {
    contactCache.removeChangeListener(this.handlePersonCacheChange)
  }

  public static get instance (): ContactCacheStoreManager {
    if (this._instance === undefined) {
      this._instance = new ContactCacheStoreManager()
    }

    return this._instance
  }

  private readonly _idToStoresKeys = new Map<string, string[]>()
  private readonly _personRefByPersonIdStores = new Map<string, Writable<Map<PersonId, Ref<Person>>>>()
  private readonly _personByPersonIdStores = new Map<string, Writable<Map<PersonId, Readonly<Person>>>>()
  private readonly _personByPersonRefStores = new Map<string, Writable<Map<Ref<Person>, Readonly<Person>>>>()

  public getPersonRefByPersonIdStore (personIds: PersonId[]): Readable<Map<PersonId, Ref<Person>>> {
    const key = this.getStoreKey(personIds, PersonStoreType.PersonRefByPersonId)
    if (!this._personRefByPersonIdStores.has(key)) {
      const store = writable<Map<PersonId, Ref<Person>>>(new Map(), (set) => {
        // Init
        void getPersonRefsByPersonIds(personIds).then((refsByIds) => {
          set(refsByIds)
        })

        return () => {
          // Cleanup
          this._personRefByPersonIdStores.delete(key)
          const ids = this.parseStoreKey(key)
          for (const id of ids) {
            const storesKeys = this._idToStoresKeys.get(id)
            if (storesKeys === undefined) {
              continue
            }
            const reducedKeys = storesKeys.filter((k) => k !== key)
            this._idToStoresKeys.set(id, reducedKeys)
          }
        }
      })

      this._personRefByPersonIdStores.set(key, store)

      for (const pid of personIds) {
        const storesKeys = this._idToStoresKeys.get(pid) ?? []
        storesKeys.push(key)

        this._idToStoresKeys.set(pid, storesKeys)
      }
    }

    return this._personRefByPersonIdStores.get(key) as Readable<Map<PersonId, Ref<Person>>>
  }

  public getPersonByPersonIdStore (personIds: PersonId[]): Readable<Map<PersonId, Readonly<Person>>> {
    const key = this.getStoreKey(personIds, PersonStoreType.PersonByPersonId)
    if (!this._personByPersonIdStores.has(key)) {
      const store = writable<Map<PersonId, Readonly<Person>>>(new Map(), (set) => {
        // Init
        void getPersonsByPersonIds(personIds).then((personsByIds) => {
          set(personsByIds)
        })

        return () => {
          // Cleanup
          this._personByPersonIdStores.delete(key)
          const ids = this.parseStoreKey(key)
          for (const id of ids) {
            const storesKeys = this._idToStoresKeys.get(id)
            if (storesKeys === undefined) {
              continue
            }
            const reducedKeys = storesKeys.filter((k) => k !== key)
            this._idToStoresKeys.set(id, reducedKeys)
          }
        }
      })

      this._personByPersonIdStores.set(key, store)

      for (const pid of personIds) {
        const storesKeys = this._idToStoresKeys.get(pid) ?? []
        storesKeys.push(key)

        this._idToStoresKeys.set(pid, storesKeys)
      }
    }

    return this._personByPersonIdStores.get(key) as Readable<Map<PersonId, Readonly<Person>>>
  }

  public getPersonByPersonRefStore (personRefs: Array<Ref<Person>>): Readable<Map<Ref<Person>, Readonly<Person>>> {
    const key = this.getStoreKey(personRefs, PersonStoreType.PersonByPersonRef)
    if (!this._personByPersonRefStores.has(key)) {
      const store = writable<Map<Ref<Person>, Readonly<Person>>>(new Map(), (set) => {
        // Init
        void getPersonsByPersonRefs(personRefs).then((personsByRefs) => {
          set(personsByRefs)
        })

        return () => {
          // Cleanup
          this._personByPersonRefStores.delete(key)
          const ids = this.parseStoreKey(key)
          for (const id of ids) {
            const storesKeys = this._idToStoresKeys.get(id)
            if (storesKeys === undefined) {
              continue
            }
            const reducedKeys = storesKeys.filter((k) => k !== key)
            this._idToStoresKeys.set(id, reducedKeys)
          }
        }
      })

      this._personByPersonRefStores.set(key, store)

      for (const pRef of personRefs) {
        const storesKeys = this._idToStoresKeys.get(pRef) ?? []
        storesKeys.push(key)

        this._idToStoresKeys.set(pRef, storesKeys)
      }
    }

    return this._personByPersonRefStores.get(key) as Readable<Map<Ref<Person>, Readonly<Person>>>
  }

  private getStoreKey (ids: string[], type: PersonStoreType): string {
    return `${type}:${ids.sort().join(',')}`
  }

  private parseStoreKey (key: string): string[] {
    return key.split(':', 2)[1].split(',')
  }

  private readonly handlePersonCacheChange = async (change: ContactCacheChange): Promise<void> => {
    for (const id of change.personIds) {
      const storesKeys = this._idToStoresKeys.get(id)
      if (storesKeys === undefined) {
        continue
      }

      for (const key of storesKeys) {
        const prpiStore = this._personRefByPersonIdStores.get(key)
        if (prpiStore !== undefined) {
          const ids = this.parseStoreKey(key) as PersonId[]
          if (ids.length === 0) {
            continue
          }

          const newValue = await getPersonRefsByPersonIds(ids)
          prpiStore.set(newValue)
        }

        const pepiStore = this._personByPersonIdStores.get(key)
        if (pepiStore !== undefined) {
          const ids = this.parseStoreKey(key) as PersonId[]
          if (ids.length === 0) {
            continue
          }

          const newValue = await getPersonsByPersonIds(ids)
          pepiStore.set(newValue)
        }

        const peprStore = this._personByPersonRefStores.get(key)
        if (peprStore !== undefined) {
          const refs = this.parseStoreKey(key) as Array<Ref<Person>>
          if (refs.length === 0) {
            continue
          }

          const newValue = await getPersonsByPersonRefs(refs)
          peprStore.set(newValue)
        }
      }
    }
  }
}
