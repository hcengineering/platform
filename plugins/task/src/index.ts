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

import type { Employee } from '@hcengineering/contact'
import {
  AttachedDoc,
  Attribute,
  Class,
  Doc,
  Interface,
  Markup,
  Mixin,
  Ref,
  Space,
  Status,
  Timestamp,
  TxOperations
} from '@hcengineering/core'
import { NotificationType } from '@hcengineering/notification'
import type { Asset, IntlString, Plugin } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'
import type { AnyComponent } from '@hcengineering/ui'
import { ViewletDescriptor } from '@hcengineering/view'
import { genRanks } from './utils'

/**
 * @public
 */
export interface DocWithRank extends Doc {
  rank: string
}

/**
 * @public
 */
export interface SpaceWithStates extends Space {
  templateId?: Ref<KanbanTemplate>
}

// S T A T E

/**
 * @public
 */
export interface State extends Status {
  isArchived?: boolean
}

/**
 * @public
 */
export interface DoneState extends Status {
  name: string
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
  status: Ref<Status>
  doneState: Ref<DoneState> | null
  number: number
  assignee: Ref<Employee> | null
  dueDate: Timestamp | null
  comments?: number
  attachments?: number
  todoItems?: number
  labels?: number
}

/**
 * @public
 */
export interface TodoItem extends AttachedDoc, DocWithRank {
  name: Markup
  assignee: Ref<Employee> | null
  done: boolean
  dueTo: Timestamp | null
  items?: number
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
export interface StateTemplate extends Doc, State {
  attachedTo: Ref<KanbanTemplate>
}

/**
 * @public
 */
export interface DoneStateTemplate extends Doc, DoneState {
  attachedTo: Ref<KanbanTemplate>
}

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
  description?: string
  shortDescription?: string
  statesC: number
  doneStatesC: number
}

/**
 * @public
 */
export interface KanbanTemplateSpace extends Space {
  name: IntlString
  description: IntlString
  icon: AnyComponent
  editor?: AnyComponent
  attachedToClass: Ref<Class<Doc>>
}

/**
 * @public
 */
export enum TaskGrouping {
  State = 'state',
  DoneStatus = 'doneState',
  Assignee = 'assignee',
  NoGrouping = '#no_category'
}

/**
 * @public
 */
export enum TaskOrdering {
  State = 'state',
  LastUpdated = 'modifiedOn',
  DueDate = 'dueDate',
  Manual = 'rank'
}

/**
 * @public
 */
export const taskId = 'task' as Plugin

/**
 * @public
 */
const task = plugin(taskId, {
  app: {
    Tasks: '' as Ref<Doc>
  },
  mixin: {
    KanbanCard: '' as Ref<Mixin<KanbanCard>>
  },
  interface: {
    DocWithRank: '' as Ref<Interface<DocWithRank>>
  },
  attribute: {
    State: '' as Ref<Attribute<State>>,
    DoneState: '' as Ref<Attribute<DoneState>>
  },
  string: {
    StartDate: '' as IntlString,
    DueDate: '' as IntlString,
    TaskState: '' as IntlString,
    TaskStateTitle: '' as IntlString,
    TaskStateDone: '' as IntlString,
    TaskNumber: '' as IntlString,
    Todo: '' as IntlString,
    TaskDone: '' as IntlString,
    TaskDueTo: '' as IntlString,
    TaskParent: '' as IntlString,
    IssueName: '' as IntlString,
    TaskComments: '' as IntlString,
    TaskLabels: '' as IntlString,
    StateTemplateTitle: '' as IntlString,
    StateTemplateColor: '' as IntlString,
    KanbanTemplateTitle: '' as IntlString,
    Rank: '' as IntlString,
    EditStates: '' as IntlString,
    MarkAsDone: '' as IntlString,
    MarkAsUndone: '' as IntlString,
    Kanban: '' as IntlString,
    ApplicationLabelTask: '' as IntlString,
    TodoItems: '' as IntlString,
    AssignedToMe: '' as IntlString,
    Dashboard: '' as IntlString
  },
  class: {
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
    Kanban: '' as Ref<ViewletDescriptor>,
    Dashboard: '' as Ref<ViewletDescriptor>,
    StatusTable: '' as Ref<ViewletDescriptor>
  },
  icon: {
    Task: '' as Asset,
    Kanban: '' as Asset,
    TodoCheck: '' as Asset,
    TodoUnCheck: '' as Asset,
    ManageTemplates: '' as Asset,
    TaskState: '' as Asset,
    Dashboard: '' as Asset
  },
  global: {
    // Global task root, if not attached to some other object.
    Task: '' as Ref<Task>
  },
  space: {
    Sequence: '' as Ref<Space>
  },
  component: {
    KanbanTemplateEditor: '' as AnyComponent,
    KanbanTemplateSelector: '' as AnyComponent,
    TodoItemsPopup: '' as AnyComponent,
    CreateStatePopup: '' as AnyComponent
  },
  ids: {
    AssigneedNotification: '' as Ref<NotificationType>
  }
})

export default task
export * from './utils'

/**
 * @public
 */
export async function createKanban (
  client: TxOperations,
  attachedTo: Ref<Space>,
  templateId?: Ref<KanbanTemplate>
): Promise<Ref<Kanban>> {
  if (templateId === undefined) {
    await client.createDoc(task.class.State, attachedTo, {
      ofAttribute: task.attribute.State,
      name: 'New State',
      color: 9,
      rank: [...genRanks(1)][0]
    })

    const ranks = [...genRanks(2)]
    await Promise.all([
      client.createDoc(task.class.WonState, attachedTo, {
        ofAttribute: task.attribute.DoneState,
        name: 'Won',
        rank: ranks[0]
      }),
      client.createDoc(task.class.LostState, attachedTo, {
        ofAttribute: task.attribute.DoneState,
        name: 'Lost',
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
    tmplStates.map(
      async (state) =>
        await client.createDoc(task.class.State, attachedTo, {
          ofAttribute: task.attribute.State,
          color: state.color,
          description: state.description,
          name: state.name,
          rank: state.rank
        })
    )
  )

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

      return await client.createDoc(cl, attachedTo, {
        ofAttribute: task.attribute.DoneState,
        description: state.description,
        name: state.name,
        rank: state.rank
      })
    })
  )

  return await client.createDoc(task.class.Kanban, attachedTo, {
    attachedTo
  })
}
