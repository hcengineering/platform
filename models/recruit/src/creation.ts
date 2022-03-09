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

import type { Class, Client } from '@anticrm/core'
import core, { Doc, Ref, Space, TxOperations } from '@anticrm/core'
import { createKanbanTemplate } from '@anticrm/model-task'
import task, { KanbanTemplate } from '@anticrm/task'
import recruit from './plugin'

export async function createDeps (client: Client): Promise<void> {
  const tx = new TxOperations(client, core.account.System)

  await createSequence(tx, recruit.class.Applicant)
  await createSequence(tx, recruit.class.Review)
  await createSequence(tx, recruit.class.Opinion)

  await createDefaultKanbanTemplate(tx)
  await createReviewTemplates(tx)
}

export async function createSequence (tx: TxOperations, _class: Ref<Class<Doc>>): Promise<void> {
  if (await tx.findOne(task.class.Sequence, { attachedTo: _class }) === undefined) {
    await tx.createDoc(
      task.class.Sequence,
      task.space.Sequence,
      {
        attachedTo: _class,
        sequence: 0
      }
    )
  }
}

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

/**
 * @public
 */
export const createDefaultKanbanTemplate = async (client: TxOperations): Promise<Ref<KanbanTemplate>> =>
  await createKanbanTemplate(client, {
    kanbanId: recruit.template.DefaultVacancy,
    space: recruit.space.VacancyTemplates as Ref<Doc> as Ref<Space>,
    title: 'Default vacancy',
    states: defaultKanban.states,
    doneStates: defaultKanban.doneStates
  })

export async function createReviewTemplates (tx: TxOperations): Promise<void> {
  if (await tx.findOne(core.class.TxCreateDoc, { objectId: recruit.template.Interview }) === undefined) {
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

  if (await tx.findOne(core.class.TxCreateDoc, { objectId: recruit.template.Task }) === undefined) {
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
