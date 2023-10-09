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

import type { Ref, Space } from '@hcengineering/core'
import { mergeIds } from '@hcengineering/platform'
import { TagCategory } from '@hcengineering/tags'
import { taskId } from '@hcengineering/task'
import task from '@hcengineering/task-resources/src/plugin'
import type { AnyComponent } from '@hcengineering/ui'
import type { Action, ActionCategory, ViewAction, Viewlet } from '@hcengineering/view'

export default mergeIds(taskId, task, {
  action: {
    EditStatuses: '' as Ref<Action>,
    ArchiveSpace: '' as Ref<Action>,
    UnarchiveSpace: '' as Ref<Action>,
    ArchiveState: '' as Ref<Action>
  },
  actionImpl: {
    EditStatuses: '' as ViewAction,
    TodoItemMarkDone: '' as ViewAction,
    TodoItemMarkUnDone: '' as ViewAction,
    ArchiveSpace: '' as ViewAction,
    UnarchiveSpace: '' as ViewAction,
    SelectStatus: '' as ViewAction
  },
  category: {
    Task: '' as Ref<ActionCategory>,
    TaskTag: '' as Ref<TagCategory>
  },
  component: {
    ProjectView: '' as AnyComponent,
    EditIssue: '' as AnyComponent,
    TaskPresenter: '' as AnyComponent,
    KanbanTemplatePresenter: '' as AnyComponent,
    KanbanCard: '' as AnyComponent,
    StatePresenter: '' as AnyComponent,
    DoneStatePresenter: '' as AnyComponent,
    StateEditor: '' as AnyComponent,
    DoneStateEditor: '' as AnyComponent,
    KanbanView: '' as AnyComponent,
    Todos: '' as AnyComponent,
    TodoItemPresenter: '' as AnyComponent,
    StatusTableView: '' as AnyComponent,
    TaskHeader: '' as AnyComponent,
    Dashboard: '' as AnyComponent,
    StateRefPresenter: '' as AnyComponent,
    DoneStateRefPresenter: '' as AnyComponent,
    StatusSelector: '' as AnyComponent
  },
  space: {
    TasksPublic: '' as Ref<Space>
  },
  viewlet: {
    TableIssue: '' as Ref<Viewlet>,
    KanbanIssue: '' as Ref<Viewlet>
  }
})
