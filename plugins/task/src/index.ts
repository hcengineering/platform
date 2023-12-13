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
  Markup,
  Mixin,
  Ref,
  Space,
  Status,
  StatusCategory,
  Timestamp
} from '@hcengineering/core'
import type { Asset, IntlString, Plugin } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'
import type { AnyComponent, ComponentExtensionId } from '@hcengineering/ui'
import { Action, ViewletDescriptor } from '@hcengineering/view'

/**
 * @public
 */
export interface DocWithRank extends Doc {
  rank: string
}

export interface Project extends Space {
  type: Ref<ProjectType>
}

/**
 * @public
 */
export interface Task extends AttachedDoc, DocWithRank {
  status: Ref<Status>
  isDone?: boolean
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

export interface ProjectStatus {
  _id: Ref<Status>
  // Optional color
  color?: number
}

export interface ProjectType extends Space {
  shortDescription?: string
  category: Ref<ProjectTypeCategory>
  statuses: ProjectStatus[]
}

export interface ProjectTypeCategory extends Doc {
  name: IntlString
  description: IntlString
  icon: AnyComponent
  editor?: AnyComponent
  attachedToClass: Ref<Class<Project>>
  statusClass: Ref<Class<Status>>
  statusCategories: Ref<StatusCategory>[]
}

/**
 * @public
 */
export enum TaskGrouping {
  State = 'state',
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
  attribute: {
    State: '' as Ref<Attribute<Status>>
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
    Rank: '' as IntlString,
    EditStates: '' as IntlString,
    MarkAsDone: '' as IntlString,
    MarkAsUndone: '' as IntlString,
    Kanban: '' as IntlString,
    ApplicationLabelTask: '' as IntlString,
    TodoItems: '' as IntlString,
    AssignedToMe: '' as IntlString,
    Dashboard: '' as IntlString,
    ProjectTypes: '' as IntlString,
    ProjectType: '' as IntlString
  },
  class: {
    Task: '' as Ref<Class<Task>>,
    Sequence: '' as Ref<Class<Sequence>>,
    TodoItem: '' as Ref<Class<TodoItem>>,
    ProjectType: '' as Ref<Class<ProjectType>>,
    ProjectTypeCategory: '' as Ref<Class<ProjectTypeCategory>>,
    Project: '' as Ref<Class<Project>>
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
  statusCategory: {
    Active: '' as Ref<StatusCategory>,
    Won: '' as Ref<StatusCategory>,
    Lost: '' as Ref<StatusCategory>
  },
  component: {
    ProjectEditor: '' as AnyComponent,
    ProjectTypeSelector: '' as AnyComponent,
    TodoItemsPopup: '' as AnyComponent,
    CreateStatePopup: '' as AnyComponent
  },
  extensions: {
    ProjectEditorExtension: '' as ComponentExtensionId
  }
})

export default task
export * from './utils'
