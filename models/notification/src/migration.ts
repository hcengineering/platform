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

import { type Doc, type Ref, type Class, type DocumentQuery, DOMAIN_TX } from '@hcengineering/core'
import {
  createDefaultSpace,
  tryMigrate,
  tryUpgrade,
  type MigrateOperation,
  type MigrationClient,
  type MigrationUpgradeClient
} from '@hcengineering/model'
import notification, { notificationId, type DocNotifyContext } from '@hcengineering/notification'

import { DOMAIN_NOTIFICATION } from './index'

export async function removeNotifications (
  client: MigrationClient,
  query: DocumentQuery<DocNotifyContext>
): Promise<void> {
  while (true) {
    const contexts = await client.find<DocNotifyContext>(
      DOMAIN_NOTIFICATION,
      {
        _class: notification.class.DocNotifyContext,
        ...query
      },
      { limit: 500 }
    )

    if (contexts.length === 0) {
      return
    }

    const ids = contexts.map(({ _id }) => _id)

    await client.deleteMany(DOMAIN_NOTIFICATION, {
      _class: notification.class.CommonInboxNotification,
      docNotifyContext: { $in: ids }
    })

    await client.deleteMany(DOMAIN_NOTIFICATION, {
      _class: notification.class.ActivityInboxNotification,
      docNotifyContext: { $in: ids }
    })

    await client.deleteMany(DOMAIN_NOTIFICATION, {
      _class: notification.class.MentionInboxNotification,
      docNotifyContext: { $in: ids }
    })

    await client.deleteMany(DOMAIN_NOTIFICATION, {
      _class: notification.class.DocNotifyContext,
      _id: { $in: ids }
    })
  }
}

export const notificationOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await tryMigrate(client, notificationId, [
      {
        state: 'delete-hidden-notifications',
        func: async (client) => {
          await removeNotifications(client, { hidden: true })
        }
      }
    ])
    await tryMigrate(client, notificationId, [
      {
        state: 'delete-invalid-notifications',
        func: async (client) => {
          await removeNotifications(client, { attachedToClass: 'chunter:class:Comment' as Ref<Class<Doc>> })
        }
      }
    ])
    await tryMigrate(client, notificationId, [
      {
        state: 'remove-old-classes',
        func: async (client) => {
          await client.deleteMany(DOMAIN_NOTIFICATION, { _class: 'notification:class:DocUpdates' as Ref<Class<Doc>> })
          await client.deleteMany(DOMAIN_TX, { objectClass: 'notification:class:DocUpdates' as Ref<Class<Doc>> })
        }
      }
    ])
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    await tryUpgrade(client, notificationId, [
      {
        state: 'create-defaults-v2',
        func: async (client) => {
          await createDefaultSpace(client, notification.space.Notifications, {
            name: 'Notifications',
            description: 'Space for all notifications'
          })
        }
      }
    ])
  }
}
