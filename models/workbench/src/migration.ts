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
import {
  type MigrateOperation,
  type MigrationClient,
  type MigrationUpgradeClient,
  tryMigrate
} from '@hcengineering/model'
import { DOMAIN_PREFERENCE } from '@hcengineering/preference'
import workbench, { type WorkbenchTab } from '@hcengineering/workbench'
import core, { type AccountUuid, DOMAIN_TX, MeasureMetricsContext, type PersonId } from '@hcengineering/core'
import { getAccountUuidBySocialKey, getSocialKeyByOldAccount } from '@hcengineering/model-core'

import { workbenchId } from '.'

async function removeTabs (client: MigrationClient): Promise<void> {
  await client.deleteMany(DOMAIN_PREFERENCE, { _class: workbench.class.WorkbenchTab })
}

async function migrateTabsToSocialIds (client: MigrationClient): Promise<void> {
  const ctx = new MeasureMetricsContext('workbench migrateTabsToSocialIds', {})
  ctx.info('migrating workbench tabs to social ids...')
  const socialKeyByAccount = await getSocialKeyByOldAccount(client)
  const tabs = await client.find<WorkbenchTab>(DOMAIN_PREFERENCE, { _class: workbench.class.WorkbenchTab })
  for (const tab of tabs) {
    const newAttachedTo: any = socialKeyByAccount[tab.attachedTo]
    if (newAttachedTo != null && newAttachedTo !== tab.attachedTo) {
      await client.update(DOMAIN_PREFERENCE, { _id: tab._id }, { attachedTo: newAttachedTo })
    }
  }
  ctx.info('migrating workbench tabs to social ids completed...')
}

async function migrateSocialIdsToGlobalAccounts (client: MigrationClient): Promise<void> {
  const ctx = new MeasureMetricsContext('workbench migrateSocialIdsToGlobalAccounts', {})
  ctx.info('migrating workbench tabs to global accounts...')
  const accountUuidBySocialKey = new Map<PersonId, AccountUuid | null>()

  const tabs = await client.find<WorkbenchTab>(DOMAIN_PREFERENCE, { _class: workbench.class.WorkbenchTab })
  for (const tab of tabs) {
    const newAttachedTo = await getAccountUuidBySocialKey(
      client,
      tab.attachedTo as unknown as PersonId,
      accountUuidBySocialKey
    )
    if (newAttachedTo != null && newAttachedTo !== tab.attachedTo) {
      await client.update(DOMAIN_PREFERENCE, { _id: tab._id }, { attachedTo: newAttachedTo })
    }
  }
  ctx.info('migrating workbench tabs to global accounts completed...')
}

export const workbenchOperation: MigrateOperation = {
  async migrate (client: MigrationClient, mode): Promise<void> {
    await tryMigrate(mode, client, workbenchId, [
      {
        state: 'remove-wrong-tabs-v1',
        mode: 'upgrade',
        func: removeTabs
      },
      {
        state: 'remove-txes-update-tabs-v1',
        mode: 'upgrade',
        func: async () => {
          await client.deleteMany(DOMAIN_TX, {
            objectClass: workbench.class.WorkbenchTab,
            _class: core.class.TxUpdateDoc
          })
        }
      },
      {
        state: 'tabs-accounts-to-social-ids',
        func: migrateTabsToSocialIds
      },
      {
        state: 'tabs-social-ids-to-global-accounts',
        func: migrateSocialIdsToGlobalAccounts
      }
    ])
  },
  async upgrade (state: Map<string, Set<string>>, client: () => Promise<MigrationUpgradeClient>): Promise<void> {}
}
