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

import type { Ref, Space } from '@anticrm/core'
import type { IntlString } from '@anticrm/platform'
import { mergeIds } from '@anticrm/platform'
import task, { taskId } from '@anticrm/task'
import type { AnyComponent } from '@anticrm/ui'
import { Application } from '@anticrm/workbench'

export default mergeIds(taskId, task, {
  app: {
    Tasks: '' as Ref<Application>
  },
  component: {
    ProjectView: '' as AnyComponent,
    CreateProject: '' as AnyComponent,
    CreateTask: '' as AnyComponent,
    EditTask: '' as AnyComponent,
    TaskPresenter: '' as AnyComponent,
    KanbanCard: '' as AnyComponent,
    TemplatesIcon: '' as AnyComponent
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
