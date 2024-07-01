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

import core, { type Class, type Doc, type Domain, DOMAIN_TX, type Ref, type Space } from '@hcengineering/core'
import {
  migrateSpace,
  tryMigrate,
  type MigrateOperation,
  type MigrationClient,
  type MigrationUpgradeClient
} from '@hcengineering/model'
import { telegramId } from '@hcengineering/telegram'
import { DOMAIN_NOTIFICATION } from '@hcengineering/model-notification'

import { DOMAIN_TELEGRAM } from '.'

const DOMAIN_ACTIVITY = 'activity' as Domain

async function removeDeprecatedClasses (client: MigrationClient): Promise<void> {
  await client.deleteMany(DOMAIN_TELEGRAM, { _class: 'telegram:class:Message' as Ref<Class<Doc>> })
  await client.deleteMany(DOMAIN_TELEGRAM, { _class: 'telegram:class:NewMessage' as Ref<Class<Doc>> })

  await client.deleteMany(DOMAIN_NOTIFICATION, { attachedToClass: 'telegram:class:Message' as Ref<Class<Doc>> })
  await client.deleteMany(DOMAIN_NOTIFICATION, { attachedToClass: 'telegram:class:NewMessage' as Ref<Class<Doc>> })

  await client.deleteMany(DOMAIN_TX, { objectClass: 'telegram:class:Message' as Ref<Class<Doc>> })
  await client.deleteMany(DOMAIN_TX, { objectClass: 'telegram:class:NewMessage' as Ref<Class<Doc>> })

  await client.deleteMany(DOMAIN_TX, { 'tx.objectClass': 'telegram:class:Message' as Ref<Class<Doc>> })
  await client.deleteMany(DOMAIN_TX, { 'tx.objectClass': 'telegram:class:NewMessage' as Ref<Class<Doc>> })

  await client.deleteMany(DOMAIN_ACTIVITY, { objectClass: 'telegram:class:Message' as Ref<Class<Doc>> })
  await client.deleteMany(DOMAIN_ACTIVITY, { objectClass: 'telegram:class:NewMessage' as Ref<Class<Doc>> })
}

export const telegramOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await tryMigrate(client, telegramId, [
      {
        state: 'removeDeprecatedSpace',
        func: async (client: MigrationClient) => {
          await migrateSpace(client, 'telegram:space:Telegram' as Ref<Space>, core.space.Workspace, [DOMAIN_TELEGRAM])
        }
      },
      {
        state: 'removeDeprecatedClasses',
        func: async (client: MigrationClient) => {
          await removeDeprecatedClasses(client)
        }
      }
    ])
  },
  async upgrade (state: Map<string, Set<string>>, client: () => Promise<MigrationUpgradeClient>): Promise<void> {}
}
