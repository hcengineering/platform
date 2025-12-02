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
import { DOMAIN_DOCUMENTS } from '@hcengineering/model-controlled-documents'
import products, { productsId } from '@hcengineering/products'

async function migratePatchVersion (client: MigrationClient): Promise<void> {
  await client.update(
    DOMAIN_DOCUMENTS,
    {
      _class: products.class.ProductVersion,
      patch: { $exists: false }
    },
    {
      patch: 0
    }
  )
}

export const productsOperation: MigrateOperation = {
  async migrate (client: MigrationClient, mode): Promise<void> {
    await tryMigrate(mode, client, productsId, [
      {
        state: 'migratePatchVersion',
        func: migratePatchVersion
      }
    ])
  },
  async upgrade (state: Map<string, Set<string>>, client: () => Promise<MigrationUpgradeClient>): Promise<void> {}
}
