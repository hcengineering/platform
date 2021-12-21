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

import type { Employee } from '@anticrm/contact'
import { AttachedDoc, Class, Client, Data, Doc, Interface, Mixin, Ref, Space, Timestamp, TxOperations } from '@anticrm/core'
import type { Asset, Plugin } from '@anticrm/platform'
import { plugin } from '@anticrm/platform'
import type { AnyComponent } from '@anticrm/ui'
import { ViewletDescriptor } from '@anticrm/view'

import { genRanks } from './utils'

/**
 * @public
 */
export interface DocWithRank extends Doc {
  rank: string
}

// S T A T E

/**
 * @public
 */
export interface State extends DocWithRank {
  title: string
  color: string
}

/**
 * @public
 */
export interface DoneState extends DocWithRank {
  title: string
}

/**
 * @public
 */
export interface WonState extends DoneState {}

/**
 * @public
 */
export interface LostState extends DoneState {}

/**
 * @public
 */
export interface Task extends AttachedDoc, DocWithRank {
  state: Ref<State>
  doneState: Ref<DoneState> | null
  number: number
  assignee: Ref<Employee> | null

  todoItems?: number
}

/**
 * @public
 */
export interface TodoItem extends AttachedDoc {
  name: string
  done: boolean
  dueTo?: Timestamp
}

/**
 * @public
 */
export interface SpaceWithStates extends Space {
}

/**
 * @public
 */
export interface Project extends SpaceWithStates {}

/**
 * @public
 */
export interface Issue extends Task {
  number: number // Sequence number

  name: string
  description: string

  comments?: number
  attachments?: number
  labels?: string
}

/**
 * @public
 */
export interface KanbanCard extends Class<Doc> {
  card: AnyComponent
}

/**
 * @public
 */
export interface Kanban extends Doc {
  attachedTo: Ref<Space>
}

/**
 * @public
 */
export interface Sequence extends Doc {
  attachedTo: Ref<Class<Doc>>
  sequence: number
}

/**
 * @public
 */
export interface StateTemplate extends AttachedDoc, State {}

/**
  * @public
  */
export interface DoneStateTemplate extends AttachedDoc, DoneState {}

/**
  * @public
  */
export interface WonStateTemplate extends DoneStateTemplate, WonState {}

/**
  * @public
  */
export interface LostStateTemplate extends DoneStateTemplate, LostState {}

/**
  * @public
  */
export interface KanbanTemplate extends Doc {
  title: string
  statesC: number
  doneStatesC: number
}

/**
  * @public
  */
export interface KanbanTemplateSpace extends Space {
  icon: AnyComponent
}

/**
 * @public
 */
export const taskId = 'task' as Plugin

/**
 * @public
 */
const task = plugin(taskId, {
  mixin: {
    KanbanCard: '' as Ref<Mixin<KanbanCard>>
  },
  interface: {
    DocWithRank: '' as Ref<Interface<DocWithRank>>
  },
  class: {
    Issue: '' as Ref<Class<Issue>>,
    Project: '' as Ref<Class<Project>>,
    State: '' as Ref<Class<State>>,
    DoneState: '' as Ref<Class<DoneState>>,
    WonState: '' as Ref<Class<WonState>>,
    LostState: '' as Ref<Class<LostState>>,
    SpaceWithStates: '' as Ref<Class<SpaceWithStates>>,
    Task: '' as Ref<Class<Task>>,
    Kanban: '' as Ref<Class<Kanban>>,
    Sequence: '' as Ref<Class<Sequence>>,
    StateTemplate: '' as Ref<Class<StateTemplate>>,
    DoneStateTemplate: '' as Ref<Class<DoneStateTemplate>>,
    WonStateTemplate: '' as Ref<Class<WonStateTemplate>>,
    LostStateTemplate: '' as Ref<Class<LostStateTemplate>>,
    KanbanTemplate: '' as Ref<Class<KanbanTemplate>>,
    KanbanTemplateSpace: '' as Ref<Class<KanbanTemplateSpace>>,
    TodoItem: '' as Ref<Class<TodoItem>>
  },
  viewlet: {
    Kanban: '' as Ref<ViewletDescriptor>
  },
  icon: {
    Task: '' as Asset,
    Kanban: '' as Asset,
    Status: '' as Asset,
    TodoCheck: '' as Asset,
    TodoUnCheck: '' as Asset,
    ManageStatuses: '' as Asset
  },
  global: {
    // Global task root, if not attached to some other object.
    Task: '' as Ref<Issue>
  },
  space: {
    ProjectTemplates: '' as Ref<KanbanTemplateSpace>,
    Sequence: '' as Ref<Space>
  },
  template: {
    DefaultProject: '' as Ref<KanbanTemplate>
  }
})
export default task

const defaultKanban = {
  states: [
    { color: '#7C6FCD', title: 'Open' },
    { color: '#6F7BC5', title: 'In Progress' },
    { color: '#77C07B', title: 'Under review' },
    { color: '#A5D179', title: 'Done' },
    { color: '#F28469', title: 'Invalid' }
  ],
  doneStates: [
    { isWon: true, title: 'Won' },
    { isWon: false, title: 'Lost' }
  ]
}

