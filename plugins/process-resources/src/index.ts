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
import DateOffsetEditor from './components/contextEditors/DateOffsetEditor.svelte'
import NumberOffsetEditor from './components/contextEditors/NumberOffsetEditor.svelte'
import ExecutonPresenter from './components/ExecutonPresenter.svelte'
import ExecutonProgressPresenter from './components/ExecutonProgressPresenter.svelte'
import Main from './components/Main.svelte'
import SubProcessPresenter from './components/presenters/SubProcessPresenter.svelte'
import ToDoPresenter from './components/presenters/ToDoPresenter.svelte'
import UpdateCardPresenter from './components/presenters/UpdateCardPresenter.svelte'
import ProcessEditor from './components/ProcessEditor.svelte'
import ProcessesExtension from './components/ProcessesExtension.svelte'
import ProcessesSettingSection from './components/ProcessesSection.svelte'
import ProcessPresenter from './components/ProcessPresenter.svelte'
import RunProcessCardPopup from './components/RunProcessCardPopup.svelte'
import RunProcessPopup from './components/RunProcessPopup.svelte'
import SubProcessEditor from './components/SubProcessEditor.svelte'
import ToDoEditor from './components/ToDoEditor.svelte'
import UpdateCardEditor from './components/UpdateCardEditor.svelte'
import ErrorPresenter from './components/ErrorPresenter.svelte'
import { continueExecution, showDoneQuery } from './utils'

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
    DateOffsetEditor,
    NumberOffsetEditor,
    ErrorPresenter
  },
  function: {
    ShowDoneQuery: showDoneQuery
  }
})
