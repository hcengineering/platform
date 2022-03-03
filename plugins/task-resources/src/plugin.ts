//
// Copyright © 2020 Anticrm Platform Contributors.
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

import type { IntlString } from '@anticrm/platform'
import { mergeIds } from '@anticrm/platform'
import task, { taskId } from '@anticrm/task'
import { AnyComponent } from '@anticrm/ui'

export default mergeIds(taskId, task, {
  string: {
    CreateProject: '' as IntlString,
    ProjectName: '' as IntlString,
    ProjectNamePlaceholder: '' as IntlString,
    CreateTask: '' as IntlString,
    TaskAssignee: '' as IntlString,
    TaskNamePlaceholder: '' as IntlString,
    TaskDescription: '' as IntlString,
    TaskDescriptionPlaceholder: '' as IntlString,
    States: '' as IntlString,
    DoneStates: '' as IntlString,
    TodoDescriptionPlaceholder: '' as IntlString,
    Todos: '' as IntlString,
    TodoName: '' as IntlString,

    MakePrivate: '' as IntlString,
    MakePrivateDescription: '' as IntlString,
    TaskProject: '' as IntlString,
    SelectProject: '' as IntlString,
    TaskName: '' as IntlString,
    AssignThisTask: '' as IntlString,
    TaskUnAssign: '' as IntlString,
    More: '' as IntlString,
    UploadDropFilesHere: '' as IntlString,
    NoTaskForObject: '' as IntlString,
    Delete: '' as IntlString,
    NoTodoItems: '' as IntlString,
    TodoState: '' as IntlString,
    DoneState: '' as IntlString,
    UndoneState: '' as IntlString,
    TodoDueDate: '' as IntlString,
    TodoDescription: '' as IntlString,
    TodoEdit: '' as IntlString,
    TodoSave: '' as IntlString,
    TodoCreate: '' as IntlString,
    ActiveStates: '' as IntlString,
    DoneStatesWon: '' as IntlString,
    DoneStatesLost: '' as IntlString,
    AllStates: '' as IntlString,
    NoDoneState: '' as IntlString,
    ManageStatusesWithin: '' as IntlString,
    ArchiveConfirm: '' as IntlString,
    UnarchiveConfirm: '' as IntlString,
    StatusDeleteConfirm: '' as IntlString,
    StatusDelete: '' as IntlString,
    CantStatusDelete: '' as IntlString,
    CantStatusDeleteError: '' as IntlString,
    Archive: '' as IntlString,
    Unarchive: '' as IntlString
  },
  status: {
    AssigneeRequired: '' as IntlString
  },
  component: {
    TodoStatePresenter: '' as AnyComponent
  }
})
