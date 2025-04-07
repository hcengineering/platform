// Copyright © 2025 Hardcore Engineering Inc.
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

import { type Ref } from '@hcengineering/core'
import { type IntlString, mergeIds } from '@hcengineering/platform'
import process, { processId } from '@hcengineering/process'
import { type AnyComponent } from '@hcengineering/ui'
import { type ViewQueryAction, type Viewlet } from '@hcengineering/view'

export default mergeIds(processId, process, {
  viewlet: {
    ExecutionsList: '' as Ref<Viewlet>,
    CardExecutions: '' as Ref<Viewlet>
  },
  component: {
    Main: '' as AnyComponent,
    ProcessEditor: '' as AnyComponent,
    ProcessesSettingSection: '' as AnyComponent,
    SubProcessEditor: '' as AnyComponent,
    UpdateCardEditor: '' as AnyComponent,
    ToDoEditor: '' as AnyComponent,
    SubProcessPresenter: '' as AnyComponent,
    ToDoPresenter: '' as AnyComponent,
    RunProcessPopup: '' as AnyComponent,
    UpdateCardPresenter: '' as AnyComponent,
    ProcessesExtension: '' as AnyComponent,
    ProcessPresenter: '' as AnyComponent,
    ExecutonPresenter: '' as AnyComponent,
    ExecutonProgressPresenter: '' as AnyComponent,
    NestedContextSelector: '' as AnyComponent,
    RelatedContextSelector: '' as AnyComponent,
    FunctionSelector: '' as AnyComponent,
    RunProcessCardPopup: '' as AnyComponent,
    DateOffsetEditor: '' as AnyComponent,
    NumberOffsetEditor: '' as AnyComponent,
    ErrorPresenter: '' as AnyComponent
  },
  function: {
    ShowDoneQuery: '' as ViewQueryAction
  },
  string: {
    DeleteProcess: '' as IntlString,
    DeleteProcessConfirm: '' as IntlString,
    DeleteState: '' as IntlString,
    DeleteStateConfirm: '' as IntlString,
    RunProcess: '' as IntlString,
    Processes: '' as IntlString,
    Untitled: '' as IntlString,
    States: '' as IntlString,
    AddState: '' as IntlString,
    Rollback: '' as IntlString,
    NewProcess: '' as IntlString,
    NewState: '' as IntlString,
    AddAction: '' as IntlString,
    CreateProcess: '' as IntlString,
    UpdateCard: '' as IntlString,
    CreateToDo: '' as IntlString,
    NoProcesses: '' as IntlString,
    MissingRequiredFields: '' as IntlString,
    NoAttributesForUpdate: '' as IntlString,
    CustomValue: '' as IntlString,
    FallbackValue: '' as IntlString,
    Functions: '' as IntlString,
    UpperCase: '' as IntlString,
    LowerCase: '' as IntlString,
    Trim: '' as IntlString,
    FirstValue: '' as IntlString,
    LastValue: '' as IntlString,
    Random: '' as IntlString,
    MyProcesses: '' as IntlString,
    AllProcesses: '' as IntlString,
    ShowDone: '' as IntlString,
    Increment: '' as IntlString,
    Decrement: '' as IntlString,
    Add: '' as IntlString,
    Subtract: '' as IntlString,
    Offset: '' as IntlString,
    Value: '' as IntlString,
    FirstWorkingDayAfter: '' as IntlString,
    FallbackValueError: '' as IntlString,
    Required: '' as IntlString,
    ParallelExecutionForbidden: '' as IntlString,
    StartAutomatically: '' as IntlString,
    Continue: '' as IntlString
  }
})
