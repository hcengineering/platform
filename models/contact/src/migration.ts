//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import { Channel, ChannelProvider, Contact } from '@anticrm/contact'
import { Class, DOMAIN_TX, generateId, Ref, SortingOrder, TxCreateDoc, TxCUD, TxOperations, TxRemoveDoc, TxUpdateDoc } from '@anticrm/core'
import { MigrateOperation, MigrationClient, MigrationUpgradeClient } from '@anticrm/model'
import core from '@anticrm/model-core'
import contact, { DOMAIN_CHANNEL, DOMAIN_CONTACT } from './index'

function createChannel (tx: TxCUD<Contact>, channel: any): Channel {
  const doc: Channel = {
    _class: contact.class.Channel,
    _id: generateId(),
    attachedToClass: tx.objectClass,
    attachedTo: tx.objectId,
    space: tx.objectSpace,
    modifiedBy: tx.modifiedBy,
    modifiedOn: tx.modifiedOn,
    collection: 'channels',
    value: channel.value,
    provider: channel.provider
  }
  return doc
}

async function createTx (client: MigrationClient, tx: TxCUD<Contact>, doc: Channel): Promise<void> {
  await client.create<TxCreateDoc<Channel>>(DOMAIN_TX, {
    _class: core.class.TxCreateDoc,
    _id: generateId(),
    objectId: doc._id,
    objectSpace: doc.space,
    objectClass: doc._class,
    space: tx.space,
    modifiedBy: tx.modifiedBy,
    modifiedOn: tx.modifiedOn,
    attributes: {
      collection: doc.collection,
      attachedToClass: doc.attachedToClass,
      attachedTo: doc.attachedTo,
      value: doc.value,
      provider: doc.provider
    }
  })
}

async function removeTx (client: MigrationClient, tx: TxCUD<Contact>, doc: Channel): Promise<void> {
  await client.create<TxRemoveDoc<Channel>>(DOMAIN_TX, {
    _class: core.class.TxRemoveDoc,
    _id: generateId(),
    objectId: doc._id,
    objectSpace: doc.space,
    objectClass: doc._class,
    space: tx.space,
    modifiedBy: tx.modifiedBy,
    modifiedOn: tx.modifiedOn
  })
}

async function processCreateTxes (client: MigrationClient, createTxes: TxCreateDoc<Contact>[]): Promise<Map<Ref<Contact>, Map<Ref<ChannelProvider>, Channel>>> {
  const result: Map<Ref<Contact>, Map<Ref<ChannelProvider>, Channel>> = new Map<Ref<Contact>, Map<Ref<ChannelProvider>, Channel>>()
  for (const tx of createTxes) {
    const { channels, ...attributes } = tx.attributes
    const current = result.get(tx.objectId)
    for (const channel of (channels as any) ?? []) {
      const doc = createChannel(tx, channel)
      if (current !== undefined) {
        current.set(channel.provider, doc)
      } else {
        const map = new Map<Ref<ChannelProvider>, Channel>()
        map.set(channel.provider, doc)
        result.set(tx.objectId, map)
      }
      await createTx(client, tx, doc)
    }

    await client.update<TxCreateDoc<Contact>>(DOMAIN_TX, { _id: tx._id }, {
      attributes: attributes
    })
  }
  return result
}

export async function processRemoveTxes (client: MigrationClient, txes: TxRemoveDoc<Contact>[], result: Map<Ref<Contact>, Map<Ref<ChannelProvider>, Channel>>): Promise<Map<Ref<Contact>, Map<Ref<ChannelProvider>, Channel>>> {
  for (const tx of txes) {
    const current = result.get(tx.objectId)
    if (current != null) {
      for (const provider of current.keys()) {
        const doc = current.get(provider)
        if (doc !== undefined) {
          await removeTx(client, tx, doc)
          current.delete(provider)
        }
      }
    }
  }
  return result
}

