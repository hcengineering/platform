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

import type { Doc, Ref, Space } from '@anticrm/core'
import type { IntlString, Resource } from '@anticrm/platform'
import { mergeIds } from '@anticrm/platform'
import task, { taskId } from '@anticrm/task'
import type { AnyComponent } from '@anticrm/ui'
import { Application } from '@anticrm/workbench'
import type { Action } from '@anticrm/view'

export default mergeIds(taskId, task, {
  app: {
    Tasks: '' as Ref<Application>
  },
  action: {
    CreateTask: '' as Ref<Action>,
    EditStatuses: '' as Ref<Action>,
    TodoItemMarkDone: '' as Ref<Action>,
    TodoItemMarkUnDone: '' as Ref<Action>
  },
  actionImpl: {
    CreateTask: '' as Resource<(object: Doc) => Promise<void>>,
    EditStatuses: '' as Resource<(object: Doc) => Promise<void>>,
    TodoItemMarkDone: '' as Resource<(object: Doc) => Promise<void>>,
    TodoItemMarkUnDone: '' as Resource<(object: Doc) => Promise<void>>
  },
  component: {
    ProjectView: '' as AnyComponent,
    CreateProject: '' as AnyComponent,
    CreateTask: '' as AnyComponent,
    EditTask: '' as AnyComponent,
    EditIssue: '' as AnyComponent,
    TaskPresenter: '' as AnyComponent,
    KanbanCard: '' as AnyComponent,
    TemplatesIcon: '' as AnyComponent,
    StatePresenter: '' as AnyComponent,
    DoneStatePresenter: '' as AnyComponent,
    StateEditor: '' as AnyComponent,
    KanbanView: '' as AnyComponent,
    Todos: '' as AnyComponent,
    TodoItemPresenter: '' as AnyComponent,
    StatusTableView: '' as AnyComponent
  },
  string: {
    Task: '' as IntlString,
    ApplicationLabelTask: '' as IntlString,
    Projects: '' as IntlString,
    CreateProject: '' as IntlString
  },
  space: {
    TasksPublic: '' as Ref<Space>
  }
})
