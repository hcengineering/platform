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

import core, { DOMAIN_TX, type Class, type Doc, type DocumentQuery, type Ref, type Space } from '@hcengineering/core'
import {
  migrateSpace,
  tryMigrate,
  type MigrateOperation,
  type MigrationClient,
  type MigrationUpgradeClient
} from '@hcengineering/model'
import notification, {
  notificationId,
  NotificationStatus,
  type BrowserNotification,
  type DocNotifyContext
} from '@hcengineering/notification'
import { DOMAIN_PREFERENCE } from '@hcengineering/preference'
import contact, { type PersonSpace } from '@hcengineering/contact'

import { DOMAIN_DOC_NOTIFY, DOMAIN_NOTIFICATION, DOMAIN_USER_NOTIFY } from './index'
import { DOMAIN_SPACE } from '@hcengineering/model-core'

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

type OldContext = DocNotifyContext & { attachedTo: Ref<Doc>, attachedToClass: Ref<Class<Doc>> }

function toOldContext (context: DocNotifyContext): OldContext {
  return context as OldContext
}

export async function migrateContexts (client: MigrationClient): Promise<void> {
  const personSpaces = await client.find<PersonSpace>(DOMAIN_SPACE, { _class: contact.class.PersonSpace }, {})

  while (true) {
    const contexts = await client.find<DocNotifyContext>(
      DOMAIN_DOC_NOTIFY,
      {
        _class: notification.class.DocNotifyContext,
        objectSpace: { $exists: false }
      },
      { limit: 500 }
    )

    if (contexts.length === 0) {
      return
    }

    const toRemove: DocNotifyContext[] = []
    const toUnset: DocNotifyContext[] = []

    for (const context of contexts) {
      const oldContext = toOldContext(context)
      const space = personSpaces.find(({ members }) => members.includes(oldContext.user))

      if (space === undefined) {
        toRemove.push(context)
        continue
      }

      await client.update<DocNotifyContext>(
        DOMAIN_DOC_NOTIFY,
        { _id: context._id },
        {
          space: space._id,
          objectId: oldContext.attachedTo,
          objectClass: oldContext.attachedToClass,
          objectSpace: client.hierarchy.isDerived(oldContext.attachedToClass, core.class.Space)
            ? core.space.Space
            : oldContext.space
        }
      )

      toUnset.push(context)
    }

    await client.update<DocNotifyContext>(
      DOMAIN_DOC_NOTIFY,
      { _id: { $in: toUnset.map(({ _id }) => _id) } },
      {
        $unset: { attachedTo: 1, attachedToClass: 1 }
      }
    )

    await client.deleteMany(DOMAIN_DOC_NOTIFY, { _id: { $in: toRemove.map(({ _id }) => _id) } })
    await client.deleteMany(DOMAIN_NOTIFICATION, { docNotifyContext: { $in: toRemove.map(({ _id }) => _id) } })
  }
}

export async function migrateSettings (client: MigrationClient): Promise<void> {
  await client.update(
    DOMAIN_PREFERENCE,
    {
      _class: 'notification:class:NotificationSetting' as Ref<Class<Doc>>,
      attachedTo: 'notification:providers:BrowserNotification' as Ref<Doc>
    },
    {
      _class: notification.class.NotificationTypeSetting,
      attachedTo: notification.providers.PushNotificationProvider
    }
  )

  await client.update(
    DOMAIN_PREFERENCE,
    {
      _class: 'notification:class:NotificationSetting' as Ref<Class<Doc>>,
      attachedTo: 'notification:providers:PlatformNotification' as Ref<Doc>
    },
    {
      _class: notification.class.NotificationTypeSetting,
      attachedTo: notification.providers.InboxNotificationProvider
    }
  )
}

export const notificationOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await tryMigrate(client, notificationId, [
      {
        state: 'delete-hidden-notifications',
        func: async (client) => {
          await removeNotifications(client, { hidden: true })
        }
      },
      {
        state: 'delete-invalid-notifications',
        func: async (client) => {
          await removeNotifications(client, { attachedToClass: 'chunter:class:Comment' as Ref<Class<Doc>> })
        }
      },
      {
        state: 'remove-old-classes',
        func: async (client) => {
          await client.deleteMany(DOMAIN_NOTIFICATION, { _class: 'notification:class:DocUpdates' as Ref<Class<Doc>> })
          await client.deleteMany(DOMAIN_TX, { objectClass: 'notification:class:DocUpdates' as Ref<Class<Doc>> })
        }
      },
      {
        state: 'removeDeprecatedSpace',
        func: async (client: MigrationClient) => {
          await migrateSpace(client, 'notification:space:Notifications' as Ref<Space>, core.space.Workspace, [
            DOMAIN_NOTIFICATION
          ])
        }
      },
      {
        state: 'migrate-setting',
        func: migrateSettings
      },
      {
        state: 'move-doc-notify',
        func: async (client) => {
          await client.move(DOMAIN_NOTIFICATION, { _class: notification.class.DocNotifyContext }, DOMAIN_DOC_NOTIFY)
        }
      },
      {
        state: 'remove-last-view',
        func: async (client) => {
          await client.deleteMany(DOMAIN_NOTIFICATION, { _class: 'notification:class:LastView' as any })
        }
      },
      {
        state: 'remove-notification',
        func: async (client) => {
          await client.deleteMany(DOMAIN_NOTIFICATION, { _class: 'notification:class:Notification' as any })
        }
      },
      {
        state: 'remove-email-notification',
        func: async (client) => {
          await client.deleteMany(DOMAIN_NOTIFICATION, { _class: 'notification:class:EmailNotification' as any })
        }
      },
      {
        state: 'move-user',
        func: async (client) => {
          await client.move(
            DOMAIN_NOTIFICATION,
            { _class: { $in: [notification.class.BrowserNotification, notification.class.PushSubscription] } },
            DOMAIN_USER_NOTIFY
          )
        }
      },
      {
        state: 'migrate-contexts-v1',
        func: migrateContexts
      }
    ])

    await client.deleteMany<BrowserNotification>(DOMAIN_USER_NOTIFY, {
      _class: notification.class.BrowserNotification,
      status: NotificationStatus.Notified
    })
  },
  async upgrade (state: Map<string, Set<string>>, client: () => Promise<MigrationUpgradeClient>): Promise<void> {}
}
