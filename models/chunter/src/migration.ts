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

import core, { TxOperations } from '@hcengineering/core'
import { MigrateOperation, MigrationClient, MigrationUpgradeClient } from '@hcengineering/model'
import chunter from './plugin'

export async function createGeneral (tx: TxOperations): Promise<void> {
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
}

export async function createRandom (tx: TxOperations): Promise<void> {
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
}

async function createBacklink (tx: TxOperations): Promise<void> {
  const current = await tx.findOne(core.class.Space, {
    _id: chunter.space.Backlinks
  })
  if (current === undefined) {
    await tx.createDoc(
      core.class.Space,
      core.space.Space,
      {
        name: 'Backlinks',
        description: 'Backlinks',
        private: false,
        archived: false,
        members: []
      },
      chunter.space.Backlinks
    )
  }
}

export const chunterOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {},
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    const tx = new TxOperations(client, core.account.System)
    await createGeneral(tx)
    await createRandom(tx)
    await createBacklink(tx)
  }
}
