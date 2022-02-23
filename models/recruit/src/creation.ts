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

import core, { Doc, Ref, Space, TxOperations } from '@anticrm/core'
import type { Client } from '@anticrm/core'
import { createKanbanTemplate } from '@anticrm/model-task'

import recruit from './plugin'
import task from '@anticrm/task'
import type { KanbanTemplate } from '@anticrm/task'

export async function createDeps (client: Client): Promise<void> {
  const tx = new TxOperations(client, core.account.System)

  await tx.createDoc(
    task.class.Sequence,
    task.space.Sequence,
    {
      attachedTo: recruit.class.Applicant,
      sequence: 0
    }
  )
  await createDefaultKanbanTemplate(tx)
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
