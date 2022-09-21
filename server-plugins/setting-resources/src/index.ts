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

import core, {
  Account,
  Data,
  Doc,
  generateId,
  Ref,
  Tx,
  TxCollectionCUD,
  TxCreateDoc,
  TxUpdateDoc
} from '@hcengineering/core'
import type { TriggerControl } from '@hcengineering/server-core'
import setting, { Integration } from '@hcengineering/setting'
import contact, { EmployeeAccount } from '@hcengineering/contact'
import notification, { Notification, NotificationStatus } from '@hcengineering/notification'

/**
 * @public
 */
export async function OnIntegrationDisable (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  if (!control.hierarchy.isDerived(tx._class, core.class.TxUpdateDoc)) return []
  const ctx = tx as TxUpdateDoc<Integration>
  if (!control.hierarchy.isDerived(ctx.objectClass, setting.class.Integration)) return []
  if (ctx.operations.disabled === true) {
    const account = (
      await control.modelDb.findAll(core.class.Account, { _id: ctx.objectSpace as string as Ref<Account> })
    )[0]
    if (account === undefined) return []
    const employeeRef = (account as EmployeeAccount).employee
    if (employeeRef === undefined) return []

    const createTx: TxCreateDoc<Notification> = {
      objectClass: notification.class.Notification,
      objectSpace: notification.space.Notifications,
      objectId: generateId(),
      modifiedOn: ctx.modifiedOn,
      modifiedBy: ctx.modifiedBy,
      space: ctx.space,
      _id: generateId(),
      _class: core.class.TxCreateDoc,
      attributes: {
        tx: ctx._id,
        status: NotificationStatus.New
      } as unknown as Data<Notification>
    }

    const createNotificationTx: TxCollectionCUD<Doc, Notification> = {
      objectId: employeeRef,
      objectClass: contact.class.Employee,
      objectSpace: contact.space.Employee,
      modifiedOn: ctx.modifiedOn,
      space: core.space.Tx,
      _class: core.class.TxCollectionCUD,
      modifiedBy: ctx.modifiedBy,
      _id: generateId(),
      collection: 'notifications',
      tx: createTx
    }
    return [createNotificationTx]
  }
  return []
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    OnIntegrationDisable
  }
})
