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
  AttachedDoc,
  Class,
  Doc,
  DOMAIN_TX,
  generateId,
  Ref,
  TxCollectionCUD,
  TxCreateDoc,
  TxOperations,
  TxRemoveDoc
} from '@hcengineering/core'
import { MigrateOperation, MigrationClient, MigrationUpgradeClient } from '@hcengineering/model'
import notification, { LastView, Notification, NotificationType } from '@hcengineering/notification'
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

async function migrateLastView (client: MigrationClient): Promise<void> {
  // lets clear last view txes (it should be derived and shouldn't store in tx collection)
  const txes = await client.find(DOMAIN_TX, {
    objectClass: notification.class.LastView
  })
  for (const tx of txes) {
    await client.delete(DOMAIN_TX, tx._id)
  }

  const h = client.hierarchy
  const docClasses = h.getDescendants(core.class.Doc)
  const trackedClasses = docClasses.filter((p) => h.hasMixin(h.getClass(p), notification.mixin.TrackedDoc))
  const allowedClasses = new Set<Ref<Class<Doc>>>()
  trackedClasses.forEach((p) => h.getDescendants(p).forEach((a) => allowedClasses.add(a)))

  const removeTxes = await client.find<TxRemoveDoc<Doc>>(
    DOMAIN_TX,
    {
      _class: core.class.TxRemoveDoc
    },
    { projection: { objectId: 1 } }
  )

  const removedDocs: Set<Ref<Doc>> = new Set(removeTxes.map((p) => p.objectId))
  const removedCollectionTxes = await client.find<TxCollectionCUD<Doc, AttachedDoc>>(
    DOMAIN_TX,
    {
      _class: core.class.TxCollectionCUD,
      'tx._class': core.class.TxRemoveDoc
    },
    { projection: { tx: 1 } }
  )
  removedCollectionTxes.forEach((p) => p.tx.objectId)

  const newLastView: Map<Ref<Account>, LastView> = new Map()
  let total = 0
  while (true) {
    const lastViews = await client.find<LastView>(
      DOMAIN_NOTIFICATION,
      {
        _class: notification.class.LastView,
        attachedTo: { $exists: true }
      },
      { limit: 10000 }
    )
    total += lastViews.length
    console.log(`migrate ${total} notifications`)
    if (lastViews.length === 0) break
    for (const lastView of lastViews) {
      if (
        lastView.user !== core.account.System &&
        allowedClasses.has(lastView.attachedToClass) &&
        !removedDocs.has(lastView.attachedTo)
      ) {
        const obj: LastView = newLastView.get(lastView.user) ?? {
          user: lastView.user,
          modifiedBy: lastView.user,
          modifiedOn: Date.now(),
          _id: generateId(),
          space: notification.space.Notifications,
          _class: notification.class.LastView
        }
        obj[lastView.attachedTo] = lastView.lastView
        newLastView.set(lastView.user, obj)
      }
    }
    await Promise.all(lastViews.map((p) => client.delete(DOMAIN_NOTIFICATION, p._id)))
  }
  for (const [, lastView] of newLastView) {
    await client.create(DOMAIN_NOTIFICATION, lastView)
  }
}

async function fillCollaborators (client: MigrationClient): Promise<void> {
  const targetClasses = await client.model.findAll(notification.mixin.ClassCollaborators, {})
  for (const targetClass of targetClasses) {
    const domain = client.hierarchy.getDomain(targetClass._id)
    const desc = client.hierarchy.getDescendants(targetClass._id)
    await client.update(
      domain,
      {
        _class: { $in: desc },
        'notification:mixin:Collaborators': { $exists: false }
      },
      {
        'notification:mixin:Collaborators': {
          collaborators: []
        }
      }
    )
  }
}

export const notificationOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await fillNotificationText(client)
    await migrateLastView(client)
    await fillCollaborators(client)
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    await createSpace(client)
    await fillNotificationType(client)
  }
}
