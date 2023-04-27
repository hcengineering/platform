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
  Collection,
  Data,
  Doc,
  DOMAIN_TX,
  generateId,
  Ref,
  TxCollectionCUD,
  TxOperations,
  TxRemoveDoc
} from '@hcengineering/core'
import { MigrateOperation, MigrationClient, MigrationUpgradeClient } from '@hcengineering/model'
import notification, { LastView, NotificationType } from '@hcengineering/notification'
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

async function removeSettings (client: MigrationClient): Promise<void> {
  const outdatedSettings = await client.find(DOMAIN_NOTIFICATION, { _class: notification.class.NotificationSetting })
  for (const setting of outdatedSettings) {
    await client.delete(DOMAIN_NOTIFICATION, setting._id)
  }
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

async function fillDocUpdatesHidder (client: MigrationClient): Promise<void> {
  await client.update(
    DOMAIN_NOTIFICATION,
    {
      _class: notification.class.DocUpdates,
      hidden: { $exists: false }
    },
    {
      hidden: false
    }
  )
}

async function createCustomFieldTypes (client: MigrationUpgradeClient): Promise<void> {
  const txop = new TxOperations(client, core.account.System)
  const attributes = await client.findAll(core.class.Attribute, { isCustom: true })
  const groups = new Map(
    (await client.findAll(notification.class.NotificationGroup, {}))
      .filter((p) => p.objectClass !== undefined)
      .map((p) => [p.objectClass, p])
  )
  const types = new Set((await client.findAll(notification.class.NotificationType, {})).map((p) => p.attribute))
  for (const attribute of attributes) {
    if (attribute.hidden === true || attribute.readonly === true) continue
    if (types.has(attribute._id)) continue
    const group = groups.get(attribute.attributeOf)
    if (group === undefined) continue
    const isCollection: boolean = core.class.Collection === attribute.type._class
    const _class = attribute.attributeOf
    const objectClass = !isCollection ? _class : (attribute.type as Collection<AttachedDoc>).of
    const txClasses = !isCollection
      ? [client.getHierarchy().isMixin(_class) ? core.class.TxMixin : core.class.TxUpdateDoc]
      : [core.class.TxCreateDoc, core.class.TxRemoveDoc]
    const data: Data<NotificationType> = {
      attribute: attribute._id,
      field: attribute.name,
      group: group._id,
      generated: true,
      objectClass,
      txClasses,
      hidden: false,
      providers: {
        [notification.providers.PlatformNotification]: false
      },
      label: attribute.label
    }
    if (isCollection) {
      data.attachedToClass = _class
    }
    const id = `${notification.class.NotificationType}_${_class}_${attribute.name}` as Ref<NotificationType>
    await txop.createDoc(notification.class.NotificationType, core.space.Model, data, id)
  }
}

async function cleanOutdatedSettings (client: MigrationClient): Promise<void> {
  const res = await client.find(DOMAIN_NOTIFICATION, {
    _class: notification.class.NotificationSetting
  })
  for (const value of res) {
    await client.delete(DOMAIN_NOTIFICATION, value._id)
  }
}

export const notificationOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await removeSettings(client)
    await fillNotificationText(client)
    await migrateLastView(client)
    await fillCollaborators(client)
    await fillDocUpdatesHidder(client)
    await cleanOutdatedSettings(client)
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    await createSpace(client)
    await createCustomFieldTypes(client)
  }
}
