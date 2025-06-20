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

import core, {
  Doc,
  PersonId,
  Ref,
  Tx,
  TxCreateDoc,
  TxCUD,
  TxMixin,
  TxProcessor,
  TxUpdateDoc,
  WithLookup
} from '@hcengineering/core'

import contact, { Person, SocialIdentity, SocialIdentityRef } from '.'

function isCreateTx (tx: Tx): tx is TxCreateDoc<Doc> {
  return tx._class === core.class.TxCreateDoc
}

function isUpdateTx (tx: Tx): tx is TxUpdateDoc<Doc> {
  return tx._class === core.class.TxUpdateDoc
}

function isMixinTx (tx: Tx): tx is TxMixin<Doc, any> {
  return tx._class === core.class.TxMixin
}

function isPersonTx (tx: TxCUD<Doc>): tx is TxCUD<Person> {
  return tx.objectClass === contact.class.Person
}

function isSocialIdentityTx (tx: TxCUD<Doc>): tx is TxCUD<SocialIdentity> {
  return tx.objectClass === contact.class.SocialIdentity
}

export interface Change {
  personRef: Ref<Person>
  personIds: PersonId[]
}

export default class ContactCache {
  private static _instance: ContactCache

  /**
   * [PersonId (socialId _id) => Ref<Person>] cache
   */
  private readonly _personIdsByPersonRef = new Map<Ref<Person>, Set<PersonId>>()

  /**
   * [PersonId (socialId _id) => Ref<Person>] cache
   */
  private readonly _personRefByPersonId = new Map<PersonId, Ref<Person> | null>()

  /**
   * [PersonId (socialId _id) => Person] cache
   */
  private readonly _personByPersonId = new Map<PersonId, Person | null>()

  /**
   * [Ref<Person> => Person] cache
   */
  private readonly _personByRef = new Map<Ref<Person>, Person | null>()

  /**
   * [PersonId (socialId _id) => SocialIdentity] cache
   */
  private readonly _socialIdByPersonId = new Map<PersonId, SocialIdentity | null>()

  private readonly _changeListeners: Array<(change: Change) => void | Promise<void>> = []

  private constructor () {
    // Private constructor to prevent direct instantiation
  }

  public static get instance (): ContactCache {
    if (this._instance === undefined) {
      this._instance = new ContactCache()
    }

    return this._instance
  }

  public get personRefByPersonId (): ReadonlyMap<PersonId, Ref<Person> | null> {
    return this._personRefByPersonId
  }

  public get personByPersonId (): ReadonlyMap<PersonId, Readonly<Person> | null> {
    return this._personByPersonId

    // Alternatively, can build from two other maps but might be not as performant
    // return new Map(this._personRefByPersonId.entries().map(([personId, personRef]) => [personId, personRef != null ? this._personByRef.get(personRef) ?? null : null]))
  }

  public get personByRef (): ReadonlyMap<Ref<Person>, Readonly<Person> | null> {
    return this._personByRef
  }

  public get socialIdByPersonId (): ReadonlyMap<PersonId, Readonly<SocialIdentity> | null> {
    return this._socialIdByPersonId
  }

  private addPersonIdToPersonRef (personRef: Ref<Person>, personId: PersonId): void {
    this._personIdsByPersonRef.set(personRef, (this._personIdsByPersonRef.get(personRef) ?? new Set()).add(personId))
  }

  public fillCachesForPersonId (personId: PersonId, socialId: WithLookup<SocialIdentity> | null | undefined): void {
    if (socialId == null) {
      // Shouldn't normally be the case, if the social id with the given id is not found at all, it's weird from where the id came from.
      // So might be some garbage data in the database, so just set nulls to skip it.
      this._personRefByPersonId.set(personId, null)
      this._personByPersonId.set(personId, null)
      this._socialIdByPersonId.set(personId, null)
      return
    }

    const person = socialId.$lookup?.attachedTo

    this._personRefByPersonId.set(personId, socialId.attachedTo)
    this.addPersonIdToPersonRef(socialId.attachedTo, personId)
    this._personByPersonId.set(personId, person ?? null)
    this._socialIdByPersonId.set(personId, socialId)

    if (person != null) {
      this._personByRef.set(person._id, person)
    }
  }

