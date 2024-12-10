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

import { chunterId, type DirectMessage, type ThreadMessage } from '@hcengineering/chunter'
import core, {
  type Account,
  TxOperations,
  type Class,
  type Doc,
  type Domain,
  type Ref,
  type Space,
  DOMAIN_TX
} from '@hcengineering/core'
import {
  tryMigrate,
  tryUpgrade,
  type MigrateOperation,
  type MigrationClient,
  type MigrationUpgradeClient
} from '@hcengineering/model'
import activity, { migrateMessagesSpace, DOMAIN_ACTIVITY } from '@hcengineering/model-activity'
import notification from '@hcengineering/notification'
import contactPlugin, { type Person, type PersonAccount } from '@hcengineering/contact'
import { DOMAIN_DOC_NOTIFY, DOMAIN_NOTIFICATION } from '@hcengineering/model-notification'
import { type DocUpdateMessage } from '@hcengineering/activity'
import { DOMAIN_SPACE } from '@hcengineering/model-core'

import chunter from './plugin'
import { DOMAIN_CHUNTER } from './index'

export const DOMAIN_COMMENT = 'comment' as Domain

export async function createDocNotifyContexts (
  client: MigrationUpgradeClient,
  tx: TxOperations,
  objectId: Ref<Doc>,
  objectClass: Ref<Class<Doc>>,
  objectSpace: Ref<Space>
): Promise<void> {
  const users = await client.findAll(core.class.Account, {})
  const docNotifyContexts = await client.findAll(notification.class.DocNotifyContext, {
    user: { $in: users.map((it) => it._id) },
    objectId
  })
  for (const user of users) {
    if (user._id === core.account.System) {
      continue
    }
    const docNotifyContext = docNotifyContexts.find((it) => it.user === user._id)

    if (docNotifyContext === undefined) {
      await tx.createDoc(notification.class.DocNotifyContext, core.space.Space, {
        user: user._id,
        objectId,
        objectClass,
        objectSpace,
        hidden: false,
        isPinned: false
      })
    }
  }
}

export async function createGeneral (client: MigrationUpgradeClient, tx: TxOperations): Promise<void> {
  const current = await tx.findOne(chunter.class.Channel, { _id: chunter.space.General })
  if (current !== undefined) {
    if (current.autoJoin === undefined) {
      await tx.update(current, {
        autoJoin: true
      })
      await joinEmployees(current, tx)
    }
  } else {
    const createTx = await tx.findOne(core.class.TxCreateDoc, {
      objectId: chunter.space.General
    })

    if (createTx === undefined) {
      await tx.createDoc(
        chunter.class.Channel,
        core.space.Space,
        {
          name: 'general',
          description: 'General Channel',
          topic: 'General Channel',
          private: false,
          archived: false,
          members: await getAllPersonAccounts(tx),
          autoJoin: true
        },
        chunter.space.General
      )
    }
  }

  await createDocNotifyContexts(client, tx, chunter.space.General, chunter.class.Channel, core.space.Space)
}

async function getAllPersonAccounts (tx: TxOperations): Promise<Ref<PersonAccount>[]> {
  const employees = await tx.findAll(contactPlugin.mixin.Employee, { active: true })
  const accounts = await tx.findAll(contactPlugin.class.PersonAccount, {
    person: { $in: employees.map((it) => it._id) }
  })
  return accounts.map((it) => it._id)
}

async function joinEmployees (current: Space, tx: TxOperations): Promise<void> {
  const accs = await getAllPersonAccounts(tx)
  const newMembers: Ref<Account>[] = [...current.members]
  for (const acc of accs) {
    if (!newMembers.includes(acc)) {
      newMembers.push(acc)
    }
  }
  await tx.update(current, {
    members: newMembers
  })
}

