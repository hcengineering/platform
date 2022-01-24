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

import { Account, Class, Doc, DOMAIN_TX, generateId, Ref, TxCreateDoc, TxCUD, TxOperations, TxRemoveDoc, TxUpdateDoc } from '@anticrm/core'
import { MigrateOperation, MigrationClient, MigrationResult, MigrationUpgradeClient } from '@anticrm/model'
import core from '@anticrm/model-core'
import { Contact, Channel, ChannelProvider } from '@anticrm/contact'
import contact, { DOMAIN_CONTACT } from './index'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function logInfo (msg: string, result: MigrationResult): void {
  if (result.updated > 0) {
    console.log(`Contact: Migrate ${msg} ${result.updated}`)
  }
}

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
    if (tx.attributes.channels === undefined) continue
    const { channels, ...attributes } = tx.attributes
    const current = result.get(tx.objectId)
    for (const channel of (channels as any)) {
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

export async function processRemoveTxes (client: MigrationClient, txes: TxRemoveDoc<Contact>[], result: Map<Ref<Contact>, Map<Ref<ChannelProvider>, Channel>>): Promise<void> {
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
}

export async function migrateContactChannels (client: MigrationClient, classes: Ref<Class<Contact>>[]) {
  const objectIds: Ref<Contact>[] = []
  const contacts = await client.find<Contact>(DOMAIN_CONTACT, { _class: { $in: classes } })
  for (const doc of contacts) {
    const obj = doc as any
    if (obj.channels != null && Array.isArray(obj.channels)) {
      objectIds.push(doc._id)
      await client.update(DOMAIN_CONTACT, { _id: doc._id }, { channels: obj.channels.length })
    }
  }

  const createTxes = await client.find<TxCreateDoc<Contact>>(DOMAIN_TX, {
    _class: core.class.TxCreateDoc,
    objectId: { $in: objectIds }
  })
  const result = await processCreateTxes(client, createTxes)

  const updateTxes = await client.find<TxUpdateDoc<Contact>>(DOMAIN_TX, {
    _class: core.class.TxUpdateDoc,
    objectId: { $in: objectIds }
  })
  for (const tx of updateTxes) {
    if (tx.operations.channels === undefined) continue
    const { channels, ...operations } = tx.operations
    const current = result.get(tx.objectId)
    if (current !== undefined) {
      const providers = new Set<Ref<ChannelProvider>>(current.keys())
      for (const channel of (channels as any)) {
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
      for (const channel of (channels as any)) {
        const doc = createChannel(tx, channel)
        const map = new Map<Ref<ChannelProvider>, Channel>()
        map.set(channel.provider, doc)
        result.set(tx.objectId, map)
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

  await processRemoveTxes(client, removeTxes, result)
}

export const contactOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    const classes = [contact.class.Contact, contact.class.Person, contact.class.Employee, contact.class.Organization]
    await migrateContactChannels(client, classes)
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
  }
}
