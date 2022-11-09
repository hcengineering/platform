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

import { Organization } from '@hcengineering/contact'
import core, { Doc, Ref, Space, TxOperations } from '@hcengineering/core'
import { createOrUpdate, MigrateOperation, MigrationClient, MigrationUpgradeClient } from '@hcengineering/model'
import { DOMAIN_CALENDAR } from '@hcengineering/model-calendar'
import contact, { DOMAIN_CONTACT } from '@hcengineering/model-contact'
import { DOMAIN_SPACE } from '@hcengineering/model-core'
import tags, { TagCategory } from '@hcengineering/model-tags'
import { createKanbanTemplate, createSequence } from '@hcengineering/model-task'
import { Vacancy } from '@hcengineering/recruit'
import { getCategories } from '@anticrm/skillset'
import { KanbanTemplate } from '@hcengineering/task'
import recruit from './plugin'

async function fixImportedTitle (client: MigrationClient): Promise<void> {
  await client.update(
    DOMAIN_CONTACT,
    {
      title: { $exists: true }
    },
    {
      $rename: { title: 'recruit:mixin:Candidate.title' }
    }
  )
}

export const recruitOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await fixImportedTitle(client)
    await client.update(
      DOMAIN_CALENDAR,
      {
        _class: recruit.class.Review,
        space: { $nin: [recruit.space.Reviews] }
      },
      {
        space: recruit.space.Reviews
      }
    )

    const vacancies = await client.find<Vacancy>(
      DOMAIN_SPACE,
      { _class: recruit.class.Vacancy, company: { $exists: true } },
      { projection: { _id: 1, company: 1 } }
    )

    const orgIds = Array.from(vacancies.map((it) => it.company))
      .filter((it) => it != null)
      .filter((it, idx, arr) => arr.indexOf(it) === idx) as Ref<Organization>[]
    const orgs = await client.find<Organization>(DOMAIN_CONTACT, {
      _class: contact.class.Organization,
      _id: { $in: orgIds }
    })
    for (const o of orgs) {
      if ((o as any)[recruit.mixin.VacancyList] === undefined) {
        await client.update(
          DOMAIN_CONTACT,
          { _id: o._id },
          {
            [recruit.mixin.VacancyList]: {
              vacancies: vacancies.filter((it) => it.company === o._id).reduce((a) => a + 1, 0)
            }
          }
        )
      }
    }
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    const tx = new TxOperations(client, core.account.System)
    await createDefaults(tx)
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
  await createDefaultKanbanTemplate(tx)
}

async function createDefaultKanbanTemplate (tx: TxOperations): Promise<Ref<KanbanTemplate>> {
  const defaultKanban = {
    states: [
      { color: 9, title: 'HR Interview' },
      { color: 10, title: 'Technical Interview' },
      { color: 1, title: 'Test task' },
      { color: 0, title: 'Offer' }
    ],
    doneStates: [
      { isWon: true, title: 'Won' },
      { isWon: false, title: 'Lost' }
    ]
  }

  return await createKanbanTemplate(tx, {
    kanbanId: recruit.template.DefaultVacancy,
    space: recruit.space.VacancyTemplates as Ref<Doc> as Ref<Space>,
    title: 'Default vacancy',
    description: '',
    shortDescription: '',
    states: defaultKanban.states,
    doneStates: defaultKanban.doneStates
  })
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
        private: true,
        members: [],
        archived: false
      },
      recruit.space.Reviews
    )
  }
}
