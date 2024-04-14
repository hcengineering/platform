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

import activity, { type ActivityMessage, type DocUpdateMessage } from '@hcengineering/activity'
import core, {
  DOMAIN_TX,
  TxOperations,
  TxProcessor,
  generateId,
  type AttachedDoc,
  type Doc,
  type Domain,
  type Ref,
  type TxCUD,
  type TxCollectionCUD
} from '@hcengineering/core'
import {
  tryMigrate,
  tryUpgrade,
  type MigrateOperation,
  type MigrationClient,
  type MigrationUpgradeClient
} from '@hcengineering/model'
import notification, {
  notificationId,
  type ActivityInboxNotification,
  type DocNotifyContext,
  type DocUpdateTx,
  type DocUpdates
} from '@hcengineering/notification'

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
  contexts: {
    context: DocNotifyContext
    txes: DocUpdateTx[]
  }[]
): Promise<ActivityInboxNotification[]> {
  const result: ActivityInboxNotification[] = []
  const txes = contexts.flatMap((it) => it.txes)
  const docUpdateMessages = await client.find<DocUpdateMessage>(DOMAIN_ACTIVITY, {
    _class: activity.class.DocUpdateMessage,
    txId: { $in: txes.map((it) => it._id) },
    attachedTo: { $in: contexts.map((it) => it.context.attachedTo) }
  })

  if (docUpdateMessages.length > 0) {
    docUpdateMessages.forEach((message) => {
      const ctx = contexts.find((it) => it.context.attachedTo === message.attachedTo)
      if (ctx === undefined) {
        return
      }
      const tx = ctx.txes.find((it) => it._id === (message.txId as any))
      if (tx == null) {
        return
      }
      result.push({
        _id: generateId(),
        _class: notification.class.ActivityInboxNotification,
        space: ctx.context.space,
        user: ctx.context.user,
        isViewed: !tx.isNew,
        attachedTo: message._id,
        attachedToClass: message._class,
        docNotifyContext: ctx.context._id,
        title: tx.title,
        body: tx.body,
        intlParams: tx.intlParams,
        intlParamsNotLocalized: tx.intlParamsNotLocalized,
        modifiedOn: tx.modifiedOn,
        modifiedBy: tx.modifiedBy,
        createdOn: tx.modifiedOn,
        createdBy: tx.modifiedBy
      })
    })
  }

  const originTx: TxCUD<Doc>[] = await client.find<TxCUD<Doc>>(DOMAIN_TX, { _id: { $in: txes.map((it) => it._id) } })

  if (originTx.length === 0) {
    return result
  }

  const innerTx = originTx.map((it) => TxProcessor.extractTx(it as TxCollectionCUD<Doc, AttachedDoc>) as TxCUD<Doc>)

  ;(
    await client.find<ActivityMessage>(DOMAIN_ACTIVITY, {
      _id: { $in: innerTx.map((it) => it.objectId as Ref<ActivityMessage>) }
    })
  )
    .filter(({ _class }) => client.hierarchy.isDerived(_class, activity.class.ActivityMessage))
    .forEach((message) => {
      const tx = originTx.find((q) => (TxProcessor.extractTx(q) as TxCUD<Doc>).objectId === message._id)
      if (tx == null) {
        return
      }

      const ctx = contexts.find((it) => it.context.attachedTo === message.attachedTo)
      if (ctx === undefined) {
        return
      }
      const docTx = ctx.txes.find((it) => it._id === tx._id)
      if (docTx == null) {
        return
      }
      result.push({
        _id: generateId(),
        _class: notification.class.ActivityInboxNotification,
        space: ctx.context.space,
        user: ctx.context.user,
        isViewed: !docTx.isNew,
        attachedTo: message._id,
        attachedToClass: message._class,
        docNotifyContext: ctx.context._id,
        title: docTx.title,
        body: docTx.body,
        intlParams: docTx.intlParams,
        intlParamsNotLocalized: docTx.intlParamsNotLocalized,
        modifiedOn: docTx.modifiedOn,
        modifiedBy: docTx.modifiedBy,
        createdOn: docTx.modifiedOn,
        createdBy: docTx.modifiedBy
      })
    })
  return result
}

async function getInboxData (client: MigrationClient, docUpdates: DocUpdates[]): Promise<InboxData[]> {
  const toProcess = docUpdates.filter((it) => !it.hidden && client.hierarchy.hasClass(it.attachedToClass))

  const contexts = toProcess.map((docUpdate) => {
    const newTxIndex = docUpdate.txes.findIndex(({ isNew }) => isNew)

    const context: DocNotifyContext = {
      _id: docUpdate._id,
      _class: notification.class.DocNotifyContext,
      space: docUpdate.space,
      user: docUpdate.user,
      attachedTo: docUpdate.attachedTo,
      attachedToClass: docUpdate.attachedToClass,
      hidden: docUpdate.hidden,
      lastViewedTimestamp: newTxIndex !== -1 ? docUpdate.txes[newTxIndex - 1]?.modifiedOn : docUpdate.lastTxTime,
      lastUpdateTimestamp: docUpdate.lastTxTime,
      modifiedBy: docUpdate.modifiedBy,
      modifiedOn: docUpdate.modifiedOn,
      createdBy: docUpdate.createdBy,
      createdOn: docUpdate.createdOn
    }

    return {
      context,
      txes: docUpdate.txes
    }
  })

  const notifications = await getActivityMessages(client, contexts)
  return contexts.map((it) => ({
    context: it.context,
    notifications: notifications.filter((nit) => nit.docNotifyContext === it.context._id)
  }))
}

async function migrateInboxNotifications (client: MigrationClient): Promise<void> {
  let processing = 0
  while (true) {
    const docUpdates = await client.find<DocUpdates>(
      DOMAIN_NOTIFICATION,
      {
        _class: notification.class.DocUpdates
      },
      { limit: 1000 }
    )

    console.log('notifications processing:', processing)

    if (docUpdates.length === 0) {
      return
    }

    processing += docUpdates.length

    const data: InboxData[] = (await getInboxData(client, docUpdates)).filter(
      (data): data is InboxData => data !== undefined
    )

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
    await tryUpgrade(client, notificationId, [
      {
        state: 'create-defaults',
        func: async (client) => {
          await createSpace(client)
        }
      }
    ])
  }
}
