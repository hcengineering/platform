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

import { derived, get, type Readable, writable } from 'svelte/store'
import { type PersonId, type Ref } from '@hcengineering/core'
import { contactCache, type ContactCacheChange, type Person } from '@hcengineering/contact'

import { getPersonRefsByPersonIds, getPersonsByPersonIds, getPersonsByPersonRefs } from './utils'

function notEmptyValue<K, V> (entry: [K, V | null | undefined]): entry is [K, V] {
  return entry[1] != null
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

  private readonly _personRefByPersonIdStoreBase = writable<Map<PersonId, Ref<Person> | null>>(new Map())
  private readonly _personRefByPersonIdStore = derived([this._personRefByPersonIdStoreBase], ([store]) => {
    return new Map(Array.from(store.entries()).filter(notEmptyValue))
  })

  private readonly _personByPersonIdStoreBase = writable<Map<PersonId, Readonly<Person> | null>>(new Map())
  private readonly _personByPersonIdStore = derived([this._personByPersonIdStoreBase], ([store]) => {
    return new Map(Array.from(store.entries()).filter(notEmptyValue))
  })

  private readonly _personByPersonRefStoreBase = writable<Map<Ref<Person>, Readonly<Person> | null>>(new Map())

  private readonly _personByPersonRefStore = derived([this._personByPersonRefStoreBase], ([store]) => {
    return new Map(Array.from(store.entries()).filter(notEmptyValue))
  })

  public getPersonRefByPersonIdStore (personIds: PersonId[]): Readable<Map<PersonId, Ref<Person>>> {
    if (personIds.length > 0) {
      const oldKeys = new Set(get(this._personRefByPersonIdStoreBase).keys())
      if (personIds.some((id) => !oldKeys.has(id))) {
        void getPersonRefsByPersonIds(personIds).then((refsByIds) => {
          this._personRefByPersonIdStoreBase.update((store) => {
            for (const [id, ref] of refsByIds) {
              store.set(id, ref)
            }

            return store
          })
        })
      }
    }

    return this._personRefByPersonIdStore
  }

  public getPersonByPersonIdStore (personIds: PersonId[]): Readable<Map<PersonId, Readonly<Person>>> {
    if (personIds.length > 0) {
      const oldKeys = new Set(get(this._personByPersonIdStoreBase).keys())
      if (personIds.some((id) => !oldKeys.has(id))) {
        void getPersonsByPersonIds(personIds).then((personsByIds) => {
          this._personByPersonIdStoreBase.update((store) => {
            for (const [id, person] of personsByIds) {
              store.set(id, person)
            }

            return store
          })
        })
      }
    }

    return this._personByPersonIdStore
  }

  public getPersonByPersonRefStore (personRefs: Array<Ref<Person>>): Readable<Map<Ref<Person>, Readonly<Person>>> {
    if (personRefs.length > 0) {
      const oldKeys = new Set(get(this._personByPersonRefStoreBase).keys())
      if (personRefs.some((ref) => !oldKeys.has(ref))) {
        void getPersonsByPersonRefs(personRefs).then((personsByRefs) => {
          this._personByPersonRefStoreBase.update((store) => {
            for (const [ref, person] of personsByRefs) {
              store.set(ref, person)
            }

            return store
          })
        })
      }
    }

    return this._personByPersonRefStore
  }

  private readonly handlePersonCacheChange = async (change: ContactCacheChange): Promise<void> => {
    const { personIds, personRef } = change

    if (personIds.length > 0) {
      this._personRefByPersonIdStoreBase.update((store) => {
        for (const id of personIds) {
          store.set(id, contactCache.personRefByPersonId.get(id) ?? null)
        }
        return store
      })
      this._personByPersonIdStoreBase.update((store) => {
        for (const id of personIds) {
          store.set(id, contactCache.personByPersonId.get(id) ?? null)
        }
        return store
      })
    }

    if (personRef != null) {
      this._personByPersonRefStoreBase.update((store) => {
        store.set(personRef, contactCache.personByRef.get(personRef) ?? null)
        return store
      })
    }
  }
}
