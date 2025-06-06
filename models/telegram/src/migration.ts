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

import core, { type Ref, type Space } from '@hcengineering/core'
import {
  migrateSpace,
  tryMigrate,
  type MigrateOperation,
  type MigrationClient,
  type MigrationUpgradeClient
} from '@hcengineering/model'
import { telegramId } from '@hcengineering/telegram'
import { DOMAIN_TELEGRAM } from '.'

export const telegramOperation: MigrateOperation = {
  async migrate (client: MigrationClient, mode): Promise<void> {
    await tryMigrate(mode, client, telegramId, [
      {
        state: 'removeDeprecatedSpace',
        func: async (client: MigrationClient) => {
          await migrateSpace(client, 'telegram:space:Telegram' as Ref<Space>, core.space.Workspace, [DOMAIN_TELEGRAM])
        }
      }
    ])
  },
  async upgrade (state: Map<string, Set<string>>, client: () => Promise<MigrationUpgradeClient>): Promise<void> {}
}
