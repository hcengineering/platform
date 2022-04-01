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

import { Message } from '@anticrm/chunter'
import type { Client, Ref } from '@anticrm/core'
import core, { TxOperations } from '@anticrm/core'
import { MigrateOperation, MigrationClient, MigrationUpgradeClient } from '@anticrm/model'
import chunter from './plugin'

export async function createDeps (client: Client): Promise<void> {
  const tx = new TxOperations(client, core.account.System)

  await createGeneral(tx)
  await createRandom(tx)
}

export async function createGeneral (tx: TxOperations): Promise<void> {
  const createTx = await tx.findOne(core.class.TxCreateDoc, {
    objectId: chunter.space.General
  })
  if (createTx === undefined) {
    await tx.createDoc(chunter.class.Channel, core.space.Space, {
      name: 'general',
      description: 'General Channel',
      private: false,
      archived: false,
      members: []
    }, chunter.space.General)
  }
}

export async function createRandom (tx: TxOperations): Promise<void> {
  const createTx = await tx.findOne(core.class.TxCreateDoc, {
    objectId: chunter.space.Random
  })
  if (createTx === undefined) {
    await tx.createDoc(chunter.class.Channel, core.space.Space, {
      name: 'random',
      description: 'Random Talks',
      private: false,
      archived: false,
      members: []
    }, chunter.space.Random)
  }
}

export async function setCreate (client: TxOperations): Promise<void> {
  const messages = (await client.findAll(chunter.class.Message, { })).filter((m) => m.createBy === undefined).map((m) => m._id)
  if (messages.length === 0) return
  const txes = await client.findAll(core.class.TxCreateDoc, { objectId: { $in: messages } })
  const promises = txes.map(async (tx) => {
    await client.updateDoc<Message>(chunter.class.Message, tx.objectSpace, tx.objectId as Ref<Message>, {
      createBy: tx.modifiedBy,
      createOn: tx.modifiedOn
    })
  })
  await Promise.all(promises)
}

export const chunterOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    const tx = new TxOperations(client, core.account.System)
    await createGeneral(tx)
    await createRandom(tx)
    await setCreate(tx)
  }
}
