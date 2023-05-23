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
  Ref,
  Timestamp,
  toIdMap,
  Tx,
  TxCUD,
  TxOperations
} from '@hcengineering/core'
import { MigrateOperation, MigrationClient, MigrationUpgradeClient } from '@hcengineering/model'
import notification, { DocUpdates, DocUpdateTx, NotificationType } from '@hcengineering/notification'
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

interface OldDocUpdates extends Doc {
  user: Ref<Account>
  attachedTo: Ref<Doc>
  attachedToClass: Ref<Class<Doc>>
  hidden: boolean
  lastTx?: Ref<TxCUD<Doc>>
  lastTxTime?: Timestamp
  txes: [Ref<TxCUD<Doc>>, Timestamp][]
}

async function fillDocUpdates (client: MigrationClient): Promise<void> {
  const notifications = await client.find<OldDocUpdates>(DOMAIN_NOTIFICATION, {
    _class: notification.class.DocUpdates,
    lastTx: { $exists: true }
  })
  while (notifications.length > 0) {
    const docs = notifications.splice(0, 1000)
    const txIds = docs
      .map((p) => {
        const res = p.txes.map((p) => p[0])
        if (p.lastTx !== undefined) {
          res.push(p.lastTx)
        }
        return res
      })
      .flat()
    const txes = await client.find<Tx>(DOMAIN_TX, { _id: { $in: txIds } })
    const txesMap = toIdMap(txes)
    for (const doc of docs) {
      const txes: DocUpdateTx[] = doc.txes
        .map((p) => {
          const tx = txesMap.get(p[0])
          if (tx === undefined) return undefined
          const res: DocUpdateTx = {
            _id: tx._id as Ref<TxCUD<Doc>>,
            modifiedBy: tx.modifiedBy,
            modifiedOn: tx.modifiedOn,
            isNew: true
          }
          return res
        })
        .filter((p) => p !== undefined) as DocUpdateTx[]
      if (txes.length === 0 && doc.lastTx !== undefined) {
        const tx = txesMap.get(doc.lastTx)
        if (tx !== undefined) {
          txes.unshift({
            _id: tx._id as Ref<TxCUD<Doc>>,
            modifiedBy: tx.modifiedBy,
            modifiedOn: tx.modifiedOn,
            isNew: false
          })
        }
      }
      await client.update(
        DOMAIN_NOTIFICATION,
        {
          _id: doc._id
        },
        {
          $unset: { lastTx: 1 },
          $set: {
            txes
          }
        }
      )
    }
  }
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

async function changeDocUpdatesSpaces (client: MigrationUpgradeClient): Promise<void> {
  const txop = new TxOperations(client, core.account.System)
  const docUpdates = await client.findAll(notification.class.DocUpdates, { space: notification.space.Notifications })
  const map = new Map<Ref<Class<Doc>>, Map<Ref<Doc>, DocUpdates[]>>()
  for (const docUpdate of docUpdates) {
    const _class = map.get(docUpdate.attachedToClass) ?? new Map()
    const arr = _class.get(docUpdate.attachedTo) ?? []
    arr.push(docUpdate)
    _class.set(docUpdate.attachedTo, arr)
    map.set(docUpdate.attachedToClass, _class)
  }
  for (const [_class, arr] of map) {
    const ids = Array.from(arr.keys())
    const docs = await client.findAll(_class, { _id: { $in: ids } })
    for (const doc of docs) {
      const updateDocs = arr.get(doc._id)
      if (updateDocs === undefined) continue
      await Promise.all(updateDocs.map(async (p) => await txop.update(p, { space: doc.space })))
    }
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
    await fillCollaborators(client)
    await fillDocUpdatesHidder(client)
    await fillDocUpdates(client)
    await cleanOutdatedSettings(client)
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    await createSpace(client)
    await createCustomFieldTypes(client)
    await changeDocUpdatesSpaces(client)
  }
}
