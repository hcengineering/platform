//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import type { Contact } from '@anticrm/contact'
import { Class, Data, Doc, Ref, Space } from '@anticrm/core'
import type { Asset, Plugin } from '@anticrm/platform'
import { plugin } from '@anticrm/platform'
import task, { CreateFn, genRanks, createKanbanTemplate, DoneState, Kanban, KanbanTemplate, KanbanTemplateSpace, SpaceWithStates, State, Task } from '@anticrm/task'

/**
 * @public
 */
export interface Funnel extends SpaceWithStates {}

/**
 * @public
 */
export interface Lead extends Task {
  title: string
  customer: Ref<Contact>

  comments?: number
  attachments?: number
}

/**
 * @public
 */
export const leadId = 'lead' as Plugin

const lead = plugin(leadId, {
  class: {
    Lead: '' as Ref<Class<Lead>>,
    Funnel: '' as Ref<Class<Funnel>>
  },
  icon: {
    Funnel: '' as Asset,
    Lead: '' as Asset,
    LeadApplication: '' as Asset
  },
  space: {
    FunnelTemplates: '' as Ref<KanbanTemplateSpace>
  },
  template: {
    DefaultFunnel: '' as Ref<KanbanTemplate>
  }
})

export default lead

const defaultKanban = {
  states: [
    { color: '#7C6FCD', title: 'Incoming' },
    { color: '#6F7BC5', title: 'Negotation' },
    { color: '#77C07B', title: 'Offer preparing' },
    { color: '#A5D179', title: 'Make a decision' },
    { color: '#F28469', title: 'Contract conclusion' },
    { color: '#7C6FCD', title: 'Done' }
  ],
  doneStates: [
    { isWon: true, title: 'Won' },
    { isWon: false, title: 'Lost' }
  ]
}

/**
 * @public
 */
export async function createKanban (
  funnelId: Ref<Funnel>,
  factory: <T extends Doc>(_class: Ref<Class<T>>, space: Ref<Space>, data: Data<T>, id: Ref<T>) => Promise<void>
): Promise<void> {
  const { states, doneStates } = defaultKanban
  const stateRank = genRanks(states.length)
  for (const st of states) {
    const sid = (funnelId + '.state.' + st.title.toLowerCase().replace(' ', '_')) as Ref<State>
    const rank = stateRank.next().value

    if (rank === undefined) {
      throw Error('Failed to generate rank')
    }

    await factory(
      task.class.State,
      funnelId,
      {
        title: st.title,
        color: st.color,
        rank
      },
      sid
    )
  }

  const doneStateRank = genRanks(doneStates.length)
  for (const st of doneStates) {
    const rank = doneStateRank.next().value

    if (rank === undefined) {
      throw Error('Failed to generate rank')
    }

    const sid = (funnelId + '.done-state.' + st.title.toLowerCase().replace(' ', '_')) as Ref<DoneState>
    await factory(
      st.isWon ? task.class.WonState : task.class.LostState,
      funnelId,
      {
        title: st.title,
        rank
      },
      sid
    )
  }

  await factory(
    task.class.Kanban,
    funnelId,
    {
      attachedTo: funnelId
    },
    (funnelId + '.kanban') as Ref<Kanban>
  )
}

/**
 * @public
 */
export const createDefaultKanbanTemplate = async (create: CreateFn): Promise<void> => {
  await createKanbanTemplate(create)({
    kanbanId: lead.template.DefaultFunnel,
    space: lead.space.FunnelTemplates,
    title: 'Default funnel',
    states: defaultKanban.states,
    doneStates: defaultKanban.doneStates
  })
}
