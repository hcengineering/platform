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

import {} from '@hcengineering/notification'
import type { Doc, Ref, Space } from '@hcengineering/core'
import { mergeIds, type IntlString } from '@hcengineering/platform'
import { type TagCategory } from '@hcengineering/tags'
import { taskId } from '@hcengineering/task'
import task from '@hcengineering/task-resources/src/plugin'
import type { AnyComponent } from '@hcengineering/ui/src/types'
import type { Action, ActionCategory, ViewAction, Viewlet } from '@hcengineering/view'

export default mergeIds(taskId, task, {
  action: {
    EditStatuses: '' as Ref<Action>,
    ArchiveState: '' as Ref<Action>,
    PublicLink: '' as Ref<Action<Doc, any>>
  },
  actionImpl: {
    EditStatuses: '' as ViewAction,
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
    StateEditor: '' as AnyComponent,
    KanbanView: '' as AnyComponent,
    StatusTableView: '' as AnyComponent,
    TaskHeader: '' as AnyComponent,
    Dashboard: '' as AnyComponent,
    StateRefPresenter: '' as AnyComponent,
    StatusSelector: '' as AnyComponent,
    TemplatesIcon: '' as AnyComponent,
    TypesView: '' as AnyComponent,
    StateIconPresenter: '' as AnyComponent,
    TaskTypePresenter: '' as AnyComponent,
    TaskTypeListPresenter: '' as AnyComponent,
    ProjectTypePresenter: '' as AnyComponent,
    TaskTypeClassPresenter: '' as AnyComponent,
    ProjectTypeClassPresenter: '' as AnyComponent
  },
  space: {
    TasksPublic: '' as Ref<Space>
  },
  viewlet: {
    TableIssue: '' as Ref<Viewlet>,
    KanbanIssue: '' as Ref<Viewlet>
  },
  string: {
    ManageProjects: '' as IntlString,
    StateBacklog: '' as IntlString,
    StateActive: '' as IntlString,
    StateUnstarted: '' as IntlString,
    Export: '' as IntlString
  }
})
