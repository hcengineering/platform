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
import FunctionSelector from './components/attributeEditors/FunctionSelector.svelte'
import NestedContextSelector from './components/attributeEditors/NestedContextSelector.svelte'
import RelatedContextSelector from './components/attributeEditors/RelatedContextSelector.svelte'
import ExecutionContextSelector from './components/attributeEditors/ExecutionContextSelector.svelte'
import RequestUserInput from './components/contextEditors/RequestUserInput.svelte'
import ResultInput from './components/contextEditors/ResultInput.svelte'
import RoleEditor from './components/contextEditors/RoleEditor.svelte'
import ErrorPresenter from './components/ErrorPresenter.svelte'
import ExecutonPresenter from './components/ExecutonPresenter.svelte'
import ExecutonProgressPresenter from './components/ExecutonProgressPresenter.svelte'
import Main from './components/Main.svelte'
import ExecutionMyToDos from './components/ExecutionMyToDos.svelte'
import SubProcessPresenter from './components/presenters/SubProcessPresenter.svelte'
import ToDoPresenter from './components/presenters/ToDoPresenter.svelte'
import UpdateCardPresenter from './components/presenters/UpdateCardPresenter.svelte'
import ProcessesCardSection from './components/ProcessesCardSection.svelte'
import ProcessesExtension from './components/ProcessesExtension.svelte'
import ProcessesSettingSection from './components/ProcessesSection.svelte'
import ProcessPresenter from './components/ProcessPresenter.svelte'
import RunProcessCardPopup from './components/RunProcessCardPopup.svelte'
import RunProcessPopup from './components/RunProcessPopup.svelte'
import ActionsPresenter from './components/settings/ActionsPresenter.svelte'
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
import MultiArrayElementEditor from './components/transformEditors/MultiArrayElementEditor.svelte'
import DateOffsetEditor from './components/transformEditors/DateOffsetEditor.svelte'
import NumberEditor from './components/transformEditors/NumberEditor.svelte'

import ArrayCriteria from './components/criterias/ArrayCriteria.svelte'
import BooleanCriteria from './components/criterias/BooleanCriteria.svelte'
import DateCriteria from './components/criterias/DateCriteria.svelte'
import EnumCriteria from './components/criterias/EnumCriteria.svelte'
import NumberCriteria from './components/criterias/NumberCriteria.svelte'
import RefCriteria from './components/criterias/RefCriteria.svelte'
import StringCriteria from './components/criterias/StringCriteria.svelte'
import LogActionPresenter from './components/LogActionPresenter.svelte'
import NotifierExtension from './components/NotifierExtension.svelte'
import AddRelationPresenter from './components/presenters/AddRelationPresenter.svelte'
import CreateCardPresenter from './components/presenters/CreateCardPresenter.svelte'
import AddRelationEditor from './components/settings/AddRelationEditor.svelte'
import AddTagEditor from './components/settings/AddTagEditor.svelte'
import AddTagPresenter from './components/presenters/AddTagPresenter.svelte'
import CardUpdateEditor from './components/settings/CardUpdateEditor.svelte'
import CardUpdatePresenter from './components/settings/CardUpdatePresenter.svelte'
import CreateCardEditor from './components/settings/CreateCardEditor.svelte'
import TimeEditor from './components/settings/TimeEditor.svelte'
import TimePresenter from './components/settings/TimePresenter.svelte'
import ToDoSettingPresenter from './components/settings/ToDoPresenter.svelte'
import TransitionRefPresenter from './components/settings/TransitionRefPresenter.svelte'
import AppendEditor from './components/transformEditors/AppendEditor.svelte'
import CutEditor from './components/transformEditors/CutEditor.svelte'
import ReplaceEditor from './components/transformEditors/ReplaceEditor.svelte'
import SplitEditor from './components/transformEditors/SplitEditor.svelte'
import NumberPresenter from './components/transformPresenters/NumberPresenter.svelte'
import RolePresenter from './components/transformPresenters/RolePresenter.svelte'
import { ProcessMiddleware } from './middleware'
import {
  continueExecution,
  showDoneQuery,
  timeTransitionCheck,
  todoTranstionCheck,
  updateCardTranstionCheck,
  subProcessesDoneCheck
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
    ExecutionMyToDos
  },
  criteriaEditor: {
    DateCriteria,
    StringCriteria,
    BooleanCriteria,
    NumberCriteria,
    RefCriteria,
    EnumCriteria,
    ArrayCriteria
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
    CutEditor
  },
  triggerCheck: {
    UpdateCheck: updateCardTranstionCheck,
    SubProcessesDoneCheck: subProcessesDoneCheck,
    ToDo: todoTranstionCheck,
    Time: timeTransitionCheck
  },
  function: {
    ShowDoneQuery: showDoneQuery,
    // eslint-disable-next-line @typescript-eslint/unbound-method
    CreateMiddleware: ProcessMiddleware.create
  }
})
