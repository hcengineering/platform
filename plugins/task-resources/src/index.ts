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

import { Class, Client, Doc, Ref } from '@anticrm/core'
import login from '@anticrm/login'
import { getMetadata, IntlString, Resources, translate } from '@anticrm/platform'
import { getClient, MessageBox, ObjectSearchResult } from '@anticrm/presentation'
import { Issue, SpaceWithStates, Task, TodoItem } from '@anticrm/task'
import task from './plugin'
import { showPopup } from '@anticrm/ui'
import view from '@anticrm/view'
import workbench from '@anticrm/workbench'
import CreateProject from './components/CreateProject.svelte'
import CreateTask from './components/CreateTask.svelte'
import EditIssue from './components/EditIssue.svelte'
import KanbanTemplateEditor from './components/kanban/KanbanTemplateEditor.svelte'
import KanbanTemplateSelector from './components/kanban/KanbanTemplateSelector.svelte'
import KanbanView from './components/kanban/KanbanView.svelte'
import KanbanCard from './components/KanbanCard.svelte'
import DoneStateEditor from './components/state/DoneStateEditor.svelte'
import DoneStatePresenter from './components/state/DoneStatePresenter.svelte'
import EditStatuses from './components/state/EditStatuses.svelte'
import StateEditor from './components/state/StateEditor.svelte'
import StatePresenter from './components/state/StatePresenter.svelte'
import StatusTableView from './components/StatusTableView.svelte'
import TaskHeader from './components/TaskHeader.svelte'
import TaskItem from './components/TaskItem.svelte'
import TaskPresenter from './components/TaskPresenter.svelte'
import TemplatesIcon from './components/TemplatesIcon.svelte'
import TodoItemPresenter from './components/todos/TodoItemPresenter.svelte'
import Todos from './components/todos/Todos.svelte'
import TodoStatePresenter from './components/todos/TodoStatePresenter.svelte'

async function createTask (object: Doc): Promise<void> {
  showPopup(CreateTask, { parent: object._id, space: object.space })
}

async function editStatuses (object: SpaceWithStates): Promise<void> {
  showPopup(EditStatuses, { _id: object._id, spaceClass: object._class }, 'right')
}

async function toggleDone (value: boolean, object: TodoItem): Promise<void> {
  await getClient().update(object, { done: value })
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
        client.update(object, { archived: true })
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
        client.update(object, { archived: false })
      }
    }
  )
}

export async function queryTask<D extends Task> (_class: Ref<Class<D>>, client: Client, search: string): Promise<ObjectSearchResult[]> {
  const cl = client.getHierarchy().getClass(_class)
  const shortLabel = (await translate(cl.shortLabel ?? '' as IntlString, {})).toUpperCase()

  // Check number pattern

  const sequence = (await client.findOne(task.class.Sequence, { attachedTo: _class }))?.sequence ?? 0

  const named = new Map((await client.findAll(_class, { name: { $like: `%${search}%` } }, { limit: 200 })).map(e => [e._id, e]))
  const nids: number[] = []
  if (sequence > 0) {
    for (let n = 0; n < sequence; n++) {
      const v = `${n}`
      if (v.includes(search)) {
        nids.push(n)
      }
    }
    const numbered = await client.findAll<Task>(_class, { number: { $in: nids } }, { limit: 200 }) as D[]
    for (const d of numbered) {
      if (!named.has(d._id)) {
        named.set(d._id, d)
      }
    }
  }

  return Array.from(named.values()).map(e => ({
    doc: e,
    title: `${shortLabel}-${e.number}`,
    icon: task.icon.Task,
    component: TaskItem
  }))
}

export type StatesBarPosition = 'start' | 'middle' | 'end' | undefined

function issueHTMLPresenter (doc: Doc): string {
  const issue = doc as Issue
  return `<a href="${getMetadata(login.metadata.FrontUrl)}/${workbench.component.WorkbenchApp}/${task.app.Tasks}/${issue.space}/#${view.component.EditDoc}|${issue._id}|${issue._class}">Task-${issue.number}</a>`
}

function issueTextPresenter (doc: Doc): string {
  const issue = doc as Issue
  return `Task-${issue.number}`
}

export default async (): Promise<Resources> => ({
  function: {
    IssueHTMLPresenter: issueHTMLPresenter,
    IssueTextPresenter: issueTextPresenter
  },
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
    TodoStatePresenter,
    StatusTableView,
    TaskHeader,
    DoneStateEditor,
    KanbanTemplateEditor,
    KanbanTemplateSelector
  },
  actionImpl: {
    CreateTask: createTask,
    EditStatuses: editStatuses,
    TodoItemMarkDone: async (obj: TodoItem) => await toggleDone(true, obj),
    TodoItemMarkUnDone: async (obj: TodoItem) => await toggleDone(false, obj),
    ArchiveSpace,
    UnarchiveSpace
  },
  completion: {
    IssueQuery: async (client: Client, query: string) => await queryTask(task.class.Issue, client, query)
  }
})
