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
import { Account, Class, Doc, Mixin, Ref, Tx, TxCUD } from '@hcengineering/core'
import { NotificationType, NotificationContent } from '@hcengineering/notification'
import { Plugin, Resource, plugin } from '@hcengineering/platform'
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

/**
 * @public
 */
export default plugin(serverNotificationId, {
  mixin: {
    HTMLPresenter: '' as Ref<Mixin<HTMLPresenter>>,
    TextPresenter: '' as Ref<Mixin<TextPresenter>>,
    TypeMatch: '' as Ref<Mixin<TypeMatch>>,
    NotificationPresenter: '' as Ref<Mixin<NotificationPresenter>>
  },
  trigger: {
    OnBacklinkCreate: '' as Resource<TriggerFunc>,
    CollaboratorDocHandler: '' as Resource<TriggerFunc>,
    OnAttributeCreate: '' as Resource<TriggerFunc>,
    OnAttributeUpdate: '' as Resource<TriggerFunc>
  },
  function: {
    IsUserInFieldValue: '' as TypeMatchFunc,
    IsUserEmployeeInFieldValue: '' as TypeMatchFunc
  }
})
