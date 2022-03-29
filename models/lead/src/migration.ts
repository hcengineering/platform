//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
import { MigrateOperation, MigrationClient, MigrationUpgradeClient } from '@anticrm/model'
import core from '@anticrm/model-core'
import lead from './plugin'

async function createSpace (tx: TxOperations): Promise<void> {
  const current = await tx.findOne(core.class.Space, {
    _id: lead.space.DefaultFunnel
  })
  if (current === undefined) {
    await tx.createDoc(
      lead.class.Funnel,
      core.space.Space,
      {
        name: 'Funnel',
        description: 'Default funnel',
        private: false,
        archived: false,
        members: []
      },
      lead.space.DefaultFunnel
    )
  }
}

export const leadOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    const ops = new TxOperations(client, core.account.System)
    await createSpace(ops)
  }
}
