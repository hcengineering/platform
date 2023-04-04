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

import core, { TxOperations } from '@hcengineering/core'
import { MigrateOperation, MigrationClient, MigrationUpgradeClient } from '@hcengineering/model'
import telegram from './plugin'

export const telegramOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {},
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    const tx = new TxOperations(client, core.account.System)
    const current = await tx.findOne(core.class.Space, {
      _id: telegram.space.Telegram
    })
    if (current === undefined) {
      await tx.createDoc(
        core.class.Space,
        core.space.Space,
        {
          name: 'Telegram',
          description: 'Space for all telegram messages',
          private: false,
          archived: false,
          members: []
        },
        telegram.space.Telegram
      )
    }
  }
}
