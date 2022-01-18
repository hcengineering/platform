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

import core, { TxOperations } from '@anticrm/core'
import type { Client, Ref, Space } from '@anticrm/core'
import { createKanban, genRanks } from '@anticrm/task'
import type { DoneStateTemplate, KanbanTemplate, StateTemplate } from '@anticrm/task'

import task from './plugin'
import { IntlString } from '@anticrm/platform'

export async function createDeps (client: Client): Promise<void> {
  const tx = new TxOperations(client, core.account.System)

  await tx.createDoc(
    task.class.Sequence,
    task.space.Sequence,
    {
      attachedTo: task.class.Issue,
      sequence: 0
    }
  )
  const defaultTmpl = await createDefaultKanbanTemplate(tx)
  await createKanban(tx, task.space.TasksPublic, defaultTmpl)
}

const defaultKanban = {
  states: [
    { color: 9, title: 'Open' as IntlString },
    { color: 10, title: 'In Progress' as IntlString },
    { color: 1, title: 'Under review' as IntlString },
    { color: 0, title: 'Done' as IntlString },
    { color: 11, title: 'Invalid' as IntlString }
  ],
  doneStates: [
    { isWon: true, title: 'Won' as IntlString },
    { isWon: false, title: 'Lost' as IntlString }
  ]
}

/**
 * @public
 */
export interface KanbanTemplateData {
  kanbanId: Ref<KanbanTemplate>
  space: Ref<Space>
  title: KanbanTemplate['title']
  states: Pick<StateTemplate, 'title' | 'color'>[]
  doneStates: (Pick<DoneStateTemplate, 'title'> & { isWon: boolean })[]
}

/**
 * @public
 */
export async function createKanbanTemplate (client: TxOperations, data: KanbanTemplateData): Promise<Ref<KanbanTemplate>> {
  const tmpl = await client.createDoc(
    task.class.KanbanTemplate,
    data.space,
    {
      doneStatesC: 0,
      statesC: 0,
      title: data.title
    },
    data.kanbanId
  )

  const doneStateRanks = [...genRanks(data.doneStates.length)]
  await Promise.all(
    data.doneStates.map((st, i) => client.addCollection(
      st.isWon ? task.class.WonStateTemplate : task.class.LostStateTemplate,
      data.space,
      data.kanbanId,
      task.class.KanbanTemplate,
      'doneStatesC',
      {
        rank: doneStateRanks[i],
        title: st.title
      }))
  )

  const stateRanks = [...genRanks(data.states.length)]
  await Promise.all(
    data.states.map((st, i) => client.addCollection(
      task.class.StateTemplate,
      data.space,
      data.kanbanId,
      task.class.KanbanTemplate,
      'statesC',
      {
        rank: stateRanks[i],
        title: st.title,
        color: st.color
      }))
  )

  return tmpl
}

const createDefaultKanbanTemplate = async (client: TxOperations): Promise<Ref<KanbanTemplate>> =>
  await createKanbanTemplate(client, {
    kanbanId: task.template.DefaultProject,
    space: task.space.ProjectTemplates,
    title: 'Default project' as IntlString,
    states: defaultKanban.states,
    doneStates: defaultKanban.doneStates
  })
