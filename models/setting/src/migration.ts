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

import core, { DOMAIN_TX, Doc, TxOperations } from '@hcengineering/core'
import { MigrateOperation, MigrationClient, MigrationUpgradeClient } from '@hcengineering/model'
import setting from './plugin'
import { DOMAIN_SETTING } from '.'
import notification, { Collaborators } from '@hcengineering/notification'

async function migrateIntegrationsSpace (client: MigrationClient): Promise<void> {
  const settings = await client.find(DOMAIN_SETTING, {
    _class: setting.class.Integration,
    space: { $ne: setting.space.Setting }
  })
  for (const object of settings) {
    await client.update(
      DOMAIN_SETTING,
      {
        _id: object._id
      },
      {
        space: setting.space.Setting
      }
    )
    await client.update(
      DOMAIN_TX,
      {
        objectId: object._id,
        objectSpace: { $ne: setting.space.Setting }
      },
      {
        objectSpace: setting.space.Setting
      }
    )
  }
}

async function createSpace (tx: TxOperations): Promise<void> {
  const current = await tx.findOne(core.class.Space, {
    _id: setting.space.Setting
  })
  if (current === undefined) {
    await tx.createDoc(
      core.class.Space,
      core.space.Space,
      {
        name: 'Setting',
        description: 'Setting space',
        private: false,
        archived: false,
        members: []
      },
      setting.space.Setting
    )
  }
}

async function fillMigrationCollaborator (tx: TxOperations): Promise<void> {
  const h = tx.getHierarchy()
  const settings = await tx.findAll(setting.class.Integration, {})
  for (const value of settings) {
    if (h.hasMixin(value, notification.mixin.Collaborators)) {
      const collabs = h.as<Doc, Collaborators>(value, notification.mixin.Collaborators)
      const target = collabs.createdBy ?? collabs.modifiedBy
      if (collabs.collaborators === undefined || !collabs.collaborators.includes(target)) {
        const res = tx.txFactory.createTxMixin<Doc, Collaborators>(
          value._id,
          value._class,
          value.space,
          notification.mixin.Collaborators,
          {
            collaborators: [target]
          }
        )
        res.space = core.space.DerivedTx
        await tx.tx(res)
      }
    } else {
      const res = tx.txFactory.createTxMixin<Doc, Collaborators>(
        value._id,
        setting.class.Integration,
        value.space,
        notification.mixin.Collaborators,
        {
          collaborators: [value.createdBy ?? value.modifiedBy]
        }
      )
      res.space = core.space.DerivedTx
      await tx.tx(res)
    }
  }
}

export const settingOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await migrateIntegrationsSpace(client)
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    const tx = new TxOperations(client, core.account.System)
    await createSpace(tx)
    await fillMigrationCollaborator(tx)
  }
}
