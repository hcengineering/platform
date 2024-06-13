//
// Copyright © 2024 Hardcore Engineering Inc.
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

import { type Employee } from '@hcengineering/contact'
import { type Ref, DOMAIN_TX } from '@hcengineering/core'
import {
  tryMigrate,
  type MigrateOperation,
  type MigrationClient,
  type MigrationUpgradeClient
} from '@hcengineering/model'
import core, { DOMAIN_SPACE } from '@hcengineering/model-core'
import { type Product, productsId } from '@hcengineering/products'
import documents from '@hcengineering/controlled-documents'

import products from './plugin'

async function migrateProductSpacesMixins (client: MigrationClient): Promise<void> {
  const oldSpaceTypeMixin = `${products.spaceType.ProductType}:type:mixin`
  const newSpaceTypeMixin = products.mixin.ProductTypeData

  await client.update(
    DOMAIN_TX,
    {
      objectClass: core.class.Attribute,
      'attributes.attributeOf': oldSpaceTypeMixin
    },
    {
      $set: {
        'attributes.attributeOf': newSpaceTypeMixin
      }
    }
  )

  await client.update(
    DOMAIN_SPACE,
    {
      _class: products.class.Product,
      [oldSpaceTypeMixin]: { $exists: true }
    },
    {
      $rename: {
        [oldSpaceTypeMixin]: newSpaceTypeMixin
      }
    }
  )
}

async function migrateProductOwner (client: MigrationClient): Promise<void> {
  type ExProduct = Product & { owner: Ref<Employee> }

  const docs = await client.find<ExProduct>(DOMAIN_SPACE, { _class: products.class.Product, owner: { $exists: true } })
  for (const doc of docs) {
    if (doc.owner == null) continue
    const currentOwners = doc.owners ?? []
    const currenMembers = doc.members ?? []

    const owners = Array.from(new Set(...currentOwners, doc.owner))
    const members = Array.from(new Set(...currenMembers, ...owners))

    await client.update(
      DOMAIN_SPACE,
      { _id: doc._id },
      {
        $set: { owners, members },
        $unset: { owner: undefined }
      }
    )
  }
}

async function migrateSpaceTypes (client: MigrationClient): Promise<void> {
  await client.update(
    DOMAIN_TX,
    {
      _class: core.class.TxCreateDoc,
      objectClass: core.class.SpaceType,
      'attributes.descriptor': products.spaceTypeDescriptor.ProductType
    },
    {
      $set: {
        objectClass: documents.class.DocumentSpaceType,
        'attributes.projects': true
      }
    }
  )
}

export const productsOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await migrateProductSpacesMixins(client)
    await migrateProductOwner(client)
    await tryMigrate(client, productsId, [
      {
        state: 'migrateSpaceTypes',
        func: migrateSpaceTypes
      }
    ])
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {}
}
