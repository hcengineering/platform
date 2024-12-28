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

import core, { MeasureMetricsContext, type Ref, type Space } from '@hcengineering/core'
import {
  migrateSpace,
  type MigrateUpdate,
  type MigrationDocumentQuery,
  tryMigrate,
  type MigrateOperation,
  type MigrationClient,
  type MigrationUpgradeClient
} from '@hcengineering/model'
import setting, { type Integration, settingId } from '@hcengineering/setting'
import { getSocialIdByOldAccount } from '@hcengineering/model-core'

import { DOMAIN_SETTING } from '.'

async function migrateAccountsToSocialIds (client: MigrationClient): Promise<void> {
  const ctx = new MeasureMetricsContext('setting migrateAccountsToSocialIds', {})
  const socialIdByAccount = await getSocialIdByOldAccount(client)

  ctx.info('processing setting integration shared ', {})
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

        const newShared = integration.shared.map((s) => socialIdByAccount[s] ?? s)

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
      ctx.info('...processed', { count: processed })
    }
  } finally {
    await iterator.close()
  }
  ctx.info('finished processing setting integration shared ', {})
}

export const settingOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await tryMigrate(client, settingId, [
      {
        state: 'removeDeprecatedSpace',
        func: async (client: MigrationClient) => {
          await migrateSpace(client, 'setting:space:Setting' as Ref<Space>, core.space.Workspace, [DOMAIN_SETTING])
        }
      },
      {
        state: 'accounts-to-social-ids',
        func: migrateAccountsToSocialIds
      }
    ])
  },
  async upgrade (state: Map<string, Set<string>>, client: () => Promise<MigrationUpgradeClient>): Promise<void> {}
}
