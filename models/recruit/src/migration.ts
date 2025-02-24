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
import core, {
  DOMAIN_MODEL_TX,
  toIdMap,
  TxOperations,
  type Doc,
  type Ref,
  type Space,
  type Status
} from '@hcengineering/core'
import {
  createOrUpdate,
  migrateSpace,
  tryMigrate,
  tryUpgrade,
  type MigrateOperation,
  type MigrationClient,
  type MigrationUpgradeClient,
  type ModelLogger
} from '@hcengineering/model'
import tags, { type TagCategory } from '@hcengineering/model-tags'
import task, { createSequence, DOMAIN_TASK, migrateDefaultStatusesBase } from '@hcengineering/model-task'
import { recruitId, type Applicant } from '@hcengineering/recruit'

import { DOMAIN_CALENDAR } from '@hcengineering/model-calendar'
import { DOMAIN_SPACE } from '@hcengineering/model-core'
import recruit from './plugin'
import { defaultApplicantStatuses } from './spaceType'

export const recruitOperation: MigrateOperation = {
  async preMigrate (client: MigrationClient, logger: ModelLogger): Promise<void> {
    await tryMigrate(client, recruitId, [
      {
        state: 'migrate-default-statuses',
        func: (client) => migrateDefaultStatuses(client, logger)
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
      },
      {
        state: 'removeDeprecatedSpace',
        func: async (client: MigrationClient) => {
          await migrateSpace(client, 'recruit:space:Reviews' as Ref<Space>, core.space.Workspace, [DOMAIN_CALENDAR])
        }
      },
      {
        state: 'migrate-applicants',
        func: async (client: MigrationClient) => {
          await client.update(
            DOMAIN_TASK,
            { _class: recruit.class.Applicant, isDone: { $nin: [false, true] } },
            { isDone: false }
          )
        }
      }
    ])
  },
  async upgrade (state: Map<string, Set<string>>, client: () => Promise<MigrationUpgradeClient>): Promise<void> {
    await tryUpgrade(state, client, recruitId, [
      {
        state: 'create-defaults-v2',
        func: async (client) => {
          const tx = new TxOperations(client, core.account.System)
          await createDefaults(client, tx)
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
    logger,
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
    DOMAIN_MODEL_TX,
    {
      objectClass: core.class.Attribute,
      'attributes.attributeOf': oldSpaceTypeMixin
    },
    {
      'attributes.attributeOf': newSpaceTypeMixin
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

async function createDefaults (client: MigrationUpgradeClient, tx: TxOperations): Promise<void> {
  await createOrUpdate(
    tx,
    tags.class.TagCategory,
    core.space.Workspace,
    {
      icon: recruit.icon.Skills,
      label: 'Other',
      targetClass: recruit.mixin.Candidate,
      tags: [],
      default: true
    },
    recruit.category.Other
  )
  const ops = tx.apply()

  const cats = getCategories().filter((it, idx, arr) => arr.findIndex((qt) => qt.id === it.id) === idx)

  const existingCategories = toIdMap(
    await client.findAll<Doc>(tags.class.TagCategory, { targetClass: recruit.mixin.Candidate })
  )
  for (const c of cats) {
    await createOrUpdate(
      ops,
      tags.class.TagCategory,
      core.space.Workspace,
      {
        icon: recruit.icon.Skills,
        label: c.label,
        targetClass: recruit.mixin.Candidate,
        tags: c.skills,
        default: false
      },
      (recruit.category.Category + '.' + c.id) as Ref<TagCategory>,
      existingCategories
    )
  }
  await ops.commit()

  await createSequence(tx, recruit.class.Review)
  await createSequence(tx, recruit.class.Opinion)
  await createSequence(tx, recruit.class.Applicant)
  await createSequence(tx, recruit.class.Vacancy)
}
