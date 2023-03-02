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

import core, { AccountRole, Client, TxOperations } from '@hcengineering/core'
import { MigrateOperation, MigrationClient, MigrationUpgradeClient } from '@hcengineering/model'

export const coreOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {},
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    await createSystemAccount(client)
  }
}

async function createSystemAccount (client: Client): Promise<void> {
  const current = await client.findOne(core.class.Account, { _id: core.account.System })
  if (current === undefined) {
    const txop = new TxOperations(client, core.account.System)
    await txop.createDoc(
      core.class.Account,
      core.space.Model,
      {
        email: 'anticrm@hc.engineering',
        role: AccountRole.Owner
      },
      core.account.System
    )
  }
}
