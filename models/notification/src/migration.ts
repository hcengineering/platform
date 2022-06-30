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

import core, { Ref, TxOperations } from '@anticrm/core'
import { MigrateOperation, MigrationClient, MigrationUpgradeClient } from '@anticrm/model'
import notification, { NotificationType } from '@anticrm/notification'
import { DOMAIN_NOTIFICATION } from '.'

async function fillNotificationText (client: MigrationClient): Promise<void> {
  await client.update(
    DOMAIN_NOTIFICATION,
    { _class: notification.class.Notification, text: { $exists: false } },
    {
      text: ''
    }
  )
}

async function fillNotificationType (client: MigrationUpgradeClient): Promise<void> {
  const notifications = await client.findAll(notification.class.Notification, { type: { $exists: false } })
  const txOp = new TxOperations(client, core.account.System)
  const promises = notifications.map(async (doc) => {
    const tx = await client.findOne(core.class.TxCUD, { _id: doc.tx })
    if (tx === undefined) return
    const type =
      tx._class === core.class.TxMixin
        ? ('calendar:ids:ReminderNotification' as Ref<NotificationType>)
        : notification.ids.MentionNotification
    return await txOp.update(doc, { type })
  })
  await Promise.all(promises)
}

export const notificationOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await fillNotificationText(client)
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    await fillNotificationType(client)
  }
}
