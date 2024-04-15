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

import { chunterId } from '@hcengineering/chunter'
import core, { type Class, type Doc, type Domain, type Ref, TxOperations } from '@hcengineering/core'
import {
  type MigrateOperation,
  type MigrationClient,
  type MigrationUpgradeClient,
  tryMigrate,
  tryUpgrade
} from '@hcengineering/model'
import activity, { DOMAIN_ACTIVITY } from '@hcengineering/model-activity'
import notification from '@hcengineering/notification'

import chunter from './plugin'

export const DOMAIN_COMMENT = 'comment' as Domain

export async function createDocNotifyContexts (
  client: MigrationUpgradeClient,
  tx: TxOperations,
  attachedTo: Ref<Doc>,
  attachedToClass: Ref<Class<Doc>>
): Promise<void> {
  const users = await client.findAll(core.class.Account, {})
  const docNotifyContexts = await client.findAll(notification.class.DocNotifyContext, {
    user: { $in: users.map((it) => it._id) },
    attachedTo,
    attachedToClass
  })
  for (const user of users) {
    if (user._id === core.account.System) {
      continue
    }
    const docNotifyContext = docNotifyContexts.find((it) => it.user === user._id)

    if (docNotifyContext === undefined) {
      await tx.createDoc(notification.class.DocNotifyContext, core.space.Space, {
        user: user._id,
        attachedTo,
        attachedToClass,
        hidden: false
      })
    }
  }
}

export async function createGeneral (client: MigrationUpgradeClient, tx: TxOperations): Promise<void> {
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
        members: []
      },
      chunter.space.General
    )
  }

  await createDocNotifyContexts(client, tx, chunter.space.General, chunter.class.Channel)
}

export async function createRandom (client: MigrationUpgradeClient, tx: TxOperations): Promise<void> {
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
        members: []
      },
      chunter.space.Random
    )
  }

  await createDocNotifyContexts(client, tx, chunter.space.Random, chunter.class.Channel)
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
      }
    ])
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    await tryUpgrade(client, chunterId, [
      {
        state: 'create-defaults',
        func: async (client) => {
          const tx = new TxOperations(client, core.account.System)
          await createGeneral(client, tx)
          await createRandom(client, tx)
        }
      }
    ])
  }
}
