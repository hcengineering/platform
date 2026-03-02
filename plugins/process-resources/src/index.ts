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

import { type Resources } from '@hcengineering/platform'
import ApproveRequestPresenter from './components/ApproveRequestPresenter.svelte'
import ExecutionContextSelector from './components/attributeEditors/ExecutionContextSelector.svelte'
import FunctionSelector from './components/attributeEditors/FunctionSelector.svelte'
import NestedContextSelector from './components/attributeEditors/NestedContextSelector.svelte'
import RelatedContextSelector from './components/attributeEditors/RelatedContextSelector.svelte'
import RequestUserInput from './components/contextEditors/RequestUserInput.svelte'
import ResultInput from './components/contextEditors/ResultInput.svelte'
import RoleEditor from './components/contextEditors/RoleEditor.svelte'
import ErrorPresenter from './components/ErrorPresenter.svelte'
import ExecutionMyToDos from './components/ExecutionMyToDos.svelte'
import ExecutonPresenter from './components/ExecutonPresenter.svelte'
import ExecutonProgressPresenter from './components/ExecutonProgressPresenter.svelte'
import Main from './components/Main.svelte'
import SubProcessPresenter from './components/presenters/SubProcessPresenter.svelte'
import ToDoPresenter from './components/presenters/ToDoPresenter.svelte'
import UpdateCardPresenter from './components/presenters/UpdateCardPresenter.svelte'
import ProcessesCardSection from './components/ProcessesCardSection.svelte'
import ProcessesExtension from './components/ProcessesExtension.svelte'
import ProcessesSettingSection from './components/ProcessesSection.svelte'
import ProcessPresenter from './components/ProcessPresenter.svelte'
import RequestsCardSection from './components/RequestsCardSection.svelte'
import RequestsExtension from './components/RequestsExtension.svelte'
import RunProcessCardPopup from './components/RunProcessCardPopup.svelte'
import RunProcessPopup from './components/RunProcessPopup.svelte'
import ActionsPresenter from './components/settings/ActionsPresenter.svelte'
import CancelSubProcessEditor from './components/settings/CancelSubProcessEditor.svelte'
import CancelToDoEditor from './components/settings/CancelToDoEditor.svelte'
import FunctionSubmenu from './components/settings/FunctionSubmenu.svelte'
import ProcessEditor from './components/settings/ProcessEditor.svelte'
import StatePresenter from './components/settings/StatePresenter.svelte'
import SubProcessEditor from './components/settings/SubProcessEditor.svelte'
import ToDoEditor from './components/settings/ToDoEditor.svelte'
import ToDoParamsEditor from './components/settings/ToDoParamsEditor.svelte'
import ToDoRemoveParamsEditor from './components/settings/ToDoRemoveParamsEditor.svelte'
import TransitionEditor from './components/settings/TransitionEditor.svelte'
import TriggerPresenter from './components/settings/TriggerPresenter.svelte'
import UpdateCardEditor from './components/settings/UpdateCardEditor.svelte'
import ArrayElementEditor from './components/transformEditors/ArrayElementEditor.svelte'
import DateOffsetEditor from './components/transformEditors/DateOffsetEditor.svelte'
import FilterEditor from './components/transformEditors/FilterEditor.svelte'
import MultiArrayElementEditor from './components/transformEditors/MultiArrayElementEditor.svelte'
import NumberEditor from './components/transformEditors/NumberEditor.svelte'

import ArraySizeCriteria from './components/criterias/ArraySizeCriteria.svelte'
import BaseCriteria from './components/criterias/BaseCriteria.svelte'
import RangeCriteria from './components/criterias/RangeCriteria.svelte'
import LogActionPresenter from './components/LogActionPresenter.svelte'
import NotifierExtension from './components/NotifierExtension.svelte'
import AddRelationPresenter from './components/presenters/AddRelationPresenter.svelte'
import AddTagPresenter from './components/presenters/AddTagPresenter.svelte'
import CreateCardPresenter from './components/presenters/CreateCardPresenter.svelte'
import ProcessesHeaderExtension from './components/ProcessesHeaderExtension.svelte'
import AddRelationEditor from './components/settings/AddRelationEditor.svelte'
import AddTagEditor from './components/settings/AddTagEditor.svelte'
import ApproveRequestEditor from './components/settings/ApproveRequestEditor.svelte'
import ApproveRequestTriggerEditor from './components/settings/ApproveRequestTriggerEditor.svelte'
import ApproveRequestTriggerPresenter from './components/settings/ApproveRequestTriggerPresenter.svelte'
import CardUpdateEditor from './components/settings/CardUpdateEditor.svelte'
import CardUpdatePresenter from './components/settings/CardUpdatePresenter.svelte'
import CreateCardEditor from './components/settings/CreateCardEditor.svelte'
import FieldChangesEditor from './components/settings/FieldChangesEditor.svelte'
import LockSectionEditor from './components/settings/LockSectionEditor.svelte'
import LockSectionPresenter from './components/settings/LockSectionPresenter.svelte'
import SubProcessMatchEditor from './components/settings/SubProcessMatchEditor.svelte'
import SubProcessMatchPresenter from './components/settings/SubProcessMatchPresenter.svelte'
import TimeEditor from './components/settings/TimeEditor.svelte'
import TimePresenter from './components/settings/TimePresenter.svelte'
import ToDoSettingPresenter from './components/settings/ToDoPresenter.svelte'
import ToDoValuePresenter from './components/settings/ToDoValuePresenter.svelte'
import TransitionRefPresenter from './components/settings/TransitionRefPresenter.svelte'
import UnLockSectionPresenter from './components/settings/UnLockSectionPresenter.svelte'
import AppendEditor from './components/transformEditors/AppendEditor.svelte'
import CutEditor from './components/transformEditors/CutEditor.svelte'
import ReplaceEditor from './components/transformEditors/ReplaceEditor.svelte'
import SplitEditor from './components/transformEditors/SplitEditor.svelte'
import NumberPresenter from './components/transformPresenters/NumberPresenter.svelte'
import RolePresenter from './components/transformPresenters/RolePresenter.svelte'
import ExecutionRefPresenter from './components/ExecutionRefPresenter.svelte'
import ActionTypePresenter from './components/ActionTypePresenter.svelte'
import LockFieldEditor from './components/settings/LockFieldEditor.svelte'
import LockFieldPresenter from './components/settings/LockFieldPresenter.svelte'
import UnLockFieldPresenter from './components/settings/UnLockFieldPresenter.svelte'

