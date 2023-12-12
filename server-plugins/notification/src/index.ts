//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2022, 2023 Hardcore Engineering Inc.
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

import contact, { Employee, Person, PersonAccount } from '@hcengineering/contact'
import core, {
  Account,
  AttachedDoc,
  Class,
  Doc,
  Mixin,
  Ref,
  SortingOrder,
  Tx,
  TxCUD,
  TxCollectionCUD,
  TxUpdateDoc,
  TxMixin
} from '@hcengineering/core'
import { NotificationContent, NotificationType } from '@hcengineering/notification'
import { Metadata, Plugin, Resource, plugin } from '@hcengineering/platform'
import type { TriggerControl, TriggerFunc } from '@hcengineering/server-core'

/**
 * @public
 */
export const serverNotificationId = 'server-notification' as Plugin

/**
 * @public
 */
export async function getPersonAccount (
  person: Ref<Person>,
  control: TriggerControl
): Promise<PersonAccount | undefined> {
  const account = (
    await control.modelDb.findAll(
      contact.class.PersonAccount,
      {
        person
      },
      { limit: 1 }
    )
  )[0]
  return account
}

/**
 * @public
 */
export async function getPersonAccountById (
  _id: Ref<Account>,
  control: TriggerControl
): Promise<PersonAccount | undefined> {
  const account = (
    await control.modelDb.findAll(
      contact.class.PersonAccount,
      {
        _id: _id as Ref<PersonAccount>
      },
      { limit: 1 }
    )
  )[0]
  return account
}

/**
 * @public
 */
export async function getEmployee (employee: Ref<Employee>, control: TriggerControl): Promise<Employee | undefined> {
  const account = (
    await control.findAll(
      contact.mixin.Employee,
      {
        _id: employee
      },
      { limit: 1 }
    )
  )[0]
  return account !== undefined ? control.hierarchy.as(account, contact.mixin.Employee) : undefined
}

export async function getAllObjectTransactions (
  control: Pick<TriggerControl, 'hierarchy' | 'findAll'>,
  _class: Ref<Class<Doc>>,
  docs: Ref<Doc>[],
  mixin?: Ref<Mixin<Doc>>
): Promise<DocObjectCache['transactions']> {
  const cache: DocObjectCache['transactions'] = new Map()
  const hierarchy = control.hierarchy
  const isAttached = hierarchy.isDerived(_class, core.class.AttachedDoc)

  const ownTxes = await control.findAll<TxCUD<Doc>>(
    isAttached ? core.class.TxCollectionCUD : core.class.TxCUD,
    isAttached
      ? { 'tx.objectId': { $in: docs as Ref<AttachedDoc>[] } }
      : {
          objectId: { $in: docs },
          _class: {
            $in: [core.class.TxCreateDoc, core.class.TxUpdateDoc, core.class.TxRemoveDoc, core.class.TxMixin]
          }
        },
    { sort: { modifiedOn: SortingOrder.Ascending } }
  )

  for (const tx of ownTxes) {
    const id = isAttached ? (tx as TxCollectionCUD<Doc, AttachedDoc>).tx.objectId : tx.objectId
    cache.set(id, [...(cache.get(id) ?? []), tx])
  }

  const collectionTxes = await control.findAll<TxCollectionCUD<Doc, AttachedDoc>>(
    core.class.TxCollectionCUD,
    {
      objectId: { $in: docs },
      'tx._class': { $in: [core.class.TxCreateDoc, core.class.TxUpdateDoc, core.class.TxRemoveDoc] }
    },
    { sort: { modifiedOn: SortingOrder.Ascending } }
  )

  for (const tx of collectionTxes) {
    const id = tx.objectId
    cache.set(id, [...(cache.get(id) ?? []), tx])
  }

  const mixinTxes = isAttached
    ? await control.findAll<TxMixin<Doc, Doc>>(
      core.class.TxMixin,
      {
        objectId: { $in: docs },
        ...(mixin !== undefined ? { mixin } : {})
      },
      { sort: { modifiedOn: SortingOrder.Ascending } }
    )
    : []

  for (const tx of mixinTxes) {
    const id = tx.objectId
    cache.set(id, [...(cache.get(id) ?? []), tx])
  }

  const moveCollection = await control.findAll<TxCollectionCUD<Doc, AttachedDoc>>(
    core.class.TxCollectionCUD,
    {
      'tx.operations.attachedTo': { $in: docs },
      'tx._class': core.class.TxUpdateDoc
    },
    { sort: { modifiedOn: SortingOrder.Ascending } }
  )

  for (const tx of moveCollection) {
    const id = ((tx as TxCollectionCUD<Doc, AttachedDoc>).tx as TxUpdateDoc<AttachedDoc>).operations
      .attachedTo as Ref<Doc>
    cache.set(id, [...(cache.get(id) ?? []), tx])
  }

  for (const d of docs) {
    cache.set(
      d,
      (cache.get(d) ?? [])
        .sort((a, b) => a.modifiedOn - b.modifiedOn)
        .filter((it, idx, arr) => arr.findIndex((q) => q._id === it._id) === idx)
    )
  }

  return cache
}

/**
 * @public
 */
export type Presenter = (doc: Doc, control: TriggerControl) => Promise<string>

/**
 * @public
 */
export interface HTMLPresenter extends Class<Doc> {
  presenter: Resource<Presenter>
}

/**
 * @public
 */
export interface TextPresenter extends Class<Doc> {
  presenter: Resource<Presenter>
}

/**
 * @public
 */
export type TypeMatchFunc = Resource<
(tx: Tx, doc: Doc, user: Ref<Account>, type: NotificationType, control: TriggerControl) => Promise<boolean>
>

/**
 * @public
 */
export interface TypeMatch extends NotificationType {
  func: TypeMatchFunc
}

/**
 * @public
 */
export type NotificationContentProvider = (
  doc: Doc,
  tx: TxCUD<Doc>,
  target: Ref<Account>,
  control: TriggerControl
) => Promise<NotificationContent>

/**
 * @public
 */
export interface NotificationPresenter extends Class<Doc> {
  presenter: Resource<NotificationContentProvider>
}

export interface DocObjectCache {
  docs: Map<Ref<Doc>, Doc | null>
  transactions: Map<Ref<Doc>, TxCUD<Doc>[]>
}

/**
 * @public
 */
export default plugin(serverNotificationId, {
  metadata: {
    SesUrl: '' as Metadata<string>
  },
  mixin: {
    HTMLPresenter: '' as Ref<Mixin<HTMLPresenter>>,
    TextPresenter: '' as Ref<Mixin<TextPresenter>>,
    TypeMatch: '' as Ref<Mixin<TypeMatch>>,
    NotificationPresenter: '' as Ref<Mixin<NotificationPresenter>>
  },
  trigger: {
    OnBacklinkCreate: '' as Resource<TriggerFunc>,
    NotificationMessagesHandler: '' as Resource<TriggerFunc>,
    OnAttributeCreate: '' as Resource<TriggerFunc>,
    OnAttributeUpdate: '' as Resource<TriggerFunc>,
    OnReactionChanged: '' as Resource<TriggerFunc>,
    OnChatMessageSent: '' as Resource<TriggerFunc>
  },
  function: {
    IsUserInFieldValue: '' as TypeMatchFunc,
    IsUserEmployeeInFieldValue: '' as TypeMatchFunc
  }
})