export async function createRandom (client: MigrationUpgradeClient, tx: TxOperations): Promise<void> {
  const current = await tx.findOne(chunter.class.Channel, { _id: chunter.space.Random })
  if (current !== undefined) {
    if (current.autoJoin === undefined) {
      await tx.update(current, {
        autoJoin: true
      })
      await joinEmployees(current, tx)
    }
  } else {
    const createTx = await tx.findOne(core.class.TxCreateDoc, {
      objectId: chunter.space.Random
    })

    if (createTx === undefined) {
      await tx.createDoc(
        chunter.class.Channel,
        core.space.Space,
        {
          name: 'random',
          description: 'Random Talks',
          topic: 'Random Talks',
          private: false,
          archived: false,
          members: await getAllPersonAccounts(tx),
          autoJoin: true
        },
        chunter.space.Random
      )
    }
  }

  await createDocNotifyContexts(client, tx, chunter.space.Random, chunter.class.Channel, core.space.Space)
}

async function convertCommentsToChatMessages (client: MigrationClient): Promise<void> {
  await client.update(
    DOMAIN_COMMENT,
    { _class: 'chunter:class:Comment' as Ref<Class<Doc>> },
    { _class: chunter.class.ChatMessage }
  )
  await client.move(DOMAIN_COMMENT, { _class: chunter.class.ChatMessage }, DOMAIN_ACTIVITY)
}

async function removeBacklinks (client: MigrationClient): Promise<void> {
  await client.deleteMany(DOMAIN_COMMENT, { _class: 'chunter:class:Backlink' as Ref<Class<Doc>> })
  await client.deleteMany(DOMAIN_ACTIVITY, {
    _class: activity.class.DocUpdateMessage,
    objectClass: 'chunter:class:Backlink' as Ref<Class<Doc>>
  })
}

async function removeOldClasses (client: MigrationClient): Promise<void> {
  const classes = [
    'chunter:class:ChunterMessage',
    'chunter:class:Message',
    'chunter:class:Comment',
    'chunter:class:Backlink'
  ] as Ref<Class<Doc>>[]

  for (const _class of classes) {
    await client.deleteMany(DOMAIN_CHUNTER, { _class })
    await client.deleteMany(DOMAIN_ACTIVITY, { attachedToClass: _class })
    await client.deleteMany(DOMAIN_ACTIVITY, { objectClass: _class })
    await client.deleteMany(DOMAIN_NOTIFICATION, { attachedToClass: _class })
    await client.deleteMany(DOMAIN_TX, { objectClass: _class })
    await client.deleteMany(DOMAIN_TX, { 'tx.objectClass': _class })
  }
}

async function removeWrongActivity (client: MigrationClient): Promise<void> {
  await client.deleteMany<DocUpdateMessage>(DOMAIN_ACTIVITY, {
    _class: activity.class.DocUpdateMessage,
    attachedToClass: chunter.class.Channel,
    action: 'update',
    'attributeUpdates.attrKey': { $ne: 'members' }
  })

  await client.deleteMany<DocUpdateMessage>(DOMAIN_ACTIVITY, {
    _class: activity.class.DocUpdateMessage,
    attachedToClass: chunter.class.Channel,
    action: 'create',
    objectClass: { $ne: chunter.class.Channel }
  })

  await client.deleteMany<DocUpdateMessage>(DOMAIN_ACTIVITY, {
    _class: activity.class.DocUpdateMessage,
    attachedToClass: chunter.class.Channel,
    action: 'remove'
  })

  await client.deleteMany<DocUpdateMessage>(DOMAIN_ACTIVITY, {
    _class: activity.class.DocUpdateMessage,
    attachedToClass: chunter.class.DirectMessage,
    action: 'update',
    'attributeUpdates.attrKey': { $ne: 'members' }
  })

  await client.deleteMany<DocUpdateMessage>(DOMAIN_ACTIVITY, {
    _class: activity.class.DocUpdateMessage,
    attachedToClass: chunter.class.DirectMessage,
    action: 'create'
  })

  await client.deleteMany<DocUpdateMessage>(DOMAIN_ACTIVITY, {
    _class: activity.class.DocUpdateMessage,
    attachedToClass: chunter.class.DirectMessage,
    action: 'remove'
  })
}