export async function migrateContactChannels (client: MigrationClient, classes: Ref<Class<Contact>>[]): Promise<void> {
  const objectIds: Ref<Contact>[] = []
  const contacts = await client.find<Contact>(DOMAIN_CONTACT, { _class: { $in: classes } })
  for (const doc of contacts) {
    const obj = doc as any
    if (obj.channels == null || Array.isArray(obj.channels)) {
      objectIds.push(doc._id)
    }
  }

  const createTxes = await client.find<TxCreateDoc<Contact>>(DOMAIN_TX, {
    _class: core.class.TxCreateDoc,
    objectId: { $in: objectIds }
  })
  const objectChannels = await processCreateTxes(client, createTxes)

  const updateTxes = await client.find<TxUpdateDoc<Contact>>(DOMAIN_TX, {
    _class: core.class.TxUpdateDoc,
    objectId: { $in: objectIds }
  }, { sort: { modifiedOn: SortingOrder.Ascending } })
  for (const tx of updateTxes) {
    if (tx.operations.channels === undefined) continue
    const { channels, ...operations } = tx.operations
    const current = objectChannels.get(tx.objectId)
    if (current !== undefined) {
      const providers = new Set<Ref<ChannelProvider>>(current.keys())
      for (const channel of (channels as any) ?? []) {
        const doc = current.get(channel.provider)
        if (doc !== undefined) {
          providers.delete(doc.provider)
          doc.value = channel.value
          await client.create<TxUpdateDoc<Channel>>(DOMAIN_TX, {
            _class: core.class.TxUpdateDoc,
            _id: generateId(),
            objectId: doc._id,
            objectSpace: doc.space,
            objectClass: doc._class,
            space: tx.space,
            modifiedBy: tx.modifiedBy,
            modifiedOn: tx.modifiedOn,
            operations: {
              value: doc.value
            }
          })
        } else {
          const doc = createChannel(tx, channel)
          current.set(channel.provider, doc)
          await createTx(client, tx, doc)
        }
      }

      for (const provider of providers.keys()) {
        const doc = current.get(provider)
        if (doc !== undefined) {
          await removeTx(client, tx, doc)
          current.delete(provider)
        }
      }
    } else {
      for (const channel of (channels as any) ?? []) {
        const doc = createChannel(tx, channel)
        const map = new Map<Ref<ChannelProvider>, Channel>()
        map.set(channel.provider, doc)
        objectChannels.set(tx.objectId, map)
      }
    }
    if (Object.keys(operations).length > 0) {
      await client.update<TxUpdateDoc<Contact>>(DOMAIN_TX, { _id: tx._id }, {
        operations: operations
      })
    } else {
      await client.delete<TxUpdateDoc<Contact>>(DOMAIN_TX, tx._id)
    }
  }

  const removeTxes = await client.find<TxRemoveDoc<Contact>>(DOMAIN_TX, {
    _class: core.class.TxRemoveDoc,
    objectId: { $in: objectIds }
  })

  const result = await processRemoveTxes(client, removeTxes, objectChannels)
  for (const contact of result.values()) {
    for (const channel of contact.values()) {
      await client.create(DOMAIN_CONTACT, channel)
    }
  }
  for (const id of objectIds) {
    const channels = result.get(id)?.size ?? 0
    await client.update(DOMAIN_CONTACT, { _id: id }, {
      channels: channels
    })
  }
}

async function migrateChannelsDomain (client: MigrationClient): Promise<void> {
  await client.move(DOMAIN_CONTACT, { _class: contact.class.Channel }, DOMAIN_CHANNEL)
}

async function createSpace (tx: TxOperations): Promise<void> {
  const current = await tx.findOne(core.class.Space, {
    _id: contact.space.Employee
  })
  if (current === undefined) {
    await tx.createDoc(
      core.class.Space,
      core.space.Space,
      {
        name: 'Employees',
        description: 'Employees',
        private: false,
        archived: false,
        members: []
      },
      contact.space.Employee
    )
  }
}

export const contactOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    const classes = [contact.class.Contact, contact.class.Person, contact.class.Employee, contact.class.Organization]
    await migrateContactChannels(client, classes)
    await migrateChannelsDomain(client)
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    const tx = new TxOperations(client, core.account.System)
    await createSpace(tx)
  }
}
