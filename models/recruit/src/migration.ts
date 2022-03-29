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

import core, { Ref, TxOperations } from '@anticrm/core'
import { createOrUpdate, MigrateOperation, MigrationClient, MigrationUpgradeClient } from '@anticrm/model'
import tags, { TagCategory } from '@anticrm/model-tags'
import { getCategories } from '@anticrm/skillset'
import { createReviewTemplates, createSequence } from './creation'
import recruit from './plugin'

export const recruitOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    const tx = new TxOperations(client, core.account.System)

    await createSpace(tx)

    await createOrUpdate(
      tx,
      tags.class.TagCategory,
      tags.space.Tags,
      {
        icon: tags.icon.Tags,
        label: 'Other',
        targetClass: recruit.mixin.Candidate,
        tags: [],
        default: true
      },
      recruit.category.Other
    )

    for (const c of getCategories()) {
      await createOrUpdate(
        tx,
        tags.class.TagCategory,
        tags.space.Tags,
        {
          icon: tags.icon.Tags,
          label: c.label,
          targetClass: recruit.mixin.Candidate,
          tags: c.skills,
          default: false
        },
        (recruit.category.Category + '.' + c.id) as Ref<TagCategory>
      )
    }

    await createReviewTemplates(tx)
    await createSequence(tx, recruit.class.Review)
    await createSequence(tx, recruit.class.Opinion)
  }
}

async function createSpace (tx: TxOperations): Promise<void> {
  const current = await tx.findOne(core.class.Space, {
    _id: recruit.space.CandidatesPublic
  })
  if (current === undefined) {
    await tx.createDoc(
      recruit.class.Candidates,
      core.space.Space,
      {
        name: 'public',
        description: 'Public Candidates',
        private: false,
        members: [],
        archived: false
      },
      recruit.space.CandidatesPublic
    )
  }
}