async function removeDuplicatedDirects (client: MigrationClient): Promise<void> {
  const directs = await client.find<DirectMessage>(DOMAIN_SPACE, { _class: chunter.class.DirectMessage })
  const personAccounts = await client.model.findAll<PersonAccount>(contactPlugin.class.PersonAccount, {})
  const personByAccount = new Map(personAccounts.map((it) => [it._id, it.person]))

  const accountsToPersons = (members: Ref<Account>[]): Ref<Person>[] => {
    const personsSet = new Set(
      members
        .map((it) => personByAccount.get(it as Ref<PersonAccount>))
        .filter((it): it is Ref<Person> => it !== undefined)
    )
    return Array.from(personsSet)
  }

  const map: Map<string, DirectMessage[]> = new Map<string, DirectMessage[]>()
  const toRemove: Ref<DirectMessage>[] = []

  for (const direct of directs) {
    const persons = accountsToPersons(direct.members)

    if (persons.length === 0) {
      toRemove.push(direct._id)
      continue
    }

    const key = persons.sort().join(',')

    if (!map.has(key)) {
      map.set(key, [direct])
    } else {
      map.get(key)?.push(direct)
    }
  }

  for (const [, directs] of map) {
    if (directs.length === 1) continue
    const toSave = directs.reduce((acc, it) => ((it.messages ?? 0) > (acc.messages ?? 0) ? it : acc), directs[0])
    const rest = directs.filter((it) => it._id !== toSave._id)
    toRemove.push(...rest.map((it) => it._id))
  }

  await client.deleteMany(DOMAIN_SPACE, { _id: { $in: toRemove } })
  await client.deleteMany(DOMAIN_ACTIVITY, { attachedTo: { $in: toRemove } })
  await client.deleteMany(DOMAIN_ACTIVITY, { objectId: { $in: toRemove } })
  await client.deleteMany(DOMAIN_DOC_NOTIFY, { objectId: { $in: toRemove } })
}

export const chunterOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await tryMigrate(client, chunterId, [
      {
        state: 'create-chat-messages',
        func: convertCommentsToChatMessages
      },
      {
        state: 'remove-backlinks',
        func: removeBacklinks
      },
      {
        state: 'migrate-chat-messages-space',
        func: async (client) => {
          await migrateMessagesSpace(
            client,
            chunter.class.ChatMessage,
            ({ attachedTo }) => attachedTo,
            ({ attachedToClass }) => attachedToClass
          )
        }
      },
      {
        state: 'migrate-thread-messages-space',
        func: async (client) => {
          await migrateMessagesSpace(
            client,
            chunter.class.ThreadMessage,
            (msg) => (msg as ThreadMessage).objectId,
            (msg) => (msg as ThreadMessage).objectClass
          )
        }
      },
      {
        state: 'remove-old-classes-v1',
        func: async (client) => {
          await removeOldClasses(client)
        }
      },
      {
        state: 'remove-wrong-activity-v1',
        func: async (client) => {
          await removeWrongActivity(client)
        }
      },
      {
        state: 'remove-chat-info-v1',
        func: async (client) => {
          await client.deleteMany(DOMAIN_CHUNTER, { _class: 'chunter:class:ChatInfo' as Ref<Class<Doc>> })
          await client.deleteMany(DOMAIN_TX, { objectClass: 'chunter:class:ChatInfo' })
          await client.update(
            DOMAIN_DOC_NOTIFY,
            { 'chunter:mixin:ChannelInfo': { $exists: true } },
            { $unset: { 'chunter:mixin:ChannelInfo': true } }
          )
          await client.deleteMany(DOMAIN_TX, { mixin: 'chunter:mixin:ChannelInfo' })
        }
      },
      {
        state: 'remove-duplicated-directs-v1',
        func: async (client) => {
          await removeDuplicatedDirects(client)
        }
      },
      {
        state: 'remove-direct-members-messages',
        func: async (client) => {
          await client.deleteMany<DocUpdateMessage>(DOMAIN_ACTIVITY, {
            _class: activity.class.DocUpdateMessage,
            attachedToClass: chunter.class.DirectMessage,
            action: 'update',
            'attributeUpdates.attrKey': 'members'
          })
        }
      }
    ])
  },
  async upgrade (state: Map<string, Set<string>>, client: () => Promise<MigrationUpgradeClient>): Promise<void> {
    await tryUpgrade(state, client, chunterId, [
      {
        state: 'create-defaults-v2',
        func: async (client) => {
          const tx = new TxOperations(client, core.account.System)
          await createGeneral(client, tx)
          await createRandom(client, tx)
        }
      }
    ])
  }
}
