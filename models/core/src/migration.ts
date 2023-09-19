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

import core, { TxOperations } from '@hcengineering/core'
import { MigrateOperation, MigrationClient, MigrationUpgradeClient } from '@hcengineering/model'

export const coreOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {},
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
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
