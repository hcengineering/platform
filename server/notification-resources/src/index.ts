//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2022 Hardcore Engineering Inc.
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

import chunter, { Backlink } from '@anticrm/chunter'
import contact from '@anticrm/contact'
import core, { Data, Doc, generateId, Tx, TxCollectionCUD, TxCreateDoc } from '@anticrm/core'
import notification, { Notification, NotificationStatus } from '@anticrm/notification'
import type { TriggerControl } from '@anticrm/server-core'

/**
 * @public
 */
export async function OnBacklinkCreate (tx: Tx, { findAll, hierarchy, storageFx }: TriggerControl): Promise<Tx[]> {
  if (tx._class !== core.class.TxCollectionCUD) {
    return []
  }

  const ptx = tx as TxCollectionCUD<Doc, Backlink>

  if (
    ptx.tx._class !== core.class.TxCreateDoc ||
    !hierarchy.isDerived(ptx.tx.objectClass, chunter.class.Backlink) ||
    !hierarchy.isDerived(ptx.objectClass, contact.class.Employee)
  ) {
    return []
  }

  const createTx: TxCreateDoc<Notification> = {
    objectClass: notification.class.Notification,
    objectSpace: notification.space.Notifications,
    objectId: generateId(),
    modifiedOn: ptx.modifiedOn,
    modifiedBy: ptx.modifiedBy,
    space: ptx.space,
    _id: generateId(),
    _class: core.class.TxCreateDoc,
    attributes: {
      tx: ptx._id,
      status: NotificationStatus.New
    } as unknown as Data<Notification>
  }

  const result: TxCollectionCUD<Doc, Notification> = {
    ...ptx,
    _id: generateId(),
    collection: 'notifications',
    tx: createTx
  }

  return [result]
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    OnBacklinkCreate
  }
})
