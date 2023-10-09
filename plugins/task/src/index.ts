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

import type { Person } from '@hcengineering/contact'
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
  Timestamp
} from '@hcengineering/core'
import { NotificationType } from '@hcengineering/notification'
import type { Asset, IntlString, Plugin } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'
import type { AnyComponent } from '@hcengineering/ui'
import { Action, ViewletDescriptor } from '@hcengineering/view'

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
  states: Ref<State>[]
  doneStates?: Ref<DoneState>[]
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
export interface DoneState extends Status {}

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
  assignee: Ref<Person> | null
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
  assignee: Ref<Person> | null
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
export interface Sequence extends Doc {
  attachedTo: Ref<Class<Doc>>
  sequence: number
}

/**
 * @public
 */
export interface StateTemplate extends Doc, State {
  attachedTo: Ref<KanbanTemplate>
  rank: string
}

/**
 * @public
 */
export interface DoneStateTemplate extends Doc, DoneState {
  attachedTo: Ref<KanbanTemplate>
  rank: string
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
  ofAttribute: Ref<Attribute<State>>
  doneAttribute?: Ref<Attribute<DoneState>>
  editor?: AnyComponent
  attachedToClass: Ref<Class<SpaceWithStates>>
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
  action: {
    Move: '' as Ref<Action>
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
    Sequence: '' as Ref<Space>,
    Statuses: '' as Ref<Space>
  },
  component: {
    KanbanTemplateEditor: '' as AnyComponent,
    KanbanTemplateSelector: '' as AnyComponent,
    TodoItemsPopup: '' as AnyComponent,
    CreateStatePopup: '' as AnyComponent,
    CreateStateTemplatePopup: '' as AnyComponent
  },
  ids: {
    AssigneedNotification: '' as Ref<NotificationType>
  }
})

export default task
export * from './utils'
