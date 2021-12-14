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

import { Resources } from '@anticrm/platform'

import CreateTask from './components/CreateTask.svelte'
import CreateProject from './components/CreateProject.svelte'
import TaskPresenter from './components/TaskPresenter.svelte'
import KanbanCard from './components/KanbanCard.svelte'
import TemplatesIcon from './components/TemplatesIcon.svelte'
import { Doc } from '@anticrm/core'
import { showPopup } from '@anticrm/ui'

import KanbanView from './components/kanban/KanbanView.svelte'
import StateEditor from './components/state/StateEditor.svelte'
import StatePresenter from './components/state/StatePresenter.svelte'
import EditStatuses from './components/state/EditStatuses.svelte'
import { SpaceWithStates } from '@anticrm/task'

export { default as KanbanTemplateEditor } from './components/kanban/KanbanTemplateEditor.svelte'
export { default as KanbanTemplateSelector } from './components/kanban/KanbanTemplateSelector.svelte'

export { default as Tasks } from './components/Tasks.svelte'

async function createTask (object: Doc): Promise<void> {
  showPopup(CreateTask, { parent: object._id, space: object.space })
}

async function editStatuses (object: SpaceWithStates): Promise<void> {
  showPopup(EditStatuses, { _id: object._id, spaceClass: object._class }, 'right')
}

export default async (): Promise<Resources> => ({
  component: {
    CreateTask,
    CreateProject,
    TaskPresenter,
    KanbanCard,
    TemplatesIcon,
    KanbanView,
    StatePresenter,
    StateEditor
  },
  actionImpl: {
    CreateTask: createTask,
    EditStatuses: editStatuses
  }
})
