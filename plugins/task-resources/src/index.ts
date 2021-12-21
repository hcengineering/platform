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
import EditIssue from './components/EditIssue.svelte'
import { Doc } from '@anticrm/core'
import { showPopup } from '@anticrm/ui'
import { getClient, MessageBox } from '@anticrm/presentation'

import KanbanView from './components/kanban/KanbanView.svelte'
import StateEditor from './components/state/StateEditor.svelte'
import StatePresenter from './components/state/StatePresenter.svelte'
import DoneStatePresenter from './components/state/DoneStatePresenter.svelte'
import EditStatuses from './components/state/EditStatuses.svelte'
import { SpaceWithStates, TodoItem } from '@anticrm/task'
import Todos from './components/todos/Todos.svelte'
import TodoItemPresenter from './components/todos/TodoItemPresenter.svelte'
import TodoStatePresenter from './components/todos/TodoStatePresenter.svelte'

export { default as KanbanTemplateEditor } from './components/kanban/KanbanTemplateEditor.svelte'
export { default as KanbanTemplateSelector } from './components/kanban/KanbanTemplateSelector.svelte'

export { default as Tasks } from './components/Tasks.svelte'
export { default as EditTask } from './components/EditTask.svelte'

async function createTask (object: Doc): Promise<void> {
  showPopup(CreateTask, { parent: object._id, space: object.space })
}

async function editStatuses (object: SpaceWithStates): Promise<void> {
  showPopup(EditStatuses, { _id: object._id, spaceClass: object._class }, 'right')
}

async function toggleDone (value: boolean, object: TodoItem): Promise<void> {
  await getClient().updateCollection(
    object._class,
    object.space,
    object._id,
    object.attachedTo,
    object.attachedToClass,
    object.collection, {
      done: value
    }
  )
}

async function ArchiveSpace (object: SpaceWithStates): Promise<void> {
  showPopup(
    MessageBox,
    {
      label: 'Archive',
      message: `Do you want to archive ${object.name}?`
    },
    undefined,
    (result: boolean) => {
      if (result) {
        const client = getClient()

        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        client.updateDoc(object._class, object.space, object._id, {
          archived: true
        })
      }
    }
  )
}

async function UnarchiveSpace (object: SpaceWithStates): Promise<void> {
  showPopup(
    MessageBox,
    {
      label: 'Unarchive',
      message: `Do you want to unarchive ${object.name}?`
    },
    undefined,
    (result: boolean) => {
      if (result) {
        const client = getClient()

        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        client.updateDoc(object._class, object.space, object._id, {
          archived: false
        })
      }
    }
  )
}

export default async (): Promise<Resources> => ({
  component: {
    CreateTask,
    CreateProject,
    TaskPresenter,
    EditIssue,
    KanbanCard,
    TemplatesIcon,
    KanbanView,
    StatePresenter,
    StateEditor,
    DoneStatePresenter,
    Todos,
    TodoItemPresenter,
    TodoStatePresenter
  },
  actionImpl: {
    CreateTask: createTask,
    EditStatuses: editStatuses,
    TodoItemMarkDone: async (obj: TodoItem) => await toggleDone(true, obj),
    TodoItemMarkUnDone: async (obj: TodoItem) => await toggleDone(false, obj),
    ArchiveSpace,
    UnarchiveSpace
  }
})
