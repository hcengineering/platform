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

import chunter from '@hcengineering/chunter'
import contact, { type PersonSpace } from '@hcengineering/contact'
import core, { DOMAIN_TX, MeasureMetricsContext, type Class, type Doc, type DocumentQuery, type Ref, type Space } from '@hcengineering/core'
import {
  migrateSpace,
  type MigrateUpdate,
  type MigrationDocumentQuery,
  tryMigrate,
  type MigrateOperation,
  type MigrationClient,
  type MigrationUpgradeClient
} from '@hcengineering/model'
import notification, {
  notificationId,
  type BrowserNotification,
  type DocNotifyContext,
  type InboxNotification,
  type PushSubscription
} from '@hcengineering/notification'
import { DOMAIN_PREFERENCE } from '@hcengineering/preference'

import { DOMAIN_SPACE, getSocialIdByOldAccount } from '@hcengineering/model-core'
import { DOMAIN_DOC_NOTIFY, DOMAIN_NOTIFICATION, DOMAIN_USER_NOTIFY } from './index'

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

export async function migrateNotificationsSpace (client: MigrationClient): Promise<void> {
  const personSpaces = await client.find<PersonSpace>(DOMAIN_SPACE, { _class: contact.class.PersonSpace }, {})

  await client.update(
    DOMAIN_DOC_NOTIFY,
    {
      _class: notification.class.DocNotifyContext,
      objectSpace: { $exists: false }
    },
    { $rename: { space: 'objectSpace' } }
  )

  for (const space of personSpaces) {
    await client.update(
      DOMAIN_DOC_NOTIFY,
      {
        _class: notification.class.DocNotifyContext,
        user: { $in: space.members }
      },
      { space: space._id }
    )
    await client.update(
      DOMAIN_NOTIFICATION,
      {
        _class: notification.class.ActivityInboxNotification,
        user: { $in: space.members }
      },
      { space: space._id }
    )
    await client.update(
      DOMAIN_NOTIFICATION,
      {
        _class: notification.class.CommonInboxNotification,
        user: { $in: space.members }
      },
      { space: space._id }
    )
    await client.update(
      DOMAIN_NOTIFICATION,
      {
        _class: notification.class.MentionInboxNotification,
        user: { $in: space.members }
      },
      { space: space._id }
    )
  }

  await client.deleteMany(DOMAIN_DOC_NOTIFY, { space: { $nin: personSpaces.map(({ _id }) => _id) } })
  await client.deleteMany(DOMAIN_NOTIFICATION, {
    _class: notification.class.ActivityInboxNotification,
    space: { $nin: personSpaces.map(({ _id }) => _id) }
  })
  await client.deleteMany(DOMAIN_NOTIFICATION, {
    _class: notification.class.CommonInboxNotification,
    space: { $nin: personSpaces.map(({ _id }) => _id) }
  })
  await client.deleteMany(DOMAIN_NOTIFICATION, {
    _class: notification.class.MentionInboxNotification,
    space: { $nin: personSpaces.map(({ _id }) => _id) }
  })

  while (true) {
    const contexts = await client.find<DocNotifyContext>(
      DOMAIN_DOC_NOTIFY,
      {
        _class: notification.class.DocNotifyContext,
        attachedTo: { $exists: true }
      },
      { limit: 500 }
    )

    if (contexts.length === 0) {
      break
    }

    const classesOfSpace = new Set<Ref<Class<Doc>>>()

    for (const context of contexts) {
      const _class = (context as any).attachedToClass
      if (client.hierarchy.isDerived(_class, core.class.Space)) {
        classesOfSpace.add(_class)
      }
    }
    if (classesOfSpace.size > 0) {
      await client.update<DocNotifyContext>(
        DOMAIN_DOC_NOTIFY,
        { objectClass: { $in: Array.from(classesOfSpace) } },
        { objectSpace: core.space.Space }
      )
      await client.update<DocNotifyContext>(
        DOMAIN_DOC_NOTIFY,
        { objectClass: { $in: Array.from(classesOfSpace) } },
        { $rename: { attachedTo: 'objectId', attachedToClass: 'objectClass' } }
      )
    }
    await client.update(
      DOMAIN_DOC_NOTIFY,
      {
        _class: notification.class.DocNotifyContext,
        _id: { $in: contexts.map(({ _id }) => _id) }
      },
      { $rename: { attachedTo: 'objectId', attachedToClass: 'objectClass' } }
    )
  }

  await client.deleteMany(DOMAIN_NOTIFICATION, { _class: notification.class.BrowserNotification })
  await client.deleteMany(DOMAIN_USER_NOTIFY, { _class: notification.class.BrowserNotification })
}

