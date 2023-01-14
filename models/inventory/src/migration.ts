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
import { MigrateOperation, MigrationClient, MigrationUpgradeClient } from '@hcengineering/model'
import core from '@hcengineering/model-core'
import view from '@hcengineering/view'
import inventory from './plugin'

export const inventoryOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {},
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    const tx = new TxOperations(client, core.account.System)
    await migrateViewletPreference(tx)
  }
}

async function migrateViewletPreference (client: TxOperations): Promise<void> {
  const preferences = await client.findAll(view.class.ViewletPreference, {
    attachedTo: inventory.viewlet.TableProduct
  })
  for (const pref of preferences) {
    let needUpdate = false
    const keys = ['attachedTo']
    for (const key of keys) {
      const index = pref.config.findIndex((p) => p === `$lookup.${key}`)
      if (index !== -1) {
        pref.config.splice(index, 1, key)
        needUpdate = true
      }
    }
    if (needUpdate) {
      await client.update(pref, {
        config: pref.config
      })
    }
  }
}
