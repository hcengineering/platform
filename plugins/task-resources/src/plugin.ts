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

import {} from '@hcengineering/notification'
import type { IntlString } from '@hcengineering/platform'
import { mergeIds } from '@hcengineering/platform'
import task, { taskId } from '@hcengineering/task'
import { type AnyComponent } from '@hcengineering/ui/src/types'
import { type GetAllValuesFunc, type SortFunc } from '@hcengineering/view'

export default mergeIds(taskId, task, {
  string: {
    Description: '' as IntlString,
    DescriptionPlaceholder: '' as IntlString,
    ShortDescription: '' as IntlString,
    ProjectName: '' as IntlString,
    ProjectNamePlaceholder: '' as IntlString,
    TaskCreateLabel: '' as IntlString,
    TaskAssignee: '' as IntlString,
    TaskNamePlaceholder: '' as IntlString,
    States: '' as IntlString,
    DoneStates: '' as IntlString,
    TodoDescriptionPlaceholder: '' as IntlString,
    Todos: '' as IntlString,
    TodoName: '' as IntlString,
    TaskProject: '' as IntlString,
    SelectProject: '' as IntlString,
    TaskName: '' as IntlString,
    AssignThisTask: '' as IntlString,
    TaskUnAssign: '' as IntlString,
    More: '' as IntlString,
    UploadDropFilesHere: '' as IntlString,
    NoTaskForObject: '' as IntlString,
    Delete: '' as IntlString,
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
    StatusDeleteConfirm: '' as IntlString,
    StatusDelete: '' as IntlString,
    CantStatusDelete: '' as IntlString,
    CantStatusDeleteError: '' as IntlString,

    Tasks: '' as IntlString,
    Task: '' as IntlString,
    SubTask: '' as IntlString,
    TaskAndSubTask: '' as IntlString,
    TaskAndSubTaskDescription: '' as IntlString,
    AllTime: '' as IntlString,
    StatusName: '' as IntlString,
    StatusPopupTitle: '' as IntlString,
    NameAlreadyExists: '' as IntlString,
    StatusChange: '' as IntlString,
    TaskCreated: '' as IntlString,
    CreateProjectType: '' as IntlString,
    ClassicProject: '' as IntlString,
    LastSave: '' as IntlString,
    Published: '' as IntlString,
    CountTasks: '' as IntlString,
    CountProjects: '' as IntlString,
    ProjectTypeTitle: '' as IntlString,
    ProcessStates: '' as IntlString,
    Type: '' as IntlString,
    Group: '' as IntlString,
    Color: '' as IntlString,

    RenameStatus: '' as IntlString,
    UpdateTasksStatusRequest: '' as IntlString,
    TaskTypes: '' as IntlString,
    Collections: '' as IntlString
  },
  status: {
    AssigneeRequired: '' as IntlString
  },
  component: {
    TaskKindSelector: '' as AnyComponent,
    StatusFilter: '' as AnyComponent,
    TodoStatePresenter: '' as AnyComponent,
    AssignedTasks: '' as AnyComponent,
    DueDateEditor: '' as AnyComponent,
    CreateProjectType: '' as AnyComponent,
    ProjectTypeGeneralSectionEditor: '' as AnyComponent,
    ProjectTypeTasksTypeSectionEditor: '' as AnyComponent,
    ProjectTypeAutomationsSectionEditor: '' as AnyComponent,
    ProjectTypeCollectionsSectionEditor: '' as AnyComponent,
    TaskTypeEditor: '' as AnyComponent
  },
  function: {
    GetAllStates: '' as GetAllValuesFunc,
    StatusSort: '' as SortFunc
  }
})