export async function migrateDuplicateContexts (client: MigrationClient): Promise<void> {
  const personSpaces = await client.find<PersonSpace>(DOMAIN_SPACE, { _class: contact.class.PersonSpace }, {})

  for (const space of personSpaces) {
    const contexts = await client.find<DocNotifyContext>(
      DOMAIN_DOC_NOTIFY,
      { _class: notification.class.DocNotifyContext, space: space._id },
      {}
    )
    const toRemove = new Set<Ref<DocNotifyContext>>()
    const contextByUser = new Map<string, DocNotifyContext>()

    for (const context of contexts) {
      const key = context.objectId + '.' + context.user
      const existContext = contextByUser.get(key)

      if (existContext != null) {
        const existLastViewedTimestamp = existContext.lastViewedTimestamp ?? 0
        const newLastViewedTimestamp = context.lastViewedTimestamp ?? 0
        if (existLastViewedTimestamp > newLastViewedTimestamp) {
          toRemove.add(context._id)
        } else {
          toRemove.add(existContext._id)
          contextByUser.set(key, context)
        }
      } else {
        contextByUser.set(key, context)
      }
    }
    if (toRemove.size > 0) {
      await client.deleteMany(DOMAIN_DOC_NOTIFY, { _id: { $in: Array.from(toRemove) } })
      await client.deleteMany(DOMAIN_NOTIFICATION, { docNotifyContext: { $in: Array.from(toRemove) } })
    }
  }
}

