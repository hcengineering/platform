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
  Mixin,
  type Rank,
  Ref,
  Space,
  Status,
  StatusCategory,
  Timestamp,
  SpaceType,
  SpaceTypeDescriptor,
  TypedSpace
} from '@hcengineering/core'
import { NotificationType } from '@hcengineering/notification'
import type { Asset, IntlString, Plugin, Resource } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'
import type { AnyComponent, ComponentExtensionId } from '@hcengineering/ui'
import { Action, IconProps, ViewletDescriptor } from '@hcengineering/view'

export * from './utils'
export type { Rank } from '@hcengineering/rank'

/** @public */
export interface DocWithRank extends Doc {
  rank: Rank
}

export interface Project extends TypedSpace {
  type: Ref<ProjectType>
}

/**
 * @public
 */
export interface Task extends AttachedDoc {
  kind: Ref<TaskType>
  status: Ref<Status>
  isDone?: boolean
  number: number
  assignee: Ref<Person> | null
  dueDate: Timestamp | null
  comments?: number
  attachments?: number
  labels?: number
  identifier: string
  rank: Rank
}

/**
 * @public
 */
export interface KanbanCard extends Class<Doc> {
  card: AnyComponent
}

export interface ProjectStatus extends IconProps {
  _id: Ref<Status>
  taskType: Ref<TaskType>
}

/**
 * @public
 */
export type TaskTypeKind = 'task' | 'subtask' | 'both'

/**
 * @public
 */
export interface TaskTypeDescriptor extends Doc {
  name: IntlString
  description: IntlString
  icon: Asset
  baseClass: Ref<Class<Task>>

  // If specified, will allow to be created by users, system type overwise
  allowCreate: boolean
  statusCategoriesFunc?: Resource<(project: ProjectType) => Ref<StatusCategory>[]>

  openTasks?: Resource<(value: TaskType) => Promise<void>>
}

/**
 * @public
 */
export interface TaskStatusFactory {
  category: Ref<StatusCategory>
  statuses: (string | [string, number, Ref<Status>?])[]
}

/**
 * @public
 */
export interface TaskType extends Doc, IconProps {
  parent: Ref<ProjectType>
  descriptor: Ref<TaskTypeDescriptor>

  name: string

  kind: TaskTypeKind
  // Specify if task is allowed to be used as subtask of following tasks.
  allowedAsChildOf?: Ref<TaskType>[]

  ofClass: Ref<Class<Task>> // Base class for task
  targetClass: Ref<Class<Task>> // Class or Mixin mixin to hold all user defined attributes.

  // Allowed statuses and ordering
  statuses: Ref<Status>[]
  statusClass: Ref<Class<Status>>
  statusCategories: Ref<StatusCategory>[]
}

/**
 * @public
 *
 * A a mixin for Class bind to taskType.
 */
export interface TaskTypeClass extends Class<TaskType> {
  taskType: Ref<TaskType>
  projectType: Ref<ProjectType>
}

/**
 * @public
 *
 * A a mixin for Class bind to taskType.
 */
export interface ProjectTypeClass extends Class<ProjectType> {
  projectType: Ref<ProjectType>
}

/**
 * @public
 *
 * Define a user customized project type.
 */
export interface ProjectType extends SpaceType {
  descriptor: Ref<ProjectTypeDescriptor>
  tasks: Ref<TaskType>[]
  description: string

  // Color and extra options per project type.
  // All statuses per project has same color.
  statuses: ProjectStatus[]

  // A mixin for project
  targetClass: Ref<Class<Project>>

  // disable automation workflow
  classic: boolean
}

/**
 * @public
 */
export interface ProjectTypeDescriptor extends SpaceTypeDescriptor {
  allowedClassic?: boolean
  allowedTaskTypeDescriptors?: Ref<TaskTypeDescriptor>[] // if undefined we allow all possible
  baseClass: Ref<Class<Project>>
  editor?: AnyComponent
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
    KanbanCard: '' as Ref<Mixin<KanbanCard>>,
    TaskTypeClass: '' as Ref<Mixin<TaskTypeClass>>,
    ProjectTypeClass: '' as Ref<Mixin<ProjectTypeClass>>
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
    AssignedToMe: '' as IntlString,
    Dashboard: '' as IntlString,
    ProjectTypes: '' as IntlString,
    TaskType: '' as IntlString,
    ProjectType: '' as IntlString,
    Identifier: '' as IntlString
  },
  class: {
    ProjectTypeDescriptor: '' as Ref<Class<ProjectTypeDescriptor>>,
    ProjectType: '' as Ref<Class<ProjectType>>,
    Project: '' as Ref<Class<Project>>,
    TaskTypeDescriptor: '' as Ref<Class<TaskTypeDescriptor>>,
    TaskType: '' as Ref<Class<TaskType>>,
    Task: '' as Ref<Class<Task>>
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
    UnStarted: '' as Ref<StatusCategory>,
    // For classic project type
    ToDo: '' as Ref<StatusCategory>,
    Active: '' as Ref<StatusCategory>,
    Won: '' as Ref<StatusCategory>,
    Lost: '' as Ref<StatusCategory>
  },
  component: {
    ProjectTypeSelector: '' as AnyComponent,
    CreateStatePopup: '' as AnyComponent
  },
  ids: {
    AssigneedNotification: '' as Ref<NotificationType>,
    ManageProjects: '' as Ref<Doc>
  },
  extensions: {
    ProjectEditorExtension: '' as ComponentExtensionId
  }
})

export default task