import { exportProcesses, importProcess } from './exporter'
import { ProcessMiddleware } from './middleware'
import {
  approveRequestApproved,
  approveRequestRejected,
  checkProcessSectionVisibility,
  checkRequestsSectionVisibility,
  continueExecution,
  eventCheck,
  fieldChangesCheck,
  matchCardCheck,
  showDoneQuery,
  subProcessesDoneCheck,
  subProcessMatchCheck,
  timeTransitionCheck,
  todoTranstionCheck
} from './utils'

export * from './query'

export default async (): Promise<Resources> => ({
  actionImpl: {
    ContinueExecution: continueExecution
  },
  component: {
    UpdateCardEditor,
    SubProcessEditor,
    ProcessesSettingSection,
    ProcessEditor,
    ToDoEditor,
    RunProcessPopup,
    SubProcessPresenter,
    ToDoPresenter,
    UpdateCardPresenter,
    ProcessesExtension,
    RequestsExtension,
    RequestsCardSection,
    ExecutonPresenter,
    ExecutonProgressPresenter,
    ProcessPresenter,
    NestedContextSelector,
    RelatedContextSelector,
    ExecutionContextSelector,
    FunctionSelector,
    Main,
    RunProcessCardPopup,
    ErrorPresenter,
    RequestUserInput,
    ResultInput,
    RoleEditor,
    ActionsPresenter,
    StatePresenter,
    TriggerPresenter,
    ToDoRemoveEditor: ToDoRemoveParamsEditor,
    ToDoCloseEditor: ToDoParamsEditor,
    CardUpdateEditor,
    ProcessesCardSection,
    TransitionEditor,
    TransitionRefPresenter,
    LogActionPresenter,
    NotifierExtension,
    CreateCardEditor,
    CreateCardPresenter,
    AddRelationEditor,
    AddRelationPresenter,
    CardUpdatePresenter,
    ToDoSettingPresenter,
    TimeEditor,
    TimePresenter,
    AddTagEditor,
    AddTagPresenter,
    ExecutionMyToDos,
    FieldChangesEditor,
    FunctionSubmenu,
    SubProcessMatchEditor,
    SubProcessMatchPresenter,
    ProcessesHeaderExtension,
    ApproveRequestPresenter,
    ApproveRequestEditor,
    ApproveRequestTriggerEditor,
    ApproveRequestTriggerPresenter,
    LockSectionPresenter,
    LockSectionEditor,
    UnLockSectionPresenter,
    CancelToDoEditor,
    CancelSubProcessEditor,
    ToDoValuePresenter,
    ExecutionRefPresenter,
    ActionTypePresenter,
    LockFieldEditor,
    LockFieldPresenter,
    UnLockFieldPresenter
  },
  criteriaEditor: {
    BaseCriteria,
    ArraySizeCriteria,
    RangeCriteria
  },
  transformPresenter: {
    NumberPresenter,
    RolePresenter
  },
  transformEditor: {
    ArrayElementEditor,
    MultiArrayElementEditor,
    DateOffsetEditor,
    NumberEditor,
    AppendEditor,
    ReplaceEditor,
    SplitEditor,
    CutEditor,
    FilterEditor
  },
  triggerCheck: {
    MatchCheck: matchCardCheck,
    FieldChangedCheck: fieldChangesCheck,
    SubProcessesDoneCheck: subProcessesDoneCheck,
    SubProcessMatchCheck: subProcessMatchCheck,
    ToDo: todoTranstionCheck,
    Time: timeTransitionCheck,
    OnEventCheck: eventCheck,
    ApproveRequestApproved: approveRequestApproved,
    ApproveRequestRejected: approveRequestRejected
  },
  function: {
    ExportProcess: exportProcesses,
    ImportProcess: importProcess,
    ShowDoneQuery: showDoneQuery,
    CheckProcessSectionVisibility: checkProcessSectionVisibility,
    CheckRequestsSectionVisibility: checkRequestsSectionVisibility,
    // eslint-disable-next-line @typescript-eslint/unbound-method
    CreateMiddleware: ProcessMiddleware.create
  }
})
