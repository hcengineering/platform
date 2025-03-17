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

import { TxOperations, type Ref, type Space } from '@hcengineering/core'
import { type Department } from '@hcengineering/hr'
import {
  migrateSpace,
  tryMigrate,
  tryUpgrade,
  type MigrateOperation,
  type MigrationClient,
  type MigrationUpgradeClient
} from '@hcengineering/model'
import core, { DOMAIN_SPACE } from '@hcengineering/model-core'
import hr, { DOMAIN_HR, hrId } from './index'

async function createDepartment (tx: TxOperations): Promise<void> {
  const current = await tx.findOne(hr.class.Department, {
    _id: hr.ids.Head
  })
  if (current === undefined) {
    await tx.createDoc(
      hr.class.Department,
      core.space.Workspace,
      {
        name: 'Organization',
        description: '',
        members: [],
        teamLead: null,
        managers: []
      },
      hr.ids.Head
    )
  }
}

async function migrateDepartments (client: MigrationClient): Promise<void> {
  await client.update(
    DOMAIN_HR,
    { _class: hr.class.PublicHoliday, space: { $ne: core.space.Workspace } },
    { space: core.space.Workspace }
  )
  const objects = await client.find(DOMAIN_HR, { space: { $ne: core.space.Workspace }, _class: hr.class.Request })
  for (const obj of objects) {
    await client.update(DOMAIN_HR, { _id: obj._id }, { space: core.space.Workspace, department: obj.space })
  }
  await client.move(DOMAIN_SPACE, { _class: hr.class.Department }, DOMAIN_HR)
  const departments = await client.find<Department>(DOMAIN_HR, {
    _class: hr.class.Department,
    space: { $ne: core.space.Workspace }
  })
  for (const department of departments) {
    const upd: Partial<Department> = {
      space: core.space.Workspace
    }
    if (department._id !== hr.ids.Head) {
      upd.parent = department.space as unknown as Ref<Department>
    }
    await client.update(DOMAIN_HR, { _id: department._id }, upd)
  }
  await client.update(
    DOMAIN_HR,
    { _class: hr.class.Department },
    { $unset: { archived: true, private: true, owners: true, autoJoin: true } }
  )
}

export const hrOperation: MigrateOperation = {
  async migrate (client: MigrationClient, mode): Promise<void> {
    await tryMigrate(mode, client, hrId, [
      {
        state: 'migrateDepartments',
        mode: 'upgrade',
        func: migrateDepartments
      },
      {
        state: 'removeDeprecatedSpace',
        func: async (client: MigrationClient) => {
          await migrateSpace(client, 'hr:space:HR' as Ref<Space>, core.space.Workspace, [DOMAIN_HR])
        }
      }
    ])
  },
  async upgrade (state: Map<string, Set<string>>, client: () => Promise<MigrationUpgradeClient>, mode): Promise<void> {
    await tryUpgrade(mode, state, client, hrId, [
      {
        state: 'create-defaults-v2',
        func: async (client) => {
          const tx = new TxOperations(client, core.account.System)
          await createDepartment(tx)
        }
      }
    ])
  }
}
