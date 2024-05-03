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
import core, { DOMAIN_TX, type Status, TxOperations, type Ref } from '@hcengineering/core'
import {
  type ModelLogger,
  createOrUpdate,
  tryMigrate,
  tryUpgrade,
  type MigrateOperation,
  type MigrationClient,
  type MigrationUpgradeClient
} from '@hcengineering/model'
import tags, { type TagCategory } from '@hcengineering/model-tags'
import task, { DOMAIN_TASK, createSequence, migrateDefaultStatusesBase } from '@hcengineering/model-task'
import { type Applicant, recruitId } from '@hcengineering/recruit'

import recruit from './plugin'
import { DOMAIN_SPACE } from '@hcengineering/model-core'
import { defaultApplicantStatuses } from './spaceType'

export const recruitOperation: MigrateOperation = {
  async preMigrate  (client: MigrationClient): Promise<void> {
    await tryMigrate(client, recruitId, [
      {
        state: 'migrate-default-statuses',
        func: migrateDefaultStatuses
      }
    ])
  },
  async migrate (client: MigrationClient): Promise<void> {
    await tryMigrate(client, recruitId, [
      {
        state: 'identifier',
        func: migrateIdentifiers
      },
      {
        state: 'migrate-default-type-mixins',
        func: async (client) => {
          await migrateDefaultTypeMixins(client)
        }
      }
    ])
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    await tryUpgrade(client, recruitId, [
      {
        state: 'create-default-project',
        func: async (client) => {
          const tx = new TxOperations(client, core.account.System)
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

async function migrateDefaultStatuses (client: MigrationClient, logger: ModelLogger): Promise<void> {
  const defaultTypeId = recruit.template.DefaultVacancy
  const typeDescriptor = recruit.descriptors.VacancyType
  const baseClass = recruit.class.Vacancy
  const defaultTaskTypeId = recruit.taskTypes.Applicant
  const taskTypeClass = task.class.TaskType
  const baseTaskClass = recruit.class.Applicant
  const statusAttributeOf = recruit.attribute.State
  const statusClass = core.class.Status
  const getDefaultStatus = (oldStatus: Status): Ref<Status> | undefined => {
    return defaultApplicantStatuses.find(
      (defStatus) =>
        defStatus.category === oldStatus.category &&
        defStatus.name.toLowerCase() === oldStatus.name.trim().toLowerCase()
    )?.id
  }

  await migrateDefaultStatusesBase<Applicant>(
    client,
    defaultTypeId,
    typeDescriptor,
    baseClass,
    defaultTaskTypeId,
    taskTypeClass,
    baseTaskClass,
    statusAttributeOf,
    statusClass,
    getDefaultStatus
  )
}

async function migrateDefaultTypeMixins (client: MigrationClient): Promise<void> {
  const oldSpaceTypeMixin = `${recruit.template.DefaultVacancy}:type:mixin`
  const newSpaceTypeMixin = recruit.mixin.DefaultVacancyTypeData
  const oldTaskTypeMixin = `${recruit.taskTypes.Applicant}:type:mixin`
  const newTaskTypeMixin = recruit.mixin.ApplicantTypeData

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
      _class: recruit.class.Vacancy,
      [oldSpaceTypeMixin]: { $exists: true }
    },
    {
      $rename: {
        [oldSpaceTypeMixin]: newSpaceTypeMixin
      }
    }
  )

  await client.update(
    DOMAIN_TASK,
    {
      _class: recruit.class.Applicant,
      [oldTaskTypeMixin]: { $exists: true }
    },
    {
      $rename: {
        [oldTaskTypeMixin]: newTaskTypeMixin
      }
    }
  )
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
