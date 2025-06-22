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

import core, { type AccountUuid, type Ref, type Space } from '@hcengineering/core'
import {
  migrateSpace,
  type MigrateUpdate,
  type MigrationDocumentQuery,
  tryMigrate,
  type MigrateOperation,
  type MigrationClient,
  type MigrationUpgradeClient
} from '@hcengineering/model'
import setting, { DOMAIN_SETTING, type Integration, settingId } from '@hcengineering/setting'
import { getSocialKeyByOldAccount, getUniqueAccountsFromOldAccounts } from '@hcengineering/model-core'

/**
 * Migrates old accounts to new accounts
 * Should be applied to prodcution directly without applying migrateSocialIdsToAccountUuids
 * @param client
 * @returns
 */
async function migrateAccounts (client: MigrationClient): Promise<void> {
  const socialKeyByAccount = await getSocialKeyByOldAccount(client)
  const accountUuidByOldAccount = new Map<string, AccountUuid | null>()

  client.logger.log('processing setting integration shared ', {})
  const iterator = await client.traverse(DOMAIN_SETTING, { _class: setting.class.Integration })

  try {
    let processed = 0
    while (true) {
      const docs = await iterator.next(200)
      if (docs === null || docs.length === 0) {
        break
      }

      const operations: { filter: MigrationDocumentQuery<Integration>, update: MigrateUpdate<Integration> }[] = []

      for (const doc of docs) {
        const integration = doc as Integration

        if (integration.shared === undefined || integration.shared.length === 0) continue

        const newShared = await getUniqueAccountsFromOldAccounts(
          client,
          integration.shared,
          socialKeyByAccount,
          accountUuidByOldAccount
        )

        operations.push({
          filter: { _id: integration._id },
          update: {
            shared: newShared
          }
        })
      }

      if (operations.length > 0) {
        await client.bulk(DOMAIN_SETTING, operations)
      }

      processed += docs.length
      client.logger.log('...processed', { count: processed })
    }
  } finally {
    await iterator.close()
  }
  client.logger.log('finished processing setting integration shared ', {})
}

export const settingOperation: MigrateOperation = {
  async migrate (client: MigrationClient, mode): Promise<void> {
    await tryMigrate(mode, client, settingId, [
      {
        state: 'removeDeprecatedSpace',
        mode: 'upgrade',
        func: async (client: MigrationClient) => {
          await migrateSpace(client, 'setting:space:Setting' as Ref<Space>, core.space.Workspace, [DOMAIN_SETTING])
        }
      },
      {
        state: 'accounts-to-social-ids',
        mode: 'upgrade',
        func: migrateAccounts
      }
    ])
  },
  async upgrade (state: Map<string, Set<string>>, client: () => Promise<MigrationUpgradeClient>): Promise<void> {}
}
