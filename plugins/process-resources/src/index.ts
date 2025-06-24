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
import DateOffsetEditor from './components/transformEditors/DateOffsetEditor.svelte'
import NumberOffsetEditor from './components/transformEditors/NumberOffsetEditor.svelte'
import RequestUserInput from './components/contextEditors/RequestUserInput.svelte'
import ErrorPresenter from './components/ErrorPresenter.svelte'
import ExecutonPresenter from './components/ExecutonPresenter.svelte'
import ExecutonProgressPresenter from './components/ExecutonProgressPresenter.svelte'
import Main from './components/Main.svelte'
import SubProcessPresenter from './components/presenters/SubProcessPresenter.svelte'
import ToDoPresenter from './components/presenters/ToDoPresenter.svelte'
import UpdateCardPresenter from './components/presenters/UpdateCardPresenter.svelte'
import ProcessEditor from './components/settings/ProcessEditor.svelte'
import ProcessesExtension from './components/ProcessesExtension.svelte'
import ProcessesSettingSection from './components/ProcessesSection.svelte'
import ProcessPresenter from './components/ProcessPresenter.svelte'
import RunProcessCardPopup from './components/RunProcessCardPopup.svelte'
import RunProcessPopup from './components/RunProcessPopup.svelte'
import SubProcessEditor from './components/settings/SubProcessEditor.svelte'
import ToDoEditor from './components/settings/ToDoEditor.svelte'
import UpdateCardEditor from './components/settings/UpdateCardEditor.svelte'
import ResultInput from './components/contextEditors/ResultInput.svelte'
import RoleEditor from './components/contextEditors/RoleEditor.svelte'
import StatePresenter from './components/settings/StatePresenter.svelte'
import TriggerPresenter from './components/settings/TriggerPresenter.svelte'
import ActionsPresenter from './components/settings/ActionsPresenter.svelte'
import ToDoParamsEditor from './components/settings/ToDoParamsEditor.svelte'
import ToDoRemoveParamsEditor from './components/settings/ToDoRemoveParamsEditor.svelte'
import ProcessesCardSection from './components/ProcessesCardSection.svelte'
import TransitionEditor from './components/settings/TransitionEditor.svelte'

import { continueExecution, showDoneQuery, todoTranstionCheck } from './utils'
import { ProcessMiddleware } from './middleware'
import AppendEditor from './components/transformEditors/AppendEditor.svelte'
import ReplaceEditor from './components/transformEditors/ReplaceEditor.svelte'
import SplitEditor from './components/transformEditors/SplitEditor.svelte'
import CutEditor from './components/transformEditors/CutEditor.svelte'

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
    ProcessesCardSection,
    TransitionEditor
  },
  transformEditor: {
    DateOffsetEditor,
    NumberOffsetEditor,
    AppendEditor,
    ReplaceEditor,
    SplitEditor,
    CutEditor
  },
  triggerCheck: {
    ToDo: todoTranstionCheck
  },
  function: {
    ShowDoneQuery: showDoneQuery,
    // eslint-disable-next-line @typescript-eslint/unbound-method
    CreateMiddleware: ProcessMiddleware.create
  }
})
