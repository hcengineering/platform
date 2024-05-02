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

import core, {
  coreId,
  DOMAIN_DOC_INDEX_STATE,
  DOMAIN_STATUS,
  isClassIndexable,
  type Status,
  TxOperations,
  generateId,
  DOMAIN_TX,
  type TxCreateDoc,
  type Space
} from '@hcengineering/core'
import {
  tryMigrate,
  tryUpgrade,
  type MigrateOperation,
  type MigrationClient,
  type MigrationUpgradeClient
} from '@hcengineering/model'
import { DOMAIN_SPACE } from './security'

async function migrateStatusesToModel (client: MigrationClient): Promise<void> {
  // Move statuses to model:
  // Migrate the default ones with well-known ids as system's model
  // And the rest as user's model
  // Skip __superseded statuses
  const allStatuses = await client.find<Status>(DOMAIN_STATUS, {
    _class: core.class.Status,
    __superseded: { $exists: false }
  })

  for (const status of allStatuses) {
    const isSystem = (status as any).__migratedFrom !== undefined
    const modifiedBy =
      status.modifiedBy === core.account.System
        ? isSystem
          ? core.account.System
          : core.account.ConfigUser
        : status.modifiedBy

    const tx: TxCreateDoc<Status> = {
      _id: generateId(),
      _class: core.class.TxCreateDoc,
      space: core.space.Tx,
      objectId: status._id,
      objectClass: status._class,
      objectSpace: core.space.Model,
      attributes: {
        ofAttribute: status.ofAttribute,
        category: status.category,
        name: status.name,
        color: status.color,
        description: status.description
      },
      modifiedOn: status.modifiedOn,
      createdBy: status.createdBy,
      createdOn: status.createdOn,
      modifiedBy
    }

    await client.create(DOMAIN_TX, tx)
  }
}

async function migrateAllSpaceToTyped (client: MigrationClient): Promise<void> {
  await client.update(
    DOMAIN_SPACE,
    {
      _id: core.space.Space,
      _class: core.class.Space
    },
    {
      $set: {
        _class: core.class.TypedSpace,
        type: core.spaceType.SpacesType
      }
    }
  )
}

async function migrateSpacesOwner (client: MigrationClient): Promise<void> {
  const targetClasses = client.hierarchy.getDescendants(core.class.Space)
  const targetSpaces = await client.find<Space>(DOMAIN_SPACE, {
    _class: { $in: targetClasses },
    owners: { $exists: false }
  })

  for (const space of targetSpaces) {
    await client.update(
      DOMAIN_SPACE,
      {
        _id: space._id
      },
      {
        $set: {
          owners: [space.createdBy]
        }
      }
    )
  }
}

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
    await tryMigrate(client, coreId, [
      {
        state: 'statuses-to-model',
        func: migrateStatusesToModel
      },
      {
        state: 'all-space-to-typed',
        func: migrateAllSpaceToTyped
      },
      {
        state: 'add-spaces-owner',
        func: migrateSpacesOwner
      }
    ])
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
              core.class.TypedSpace,
              core.space.Space,
              {
                name: 'Space for all spaces',
                description: 'Spaces',
                private: false,
                archived: false,
                members: [],
                type: core.spaceType.SpacesType
              },
              core.space.Space
            )
          }
        }
      }
    ])
  }
}
