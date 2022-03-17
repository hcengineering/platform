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

import { DOMAIN_TX, TxOperations } from '@anticrm/core'
import {
  MigrateOperation,
  MigrationClient,
  MigrationUpgradeClient
} from '@anticrm/model'
import core from './component'

async function migrateSpaces (client: MigrationUpgradeClient): Promise<void> {
  const currentSpaces = (await client.findAll(core.class.Space, {})).map((s) => s._id)
  const descendants = client.getHierarchy().getDescendants(core.class.Space)
  const removedSpaces = (await client.findAll(core.class.TxRemoveDoc, { objectClass: { $in: descendants } })).map((s) => s.objectId)
  let createTxes = await client.findAll(core.class.TxCreateDoc, {
    objectClass: { $in: descendants },
    objectId: { $nin: [...currentSpaces, ...removedSpaces] }
  })

  // TXes already stored, avoid dublicate id error
  createTxes = createTxes.map((p) => {
    return {
      ...p,
      space: core.space.DerivedTx
    }
  })
  await Promise.all(createTxes.map(async (tx) => await client.tx(tx)))
  let updateTxes = await client.findAll(core.class.TxUpdateDoc, {
    objectClass: { $in: descendants },
    objectId: { $nin: [...currentSpaces, ...removedSpaces] }
  }, {
    sort: {
      modifiedOn: 1
    }
  })
  // TXes already stored, avoid dublicate id error
  updateTxes = updateTxes.map((p) => {
    return {
      ...p,
      space: core.space.DerivedTx
    }
  })
  for (const tx of updateTxes) {
    await client.tx(tx)
  }
}

export const coreOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await client.update(DOMAIN_TX, {
      objectSpace: core.space.Model,
      objectClass: {
        $in: ['core:class:Space', 'contact:class:Organizations', 'contact:class:Persons',
          'chunter:class:Channel', 'task:class:SpaceWithStates', 'task:class:Project', 'recruit:class:ReviewCategory',
          'recruit:class:Candidates', 'recruit:class:Vacancy', 'lead:class:Funnel']
      }
    }, {
      objectSpace: core.space.Space
    })
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    const targetSpaces = (await client.findAll(core.class.Space, {}))
      .filter((space) => space.archived == null)

    // Modify spaces by their's creators
    await Promise.all(targetSpaces.map(
      (space) => new TxOperations(client, space.modifiedBy).updateDoc(space._class, space.space, space._id, { archived: false })
    )).catch((e) => console.error(e))

    await migrateSpaces(client)
  }
}
