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

import { getCategories } from '@anticrm/skillset'
import core, { TxOperations, type Ref } from '@hcengineering/core'
import {
  createOrUpdate,
  tryMigrate,
  tryUpgrade,
  type MigrateOperation,
  type MigrationClient,
  type MigrationUpgradeClient
} from '@hcengineering/model'
import tags, { type TagCategory } from '@hcengineering/model-tags'
import { DOMAIN_TASK, createProjectType, createSequence, fixTaskTypes } from '@hcengineering/model-task'
import { type Applicant, recruitId } from '@hcengineering/recruit'
import task, { type ProjectType } from '@hcengineering/task'
import { PaletteColorIndexes } from '@hcengineering/ui/src/colors'
import recruit from './plugin'
import { DOMAIN_SPACE } from '@hcengineering/model-core'

export const recruitOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await tryMigrate(client, recruitId, [
      {
        state: 'fix-category-descriptors',
        func: async (client) => {
          await client.update(
            DOMAIN_SPACE,
            { _class: task.class.ProjectType, category: 'recruit:category:VacancyTypeCategories' },
            {
              $set: { descriptor: recruit.descriptors.VacancyType },
              $unset: { category: 1 }
            }
          )
        }
      },
      {
        state: 'fixTaskStatus',
        func: async (client): Promise<void> => {
          await fixTaskTypes(client, recruit.descriptors.VacancyType, async () => [
            {
              name: 'Applicant',
              descriptor: recruit.descriptors.Application,
              ofClass: recruit.class.Applicant,
              targetClass: recruit.class.Applicant,
              statusCategories: [
                task.statusCategory.UnStarted,
                task.statusCategory.Active,
                task.statusCategory.Won,
                task.statusCategory.Lost
              ],
              statusClass: core.class.Status,
              kind: 'task'
            }
          ])
        }
      },
      {
        state: 'identifier',
        func: migrateIdentifiers
      }
    ])
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    const tx = new TxOperations(client, core.account.System)
    // For now need to be created every time as it's system model
    await createDefaultKanbanTemplate(tx)

    await tryUpgrade(client, recruitId, [
      {
        state: 'create-default-project',
        func: async (client) => {
          await createDefaults(tx)
        }
      },
      {
        state: 'remove-members',
        func: async (client): Promise<void> => {
          const ops = new TxOperations(client, core.account.System)
          const docs = await ops.findAll(recruit.class.Vacancy, { members: { $exists: true, $ne: [] } })
          for (const d of docs) {
            await ops.update(d, { members: [] })
          }
        }
      }
    ])
  }
}

async function migrateIdentifiers (client: MigrationClient): Promise<void> {
  const docs = await client.find<Applicant>(DOMAIN_TASK, {
    _class: recruit.class.Applicant,
    identifier: { $exists: false }
  })
  for (const doc of docs) {
    await client.update(
      DOMAIN_TASK,
      { _id: doc._id },
      {
        identifier: `APP-${doc.number}`
      }
    )
  }
}

async function createDefaults (tx: TxOperations): Promise<void> {
  await createSpaces(tx)

  await createOrUpdate(
    tx,
    tags.class.TagCategory,
    tags.space.Tags,
    {
      icon: recruit.icon.Skills,
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
        icon: recruit.icon.Skills,
        label: c.label,
        targetClass: recruit.mixin.Candidate,
        tags: c.skills,
        default: false
      },
      (recruit.category.Category + '.' + c.id) as Ref<TagCategory>
    )
  }

  await createSequence(tx, recruit.class.Review)
  await createSequence(tx, recruit.class.Opinion)
  await createSequence(tx, recruit.class.Applicant)
  await createSequence(tx, recruit.class.Vacancy)
}

async function createDefaultKanbanTemplate (tx: TxOperations): Promise<Ref<ProjectType>> {
  return await createProjectType(
    tx,
    {
      name: 'Default vacancy',
      descriptor: recruit.descriptors.VacancyType,
      description: '',
      tasks: [],
      roles: 0,
      classic: false
    },
    [
      {
        _id: recruit.taskTypes.Applicant,
        name: 'Applicant',
        descriptor: recruit.descriptors.Application,
        ofClass: recruit.class.Applicant,
        targetClass: recruit.class.Applicant,
        statusCategories: [
          task.statusCategory.UnStarted,
          task.statusCategory.Active,
          task.statusCategory.Won,
          task.statusCategory.Lost
        ],
        statusClass: core.class.Status,
        kind: 'task',
        factory: [
          {
            color: PaletteColorIndexes.Coin,
            name: 'Backlog',
            ofAttribute: recruit.attribute.State,
            category: task.statusCategory.UnStarted
          },
          {
            color: PaletteColorIndexes.Coin,
            name: 'HR Interview',
            ofAttribute: recruit.attribute.State,
            category: task.statusCategory.Active
          },
          {
            color: PaletteColorIndexes.Cerulean,
            name: 'Technical Interview',
            ofAttribute: recruit.attribute.State,
            category: task.statusCategory.Active
          },
          {
            color: PaletteColorIndexes.Waterway,
            name: 'Test task',
            ofAttribute: recruit.attribute.State,
            category: task.statusCategory.Active
          },
          {
            color: PaletteColorIndexes.Grass,
            name: 'Offer',
            ofAttribute: recruit.attribute.State,
            category: task.statusCategory.Active
          },
          { name: 'Won', ofAttribute: recruit.attribute.State, category: task.statusCategory.Won },
          { name: 'Lost', ofAttribute: recruit.attribute.State, category: task.statusCategory.Lost }
        ]
      }
    ],
    recruit.template.DefaultVacancy
  )
}

async function createSpaces (tx: TxOperations): Promise<void> {
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

  const currentReviews = await tx.findOne(core.class.Space, {
    _id: recruit.space.Reviews
  })
  if (currentReviews === undefined) {
    await tx.createDoc(
      core.class.Space,
      core.space.Space,
      {
        name: 'Reviews',
        description: 'Public reviews',
        private: false,
        members: [],
        archived: false
      },
      recruit.space.Reviews
    )
  } else if (currentReviews.private) {
    await tx.update(currentReviews, { private: false })
  }
}
