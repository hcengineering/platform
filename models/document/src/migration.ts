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

import { TxOperations } from '@hcengineering/core'
import { createOrUpdate, MigrateOperation, MigrationClient, MigrationUpgradeClient } from '@hcengineering/model'
import core from '@hcengineering/model-core'
import tags from '@hcengineering/tags'
import document from './index'

async function createSpace (tx: TxOperations): Promise<void> {
  const contacts = await tx.findOne(core.class.Space, {
    _id: document.space.Documents
  })
  if (contacts === undefined) {
    await tx.createDoc(
      core.class.Space,
      core.space.Space,
      {
        name: 'Documents',
        description: 'Documents',
        private: false,
        archived: false,
        members: []
      },
      document.space.Documents
    )
  }
}

export const documentOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {},
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    const tx = new TxOperations(client, core.account.System)
    await createSpace(tx)

    await createOrUpdate(
      tx,
      tags.class.TagCategory,
      tags.space.Tags,
      {
        icon: tags.icon.Tags,
        label: 'Labels',
        targetClass: document.class.Document,
        tags: [],
        default: true
      },
      document.category.Other
    )
  }
}
