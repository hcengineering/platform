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

import core, { Doc, Ref, Space, TxOperations } from '@anticrm/core'
import { createOrUpdate, MigrateOperation, MigrationClient, MigrationUpgradeClient } from '@anticrm/model'
import tags, { TagCategory } from '@anticrm/model-tags'
import { createKanbanTemplate, createSequence } from '@anticrm/model-task'
import { getCategories } from '@anticrm/skillset'
import { KanbanTemplate } from '@anticrm/task'
import recruit from './plugin'

export const recruitOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {},
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    const tx = new TxOperations(client, core.account.System)
    await createDefaults(tx)
  }
}

async function createDefaults (tx: TxOperations): Promise<void> {
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

  await createSequence(tx, recruit.class.Review)
  await createSequence(tx, recruit.class.Opinion)
  await createSequence(tx, recruit.class.Applicant)
  await createDefaultKanbanTemplate(tx)
  await createReviewTemplates(tx)
}

async function createReviewTemplates (tx: TxOperations): Promise<void> {
  if ((await tx.findOne(core.class.TxCreateDoc, { objectId: recruit.template.Interview })) === undefined) {
    await createKanbanTemplate(tx, {
      kanbanId: recruit.template.Interview,
      space: recruit.space.ReviewTemplates as Ref<Doc> as Ref<Space>,
      title: 'Interview',
      states: [
        { color: 9, title: 'Prepare' },
        { color: 10, title: 'Appointment' },
        { color: 1, title: 'Opinions' }
      ],
      doneStates: [
        { isWon: true, title: 'Pass' },
        { isWon: false, title: 'Failed' }
      ]
    })
  }

  if ((await tx.findOne(core.class.TxCreateDoc, { objectId: recruit.template.Task })) === undefined) {
    await createKanbanTemplate(tx, {
      kanbanId: recruit.template.Task,
      space: recruit.space.ReviewTemplates as Ref<Doc> as Ref<Space>,
      title: 'Test task',
      states: [
        { color: 9, title: 'Prepare' },
        { color: 10, title: 'Assigned' },
        { color: 1, title: 'Review' },
        { color: 4, title: 'Opinions' }
      ],
      doneStates: [
        { isWon: true, title: 'Pass' },
        { isWon: false, title: 'Failed' }
      ]
    })
  }
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
    states: defaultKanban.states,
    doneStates: defaultKanban.doneStates
  })
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