  public fillCachesForPersonRef (personRef: Ref<Person>, person: WithLookup<Person> | null | undefined): void {
    this._personByRef.set(personRef, person ?? null)

    for (const sidObj of (person?.$lookup?.socialIds ?? []) as SocialIdentity[]) {
      this._personRefByPersonId.set(sidObj._id, personRef)
      this.addPersonIdToPersonRef(personRef, sidObj._id)
      this._personByPersonId.set(sidObj._id, person ?? null)
    }
  }

  private shouldHandleCreateTx (tx: Tx): tx is TxCreateDoc<Person> | TxCreateDoc<SocialIdentity> {
    return isCreateTx(tx) && (isPersonTx(tx) || isSocialIdentityTx(tx))
  }

  private shouldHandleUpdateOrMixinTx (tx: Tx): tx is TxUpdateDoc<Person> | TxMixin<Person, any> {
    return (isUpdateTx(tx) || isMixinTx(tx)) && isPersonTx(tx)
  }

  public handleTx = (txes: Tx[]): void => {
    for (const tx of txes) {
      if (this.shouldHandleCreateTx(tx)) {
        if (isPersonTx(tx)) {
          this.handleCreatePersonTx(tx)
        } else if (isSocialIdentityTx(tx)) {
          this.handleCreateSocialIdentityTx(tx)
        }
      } else if (this.shouldHandleUpdateOrMixinTx(tx)) {
        this.handleUpdateOrMixinPersonTx(tx)
      }
    }
  }

  private handleCreatePersonTx (tx: TxCreateDoc<Person>): void {
    const ref = tx.objectId
    const person = this._personByRef.get(ref)
    if (person === undefined) return

    const createdPerson = TxProcessor.createDoc2Doc(tx)
    this._personByRef.set(ref, createdPerson)
    const personIds = Array.from(this._personIdsByPersonRef.get(ref) ?? [])
    for (const personId of personIds) {
      this._personByPersonId.set(personId, createdPerson)
    }

    this.broadcastChange({
      personRef: ref,
      personIds
    })
  }

  private handleCreateSocialIdentityTx (tx: TxCreateDoc<SocialIdentity>): void {
    const personId = tx.objectId as SocialIdentityRef
    const personRef = this._personRefByPersonId.get(personId)
    if (personRef === undefined) return

    const newPersonRef = tx.attachedTo as Ref<Person>
    this._personRefByPersonId.set(personId, newPersonRef)
    this.addPersonIdToPersonRef(newPersonRef, personId)
    const createdSocialId = TxProcessor.createDoc2Doc(tx)
    this._socialIdByPersonId.set(personId, createdSocialId)

    this.broadcastChange({
      personRef: newPersonRef,
      personIds: [personId]
    })
  }

  private handleUpdateOrMixinPersonTx (tx: TxUpdateDoc<Person> | TxMixin<Person, any>): void {
    const ref = tx.objectId
    const person = this._personByRef.get(ref)
    if (person == null) return

    const updatedPerson = isUpdateTx(tx)
      ? TxProcessor.updateDoc2Doc(person, tx)
      : TxProcessor.updateMixin4Doc(person, tx)
    this._personByRef.set(ref, updatedPerson)
    const personIds = Array.from(this._personIdsByPersonRef.get(ref) ?? [])
    for (const personId of personIds) {
      this._personByPersonId.set(personId, updatedPerson)
    }

    this.broadcastChange({
      personRef: ref,
      personIds
    })
  }

  public addChangeListener (listener: (change: Change) => void | Promise<void>): void {
    this._changeListeners.push(listener)
  }

  public removeChangeListener (listener: (change: Change) => void | Promise<void>): void {
    const pos = this._changeListeners.findIndex((it) => it === listener)
    if (pos !== -1) {
      this._changeListeners.splice(pos, 1)
    }
  }

  private broadcastChange (change: Change): void {
    for (const listener of this._changeListeners) {
      void listener(change)
    }
  }
}