/**
 * @public
 */
export async function createProjectKanban (
  projectId: Ref<Project>,
  factory: <T extends Doc>(_class: Ref<Class<T>>, space: Ref<Space>, data: Data<T>, id: Ref<T>) => Promise<void>
): Promise<void> {
  const { states, doneStates } = defaultKanban
  const stateRank = genRanks(states.length)
  for (const st of states) {
    const rank = stateRank.next().value

    if (rank === undefined) {
      throw Error('Failed to generate rank')
    }

    const sid = (projectId + '.state.' + st.title.toLowerCase().replace(' ', '_')) as Ref<State>
    await factory(
      task.class.State,
      projectId,
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

    const sid = (projectId + '.done-state.' + st.title.toLowerCase().replace(' ', '_')) as Ref<DoneState>
    await factory(
      st.isWon ? task.class.WonState : task.class.LostState,
      projectId,
      {
        title: st.title,
        rank
      },
      sid
    )
  }

  await factory(
    task.class.Kanban,
    projectId,
    {
      attachedTo: projectId
    },
    (projectId + '.kanban') as Ref<Kanban>
  )
}

/**
 * @public
 */
export async function createKanban (client: Client & TxOperations, attachedTo: Ref<Space>, templateId?: Ref<KanbanTemplate>): Promise<Ref<Kanban>> {
  if (templateId === undefined) {
    const ranks = [...genRanks(2)]
    await Promise.all([
      client.createDoc(task.class.WonState, attachedTo, {
        title: 'Won',
        rank: ranks[0]
      }),
      client.createDoc(task.class.LostState, attachedTo, {
        title: 'Lost',
        rank: ranks[1]
      })
    ])
    return await client.createDoc(task.class.Kanban, attachedTo, {
      attachedTo
    })
  }

  const template = await client.findOne(task.class.KanbanTemplate, { _id: templateId })

  if (template === undefined) {
    throw Error(`Failed to find target kanban template: ${templateId}`)
  }

  const tmplStates = await client.findAll(task.class.StateTemplate, { attachedTo: template._id })
  await Promise.all(
    tmplStates.map(async (state) => await client.createDoc(
      task.class.State,
      attachedTo,
      {
        color: state.color,
        title: state.title,
        rank: state.rank
      })))

  const doneClassMap = new Map<Ref<Class<DoneStateTemplate>>, Ref<Class<DoneState>>>([
    [task.class.WonStateTemplate, task.class.WonState],
    [task.class.LostStateTemplate, task.class.LostState]
  ])
  const tmplDoneStates = await client.findAll(task.class.DoneStateTemplate, { attachedTo: template._id })
  await Promise.all(
    tmplDoneStates.map(async (state) => {
      const cl = doneClassMap.get(state._class)

      if (cl === undefined) {
        return
      }

      return await client.createDoc(cl, attachedTo, { title: state.title, rank: state.rank })
    })
  )

  return await client.createDoc(task.class.Kanban, attachedTo, {
    attachedTo
  })
}

export * from './utils'

/**
 * @public
 */
export type CreateFn = <T extends Doc>(
  props: {
    id?: Ref<T>
    space: Ref<Space>
    class: Ref<Class<T>>
  },
  attrs: Data<T>
) => Promise<void>

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
export const createKanbanTemplate = (create: CreateFn) =>
  async (data: KanbanTemplateData) => {
    await create(
      {
        id: data.kanbanId,
        space: data.space,
        class: task.class.KanbanTemplate
      },
      {
        doneStatesC: data.doneStates.length,
        statesC: data.states.length,
        title: data.title
      }
    )

    const doneStateRanks = [...genRanks(data.doneStates.length)]
    await Promise.all(data.doneStates.map((st, i) => create({
      space: data.space,
      class: st.isWon ? task.class.WonStateTemplate : task.class.LostStateTemplate
    }, {
      attachedTo: data.kanbanId,
      attachedToClass: task.class.KanbanTemplate,
      collection: 'doneStatesC',
      rank: doneStateRanks[i],
      title: st.title
    })))

    const stateRanks = [...genRanks(data.states.length)]
    await Promise.all(data.states.map((st, i) => create({
      space: data.space,
      class: task.class.StateTemplate
    }, {
      attachedTo: data.kanbanId,
      attachedToClass: task.class.KanbanTemplate,
      collection: 'statesC',
      rank: stateRanks[i],
      title: st.title,
      color: st.color
    })))
  }

/**
 * @public
 */
export const createDefaultKanbanTemplate = async (create: CreateFn): Promise<void> => {
  await createKanbanTemplate(create)({
    kanbanId: task.template.DefaultProject,
    space: task.space.ProjectTemplates,
    title: 'Default project',
    states: defaultKanban.states,
    doneStates: defaultKanban.doneStates
  })
}
