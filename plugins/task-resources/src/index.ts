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

import { Resources } from '@hcengineering/platform'
import { SpaceWithStates } from '@hcengineering/task'
import { showPopup } from '@hcengineering/ui'
import AssignedTasks from './components/AssignedTasks.svelte'
import KanbanTemplateEditor from './components/kanban/KanbanTemplateEditor.svelte'
import KanbanTemplateSelector from './components/kanban/KanbanTemplateSelector.svelte'
import KanbanView from './components/kanban/KanbanView.svelte'
import DoneStateEditor from './components/state/DoneStateEditor.svelte'
import DoneStatePresenter from './components/state/DoneStatePresenter.svelte'
import EditStatuses from './components/state/EditStatuses.svelte'
import StateEditor from './components/state/StateEditor.svelte'
import StatePresenter from './components/state/StatePresenter.svelte'
import StatusTableView from './components/StatusTableView.svelte'
import TaskHeader from './components/TaskHeader.svelte'
import TaskPresenter from './components/TaskPresenter.svelte'
import KanbanTemplatePresenter from './components/KanbanTemplatePresenter.svelte'
import TodoItemPresenter from './components/todos/TodoItemPresenter.svelte'
import TodoItemsPopup from './components/todos/TodoItemsPopup.svelte'
import Todos from './components/todos/Todos.svelte'
import TodoStatePresenter from './components/todos/TodoStatePresenter.svelte'
import Dashboard from './components/Dashboard.svelte'
import DoneStateRefPresenter from './components/state/DoneStateRefPresenter.svelte'
import StateRefPresenter from './components/state/StateRefPresenter.svelte'
import DueDateEditor from './components/DueDateEditor.svelte'
import CreateStatePopup from './components/CreateStatePopup.svelte'

export { default as AssigneePresenter } from './components/AssigneePresenter.svelte'
export { StateRefPresenter }

async function editStatuses (object: SpaceWithStates): Promise<void> {
  showPopup(EditStatuses, { _id: object._id, spaceClass: object._class }, 'float')
}

export type StatesBarPosition = 'start' | 'middle' | 'end' | undefined

export default async (): Promise<Resources> => ({
  component: {
    TaskPresenter,
    KanbanTemplatePresenter,
    Dashboard,
    KanbanView,
    StatePresenter,
    StateEditor,
    DoneStatePresenter,
    Todos,
    TodoItemPresenter,
    TodoStatePresenter,
    StatusTableView,
    TaskHeader,
    DoneStateEditor,
    KanbanTemplateEditor,
    KanbanTemplateSelector,
    AssignedTasks,
    DoneStateRefPresenter,
    StateRefPresenter,
    TodoItemsPopup,
    DueDateEditor,
    CreateStatePopup
  },
  actionImpl: {
    EditStatuses: editStatuses
  }
})