async function migrateAccountsToSocialIds (client: MigrationClient): Promise<void> {
  const ctx = new MeasureMetricsContext('notification migrateAccountsToSocialIds', {})
  const hierarchy = client.hierarchy
  const socialIdByAccount = await getSocialIdByOldAccount(client)

  ctx.info('processing collaborators ', { })
  for (const domain of client.hierarchy.domains()) {
    ctx.info('processing domain ', { domain })
    let processed = 0
    const iterator = await client.traverse(domain, {})

    try {
      while (true) {
        const docs = await iterator.next(200)
        if (docs === null || docs.length === 0) {
          break
        }

        const operations: { filter: MigrationDocumentQuery<Doc>, update: MigrateUpdate<Doc> }[] = []

        for (const doc of docs) {
          const mixin = hierarchy.as(doc, notification.mixin.Collaborators)
          const oldCollaborators = mixin.collaborators

          if (oldCollaborators === undefined || oldCollaborators.length === 0) continue

          const newCollaborators = oldCollaborators.map((c) => socialIdByAccount[c] ?? c)

          operations.push({
            filter: { _id: doc._id },
            update: {
              [`${notification.mixin.Collaborators}.collaborators`]: newCollaborators
            }
          })
        }

        if (operations.length > 0) {
          await client.bulk(domain, operations)
        }

        processed += docs.length
        ctx.info('...processed', { count: processed })
      }

      ctx.info('finished processing domain ', { domain, processed })
    } finally {
      await iterator.close()
    }
  }
  ctx.info('finished processing collaborators ', { })

  ctx.info('processing notifications fields ', { })
  const iterator = await client.traverse(DOMAIN_NOTIFICATION, { _class: { $in: [notification.class.DocNotifyContext, notification.class.BrowserNotification, notification.class.PushSubscription, notification.class.InboxNotification] } })

  try {
    let processed = 0
    while (true) {
      const docs = await iterator.next(200)
      if (docs === null || docs.length === 0) {
        break
      }

      const operations: { filter: MigrationDocumentQuery<Doc>, update: MigrateUpdate<Doc> }[] = []

      for (const doc of docs) {
        let update: MigrateUpdate<Doc> | undefined

        if (hierarchy.isDerived(doc._class, notification.class.BrowserNotification)) {
          const browserNotification = doc as BrowserNotification
          const newUser = socialIdByAccount[browserNotification.user] ?? browserNotification.user
          const newSenderId = browserNotification.senderId !== undefined ? (socialIdByAccount[browserNotification.senderId] ?? browserNotification.senderId) : browserNotification.senderId
          if (newUser !== browserNotification.user || newSenderId !== browserNotification.senderId) {
            update = {
              user: newUser,
              senderId: newSenderId
            }
          }
        } else {
          const docWithUser = doc as DocNotifyContext | PushSubscription | InboxNotification
          const newUser = socialIdByAccount[docWithUser.user] ?? docWithUser.user
          if (newUser !== docWithUser.user) {
            update = {
              user: newUser
            }
          }
        }

        if (update === undefined) continue

        operations.push({
          filter: { _id: doc._id },
          update
        })
      }

      if (operations.length > 0) {
        await client.bulk(DOMAIN_NOTIFICATION, operations)
      }

      processed += docs.length
      ctx.info('...processed', { count: processed })
    }
  } finally {
    await iterator.close()
  }
  ctx.info('finished processing notifications fields ', { })
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
        state: 'fill-notification-archived-field-v1',
        func: async (client) => {
          await client.update<InboxNotification>(
            DOMAIN_NOTIFICATION,
            { _class: notification.class.ActivityInboxNotification, archived: { $exists: false } },
            { archived: false }
          )
          await client.update<InboxNotification>(
            DOMAIN_NOTIFICATION,
            { _class: notification.class.CommonInboxNotification, archived: { $exists: false } },
            { archived: false }
          )
          await client.update<InboxNotification>(
            DOMAIN_NOTIFICATION,
            { _class: notification.class.MentionInboxNotification, archived: { $exists: false } },
            { archived: false }
          )
        }
      },
      {
        state: 'fill-contexts-pinned-field-v1',
        func: async (client) => {
          await client.update<DocNotifyContext>(
            DOMAIN_DOC_NOTIFY,
            { _class: notification.class.DocNotifyContext, isPinned: { $exists: false } },
            { isPinned: false }
          )
        }
      },
      {
        state: 'migrate-notifications-space-v1',
        func: migrateNotificationsSpace
      },
      {
        state: 'migrate-employee-space-v1',
        func: async () => {
          await client.update<DocNotifyContext>(
            DOMAIN_DOC_NOTIFY,
            { _class: notification.class.DocNotifyContext, objectSpace: 'contact:space:Employee' as Ref<Space> },
            { objectSpace: contact.space.Contacts }
          )
        }
      },
      {
        state: 'migrate-wrong-spaces-v1',
        func: async () => {
          await client.update<DocNotifyContext>(
            DOMAIN_DOC_NOTIFY,
            { _class: notification.class.DocNotifyContext, objectClass: chunter.class.DirectMessage },
            { objectSpace: core.space.Space }
          )
          await client.update<DocNotifyContext>(
            DOMAIN_DOC_NOTIFY,
            { _class: notification.class.DocNotifyContext, objectClass: chunter.class.Channel },
            { objectSpace: core.space.Space }
          )
          await client.update<DocNotifyContext>(
            DOMAIN_DOC_NOTIFY,
            { _class: notification.class.DocNotifyContext, objectClass: 'recruit:class:Vacancy' as any },
            { objectSpace: core.space.Space }
          )
        }
      },
      {
        state: 'migrate-duplicated-contexts-v3',
        func: migrateDuplicateContexts
      },
      {
        state: 'set-default-hidden',
        func: async () => {
          await client.update(
            DOMAIN_DOC_NOTIFY,
            { _class: notification.class.DocNotifyContext, hidden: { $exists: false } },
            { hidden: false }
          )
        }
      },
      {
        state: 'remove-update-txes-docnotify-ctx-v2',
        func: async (client) => {
          await client.deleteMany(DOMAIN_TX, {
            _class: core.class.TxUpdateDoc,
            objectClass: notification.class.DocNotifyContext,
            'operations.lastViewedTimestamp': {
              $exists: true
            }
          })
          await client.deleteMany(DOMAIN_TX, {
            _class: core.class.TxUpdateDoc,
            objectClass: notification.class.DocNotifyContext,
            'operations.lastUpdateTimestamp': {
              $exists: true
            }
          })
        }
      },
      {
        state: 'remove-browser-notification-v2',
        func: async (client) => {
          await client.deleteMany<BrowserNotification>(DOMAIN_USER_NOTIFY, {
            _class: notification.class.BrowserNotification
          })

          await client.deleteMany(DOMAIN_TX, {
            objectClass: notification.class.BrowserNotification
          })
        }
      },
      {
        state: 'migrate-dnc-space',
        func: async (client) => {
          await client.update(DOMAIN_DOC_NOTIFY, { space: core.space.Space }, { space: core.space.Workspace })
        }
      },
      {
        state: 'accounts-to-social-ids',
        func: migrateAccountsToSocialIds
      }
    ])
  },
  async upgrade (state: Map<string, Set<string>>, client: () => Promise<MigrationUpgradeClient>): Promise<void> {}
}
