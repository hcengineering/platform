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

import core, { DOMAIN_TX, Ref, TxCreateDoc, TxOperations } from '@hcengineering/core'
import { MigrateOperation, MigrationClient, MigrationUpgradeClient } from '@hcengineering/model'
import notification, { Notification, NotificationType } from '@hcengineering/notification'
import { DOMAIN_NOTIFICATION } from '.'

async function fillNotificationText (client: MigrationClient): Promise<void> {
  await client.update(
    DOMAIN_NOTIFICATION,
    { _class: notification.class.Notification, text: { $exists: false } },
    {
      text: ''
    }
  )
  await client.update(
    DOMAIN_TX,
    {
      _class: core.class.TxCreateDoc,
      objectClass: notification.class.Notification,
      'attributes.text': { $exists: false }
    },
    {
      'attributes.text': ''
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
    const objectTx = txOp.update(doc, { type })
    const ctx = await client.findOne<TxCreateDoc<Notification>>(core.class.TxCreateDoc, { objectId: doc._id })
    if (ctx === undefined) return await objectTx
    const updateTx = txOp.update(ctx, { 'attributes.type': type } as any)
    return await Promise.all([objectTx, updateTx])
  })
  await Promise.all(promises)
}

async function createSpace (client: MigrationUpgradeClient): Promise<void> {
  const txop = new TxOperations(client, core.account.System)
  const currentTemplate = await txop.findOne(core.class.Space, {
    _id: notification.space.Notifications
  })
  if (currentTemplate === undefined) {
    await txop.createDoc(
      core.class.Space,
      core.space.Space,
      {
        name: 'Notification space',
        description: 'Notification space',
        private: false,
        archived: false,
        members: []
      },
      notification.space.Notifications
    )
  }
}

export const notificationOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await fillNotificationText(client)
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    await createSpace(client)
    await fillNotificationType(client)
  }
}
