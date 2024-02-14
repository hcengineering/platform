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
  type AttachedDoc,
  type Doc,
  type Domain,
  DOMAIN_TX,
  generateId,
  type Ref,
  type TxCollectionCUD,
  type TxCUD,
  TxOperations,
  TxProcessor
} from '@hcengineering/core'
import {
  type MigrateOperation,
  type MigrationClient,
  type MigrationUpgradeClient,
  tryMigrate
} from '@hcengineering/model'
import notification, {
  type ActivityInboxNotification,
  type DocNotifyContext,
  type DocUpdates,
  type DocUpdateTx,
  notificationId
} from '@hcengineering/notification'
import activity, { type ActivityMessage, type DocUpdateMessage } from '@hcengineering/activity'

import { DOMAIN_NOTIFICATION } from './index'

interface InboxData {
  context: DocNotifyContext
  notifications: ActivityInboxNotification[]
}

const DOMAIN_ACTIVITY = 'activity' as Domain

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

async function getActivityMessages (
  client: MigrationClient,
  tx: DocUpdateTx,
  context: DocNotifyContext
): Promise<ActivityMessage[]> {
  const docUpdateMessages = await client.find<DocUpdateMessage>(DOMAIN_ACTIVITY, {
    _class: activity.class.DocUpdateMessage,
    txId: tx._id,
    attachedTo: context.attachedTo
  })

  if (docUpdateMessages.length > 0) {
    return docUpdateMessages
  }

  const originTx = (await client.find<TxCUD<Doc>>(DOMAIN_TX, { _id: tx._id }))[0]

  if (originTx === undefined) {
    return []
  }

  const innerTx = TxProcessor.extractTx(originTx as TxCollectionCUD<Doc, AttachedDoc>) as TxCUD<Doc>

  return (
    await client.find<ActivityMessage>(DOMAIN_ACTIVITY, {
      _id: innerTx.objectId as Ref<ActivityMessage>,
      attachedTo: context.attachedTo
    })
  ).filter(({ _class }) => client.hierarchy.isDerived(_class, activity.class.ActivityMessage))
}

async function getInboxNotifications (
  client: MigrationClient,
  tx: DocUpdateTx,
  context: DocNotifyContext
): Promise<ActivityInboxNotification[]> {
  const messages = await getActivityMessages(client, tx, context)

  if (messages.length === 0) {
    return []
  }

  return messages.map((message) => ({
    _id: generateId(),
    _class: notification.class.ActivityInboxNotification,
    space: context.space,
    user: context.user,
    isViewed: !tx.isNew,
    attachedTo: message._id,
    attachedToClass: message._class,
    docNotifyContext: context._id,
    title: tx.title,
    body: tx.body,
    intlParams: tx.intlParams,
    intlParamsNotLocalized: tx.intlParamsNotLocalized,
    modifiedOn: tx.modifiedOn,
    modifiedBy: tx.modifiedBy,
    createdOn: tx.modifiedOn,
    createdBy: tx.modifiedBy
  }))
}

async function getInboxData (client: MigrationClient, docUpdate: DocUpdates): Promise<InboxData | undefined> {
  if (docUpdate.hidden) {
    return
  }

  if (!client.hierarchy.hasClass(docUpdate.attachedToClass)) {
    console.log('cannot find class: ', docUpdate.attachedToClass)
    return
  }

  const { txes } = docUpdate
  const newTxIndex = txes.findIndex(({ isNew }) => isNew)

  const context: DocNotifyContext = {
    _id: docUpdate._id,
    _class: notification.class.DocNotifyContext,
    space: docUpdate.space,
    user: docUpdate.user,
    attachedTo: docUpdate.attachedTo,
    attachedToClass: docUpdate.attachedToClass,
    hidden: docUpdate.hidden,
    lastViewedTimestamp: newTxIndex !== -1 ? txes[newTxIndex - 1]?.modifiedOn : docUpdate.lastTxTime,
    lastUpdateTimestamp: docUpdate.lastTxTime,
    modifiedBy: docUpdate.modifiedBy,
    modifiedOn: docUpdate.modifiedOn,
    createdBy: docUpdate.createdBy,
    createdOn: docUpdate.createdOn
  }

  const notifications = (await Promise.all(txes.map((tx) => getInboxNotifications(client, tx, context)))).flat()

  return {
    context,
    notifications
  }
}

async function migrateInboxNotifications (client: MigrationClient): Promise<void> {
  while (true) {
    const docUpdates = await client.find<DocUpdates>(
      DOMAIN_NOTIFICATION,
      {
        _class: notification.class.DocUpdates
      },
      { limit: 500 }
    )

    if (docUpdates.length === 0) {
      return
    }

    const data: InboxData[] = (
      await Promise.all(docUpdates.map((docUpdate) => getInboxData(client, docUpdate)))
    ).filter((data): data is InboxData => data !== undefined)

    await client.deleteMany(DOMAIN_NOTIFICATION, { _id: { $in: docUpdates.map(({ _id }) => _id) } })
    await client.create(
      DOMAIN_NOTIFICATION,
      data.map(({ context }) => context)
    )
    await client.create(
      DOMAIN_NOTIFICATION,
      data.flatMap(({ notifications }) => notifications)
    )
  }
}

export async function removeHiddenNotifications (client: MigrationClient): Promise<void> {
  const processedIds: Ref<DocNotifyContext>[] = []

  while (true) {
    const contexts = await client.find<DocNotifyContext>(
      DOMAIN_NOTIFICATION,
      {
        _class: notification.class.DocNotifyContext,
        _id: { $nin: processedIds },
        hidden: true
      },
      { limit: 500 }
    )

    if (contexts.length === 0) {
      return
    }

    const ids = contexts.map(({ _id }) => _id)

    processedIds.push(...ids)

    await client.deleteMany(DOMAIN_NOTIFICATION, {
      _class: notification.class.CommonInboxNotification,
      docNotifyContext: { $in: ids }
    })

    await client.deleteMany(DOMAIN_NOTIFICATION, {
      _class: notification.class.ActivityInboxNotification,
      docNotifyContext: { $in: ids }
    })
  }
}

export const notificationOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await tryMigrate(client, notificationId, [
      {
        state: 'inbox-notifications',
        func: migrateInboxNotifications
      }
    ])
    await tryMigrate(client, notificationId, [
      {
        state: 'remove-hidden-notifications',
        func: removeHiddenNotifications
      }
    ])
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    await createSpace(client)
  }
}
