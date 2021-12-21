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

import { TxOperations } from '@anticrm/core'
import {
  MigrateOperation,
  MigrationClient,
  MigrationUpgradeClient
} from '@anticrm/model'

import core from './component'

export const coreOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {},
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    const ops = new TxOperations(client, core.account.System)
    const targetSpaces = (await client.findAll(core.class.Space, {}))
      .filter((space) => space.archived == null)

    await Promise.all(targetSpaces.map(
      (space) => ops.updateDoc(space._class, space.space, space._id, { archived: false })
    )).catch((e) => console.error(e))
  }
}
