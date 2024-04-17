//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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

import core, { coreId, DOMAIN_DOC_INDEX_STATE, isClassIndexable, TxOperations } from '@hcengineering/core'
import {
  tryUpgrade,
  type MigrateOperation,
  type MigrationClient,
  type MigrationUpgradeClient
} from '@hcengineering/model'

export const coreOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    // We need to delete all documents in doc index state for missing classes
    const allClasses = client.hierarchy.getDescendants(core.class.Doc)
    const allIndexed = allClasses.filter((it) => isClassIndexable(client.hierarchy, it))

    // Next remove all non indexed classes and missing classes as well.
    await client.update(
      DOMAIN_DOC_INDEX_STATE,
      { objectClass: { $nin: allIndexed } },
      {
        $set: {
          removed: true
        }
      }
    )
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    await tryUpgrade(client, coreId, [
      {
        state: 'create-defaults',
        func: async (client) => {
          const tx = new TxOperations(client, core.account.System)

          const spaceSpace = await tx.findOne(core.class.Space, {
            _id: core.space.Space
          })
          if (spaceSpace === undefined) {
            await tx.createDoc(
              core.class.Space,
              core.space.Space,
              {
                name: 'Space for all spaces',
                description: 'Spaces',
                private: false,
                archived: false,
                members: []
              },
              core.space.Space
            )
          }
        }
      }
    ])
  }
}
