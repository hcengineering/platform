//
// Copyright © 2024 Hardcore Engineering Inc.
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

import contact from '@hcengineering/contact'
import { type Space, TxOperations, type Ref } from '@hcengineering/core'
import drive from '@hcengineering/drive'
import { RoomAccess, RoomType, createDefaultRooms, isOffice, loveId, type Floor } from '@hcengineering/love'
import {
  createDefaultSpace,
  migrateSpace,
  tryMigrate,
  tryUpgrade,
  type MigrateOperation,
  type MigrationClient,
  type MigrationUpgradeClient
} from '@hcengineering/model'
import core from '@hcengineering/model-core'
import love from './plugin'
import { DOMAIN_LOVE } from '.'

async function createDefaultFloor (tx: TxOperations): Promise<void> {
  const current = await tx.findOne(love.class.Floor, {
    _id: love.ids.MainFloor
  })
  if (current === undefined) {
    await tx.createDoc(
      love.class.Floor,
      core.space.Workspace,
      {
        name: 'Main'
      },
      love.ids.MainFloor
    )
  }
}

async function createRooms (client: MigrationUpgradeClient): Promise<void> {
  const tx = new TxOperations(client, core.account.System)
  const rooms = await client.findAll(love.class.Room, {})
  for (const room of rooms) {
    await tx.remove(room)
  }
  const employees = await client.findAll(contact.mixin.Employee, { active: true })
  const data = createDefaultRooms(employees.map((p) => p._id))
  for (const room of data) {
    const _class = isOffice(room) ? love.class.Office : love.class.Room
    await tx.createDoc(_class, core.space.Workspace, room)
  }
}

async function createReception (client: MigrationUpgradeClient): Promise<void> {
  const tx = new TxOperations(client, core.account.System)
  const current = await tx.findOne(love.class.Room, {
    _id: love.ids.Reception
  })
  if (current !== undefined) return
  await tx.createDoc(
    love.class.Room,
    core.space.Workspace,
    {
      name: 'Reception',
      type: RoomType.Reception,
      access: RoomAccess.Open,
      floor: '' as Ref<Floor>,
      width: 100,
      height: 0,
      x: 0,
      y: 0,
      language: 'en',
      startWithTranscription: false
    },
    love.ids.Reception
  )
}

export const loveOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await tryMigrate(client, loveId, [
      {
        state: 'removeDeprecatedSpace',
        func: async (client: MigrationClient) => {
          await migrateSpace(client, 'love:space:Rooms' as Ref<Space>, core.space.Workspace, [DOMAIN_LOVE])
        }
      },
      {
        state: 'setup-defaults-settings',
        func: async (client: MigrationClient) => {
          await client.update(DOMAIN_LOVE, { _class: love.class.Room, language: { $exists: false } }, { language: 'en' })
          await client.update(DOMAIN_LOVE, { _class: love.class.Office, language: { $exists: false } }, { language: 'en' })
          await client.update(DOMAIN_LOVE, { _class: love.class.Room, startWithTranscription: { $exists: false } }, { startWithTranscription: true })
          await client.update(DOMAIN_LOVE, { _class: love.class.Office, startWithTranscription: { $exists: false } }, { startWithTranscription: false })
        }
      }
    ])
  },
  async upgrade (state: Map<string, Set<string>>, client: () => Promise<MigrationUpgradeClient>): Promise<void> {
    await tryUpgrade(state, client, loveId, [
      {
        state: 'initial-defaults',
        func: async (client) => {
          const tx = new TxOperations(client, core.account.System)
          await createDefaultFloor(tx)
        }
      },
      {
        state: 'createRooms_v2',
        func: createRooms
      },

      {
        state: 'create-reception',
        func: async (client) => {
          await createReception(client)
        }
      },
      {
        state: 'create-drive',
        func: async (client) => {
          await createDefaultSpace(
            client,
            love.space.Drive,
            {
              name: 'Records',
              description: 'Office records',
              type: drive.spaceType.DefaultDrive,
              autoJoin: true
            },
            drive.class.Drive
          )
        }
      }
    ])
  }
}
