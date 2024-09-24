//
// Copyright © 2023 Hardcore Engineering Inc.
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

import type { Asset, Plugin, Resource } from '@hcengineering/platform'
import {
  AttachedDoc,
  Class,
  CollectionSize,
  Doc,
  Hierarchy,
  Markup,
  Mixin,
  Ref,
  Space,
  Timestamp,
  Type
} from '@hcengineering/core'
import { IntlString, plugin } from '@hcengineering/platform'
import { Event, Visibility } from '@hcengineering/calendar'
import { AnyComponent } from '@hcengineering/ui'
import { Person } from '@hcengineering/contact'
import type { Rank } from '@hcengineering/rank'

export * from './analytics'

/**
 * @public
 */
export const timeId = 'time' as Plugin

/**
 * @public
 */
export interface WorkSlot extends Event {
  attachedTo: Ref<ToDo>
  attachedToClass: Ref<Class<ToDo>>
}

/**
 * @public
 */
export interface ToDo extends AttachedDoc {
  attachedTo: Ref<Doc>
  attachedToClass: Ref<Class<Doc>>
  workslots: number
  title: string
  description: Markup
  dueDate?: Timestamp | null
  priority: ToDoPriority
  visibility: Visibility
  doneOn?: Timestamp | null
  user: Ref<Person>
  attachedSpace?: Ref<Space>
  labels?: number
  rank: Rank
}

/**
 * @public
 */
export interface Todoable {
  todos?: CollectionSize<ToDo>
}

/**
 * @public
 */
export enum ToDoPriority {
  High,
  Medium,
  Low,
  NoPriority,
  Urgent
}

/**
 * @public
 */
export interface ProjectToDo extends ToDo {
  attachedSpace: Ref<Space>
}

/**
 * @public
 */
export interface ItemPresenter extends Class<Doc> {
  presenter: AnyComponent
}

/**
 * @public
 */
export type TodoDoneTester = (
  client: {
    findAll: Storage['findAll']
    hierarchy: Hierarchy
  },
  todo: ToDo
) => Promise<boolean>

/**
 * A helper class to control classic project todo automation.
 */
export interface TodoAutomationHelper extends Doc {
  onDoneTester: Resource<TodoDoneTester>
}

export default plugin(timeId, {
  component: {
    Me: '' as AnyComponent,
    Team: '' as AnyComponent,
    EditToDo: '' as AnyComponent
  },
  class: {
    WorkSlot: '' as Ref<Class<WorkSlot>>,
    ToDo: '' as Ref<Class<ToDo>>,
    ProjectToDo: '' as Ref<Class<ProjectToDo>>,
    TypeToDoPriority: '' as Ref<Class<Type<ToDoPriority>>>,
    TodoAutomationHelper: '' as Ref<Class<TodoAutomationHelper>>
  },
  mixin: {
    ItemPresenter: '' as Ref<Mixin<ItemPresenter>>
  },
  ids: {
    NotAttached: '' as Ref<Doc>
  },
  space: {
    ToDos: '' as Ref<Space>
  },
  icon: {
    Team: '' as Asset,
    Hashtag: '' as Asset,
    Inbox: '' as Asset,
    Calendar: '' as Asset,
    Flag: '' as Asset,
    FilledFlag: '' as Asset,
    Planned: '' as Asset,
    All: '' as Asset
  },
  string: {
    Planner: '' as IntlString,
    Calendar: '' as IntlString,
    Agenda: '' as IntlString,
    Me: '' as IntlString,
    Team: '' as IntlString,
    WeekCalendar: '' as IntlString,
    DayCalendar: '' as IntlString,
    CreatedToDo: '' as IntlString,
    AddToDo: '' as IntlString,
    NewToDoDetails: '' as IntlString,
    ToDo: '' as IntlString,
    NewToDo: '' as IntlString
  }
})
