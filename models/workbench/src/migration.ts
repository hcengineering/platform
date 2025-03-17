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
import workbench from '@hcengineering/workbench'
import core, { DOMAIN_TX } from '@hcengineering/core'

import { workbenchId } from '.'

async function removeTabs (client: MigrationClient): Promise<void> {
  await client.deleteMany(DOMAIN_PREFERENCE, { _class: workbench.class.WorkbenchTab })
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
      }
    ])
  },
  async upgrade (state: Map<string, Set<string>>, client: () => Promise<MigrationUpgradeClient>): Promise<void> {}
}
