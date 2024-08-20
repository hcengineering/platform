//
// Copyright © 2023 Hardcore Engineering Inc.
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

import type { Resources } from '@hcengineering/platform'
import Me from './components/Me.svelte'
import Team from './components/team/Team.svelte'
import IssuePresenter from './components/presenters/IssuePresenter.svelte'
import CardPresenter from './components/presenters/CardPresenter.svelte'
import LeadPresenter from './components/presenters/LeadPresenter.svelte'
import DocumentPresenter from './components/presenters/DocumentPresenter.svelte'
import ApplicantPresenter from './components/presenters/ApplicantPresenter.svelte'
import WorkSlotElement from './components/WorkSlotElement.svelte'
import EditWorkSlot from './components/EditWorkSlot.svelte'
import EditToDo from './components/EditToDo.svelte'
import CreateToDoPopup from './components/CreateToDoPopup.svelte'
import NotificationToDoPresenter from './components/NotificationToDoPresenter.svelte'
import PriorityEditor from './components/PriorityEditor.svelte'
import { ToDoTitleProvider, createTodoItemExtension, createTodoListExtension } from './utils'

export type ToDosMode = 'unplanned' | 'planned' | 'all' | 'tag' | 'date'

export default async (): Promise<Resources> => ({
  component: {
    Me,
    Team,
    IssuePresenter,
    CardPresenter,
    LeadPresenter,
    DocumentPresenter,
    ApplicantPresenter,
    EditWorkSlot,
    WorkSlotElement,
    CreateToDoPopup,
    EditToDo,
    NotificationToDoPresenter,
    PriorityEditor
  },
  function: {
    ToDoTitleProvider,
    CreateTodoItemExtension: createTodoItemExtension,
    CreateTodoListExtension: createTodoListExtension
  }
})
