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

import { TxOperations } from '@hcengineering/core'
import {
  type MigrateOperation,
  type MigrationClient,
  type MigrationUpgradeClient,
  createOrUpdate,
  tryMigrate,
  tryUpgrade,
  createDefaultSpace
} from '@hcengineering/model'
import core from '@hcengineering/model-core'
import tags from '@hcengineering/tags'
import { timeId, ToDoPriority } from '@hcengineering/time'
import { DOMAIN_TIME } from '.'
import time from './plugin'

async function fillProps (client: MigrationClient): Promise<void> {
  await client.update(
    DOMAIN_TIME,
    { _class: time.class.ProjectToDo, visibility: { $exists: false } },
    { visibility: 'public' }
  )
  await client.update(
    DOMAIN_TIME,
    { _class: time.class.ToDo, visibility: { $exists: false } },
    { visibility: 'private' }
  )
  await client.update(DOMAIN_TIME, { priority: { $exists: false } }, { priority: ToDoPriority.NoPriority })
}

export const timeOperation: MigrateOperation = {
  async migrate (client: MigrationClient, mode): Promise<void> {
    await tryMigrate(mode, client, timeId, [
      {
        state: 'm-time-001',
        mode: 'upgrade',
        func: async (client) => {
          await fillProps(client)
        }
      }
    ])
  },
  async upgrade (state: Map<string, Set<string>>, client: () => Promise<MigrationUpgradeClient>, mode): Promise<void> {
    await tryUpgrade(mode, state, client, timeId, [
      {
        state: 'create-defaults-v2',
        func: async (client) => {
          await createDefaultSpace(client, time.space.ToDos, { name: 'Todos', description: 'Space for all todos' })
        }
      },
      {
        state: 'u-time-0001',
        func: async (client) => {
          const tx = new TxOperations(client, core.account.System)
          await createOrUpdate(
            tx,
            tags.class.TagCategory,
            core.space.Workspace,
            {
              icon: tags.icon.Tags,
              label: 'Other',
              targetClass: time.class.ToDo,
              tags: [],
              default: true
            },
            time.category.Other
          )
        }
      }
    ])
  }
}
