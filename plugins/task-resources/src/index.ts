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

import { Attribute, Class, Doc, DocumentQuery, Ref, Status, TxOperations } from '@hcengineering/core'
import { IntlString, Resources } from '@hcengineering/platform'
import task, { SpaceWithStates, State, Task, calcRank } from '@hcengineering/task'
import { showPopup } from '@hcengineering/ui'
import { ViewletDescriptor } from '@hcengineering/view'
import { CategoryQuery, statusStore } from '@hcengineering/view-resources'
import { get } from 'svelte/store'
import AssignedTasks from './components/AssignedTasks.svelte'
import CreateStatePopup from './components/CreateStatePopup.svelte'
import CreateStateTemplatePopup from './components/CreateStateTemplatePopup.svelte'
import Dashboard from './components/Dashboard.svelte'
import DueDateEditor from './components/DueDateEditor.svelte'
import KanbanTemplatePresenter from './components/KanbanTemplatePresenter.svelte'
import StatusSelector from './components/StatusSelector.svelte'
import StatusTableView from './components/StatusTableView.svelte'
import TaskHeader from './components/TaskHeader.svelte'
import TaskPresenter from './components/TaskPresenter.svelte'
import KanbanTemplateEditor from './components/kanban/KanbanTemplateEditor.svelte'
import KanbanTemplateSelector from './components/kanban/KanbanTemplateSelector.svelte'
import KanbanView from './components/kanban/KanbanView.svelte'
import DoneStateEditor from './components/state/DoneStateEditor.svelte'
import DoneStatePresenter from './components/state/DoneStatePresenter.svelte'
import DoneStateRefPresenter from './components/state/DoneStateRefPresenter.svelte'
import EditStatuses from './components/state/EditStatuses.svelte'
import StateEditor from './components/state/StateEditor.svelte'
import StatePresenter from './components/state/StatePresenter.svelte'
import StateRefPresenter from './components/state/StateRefPresenter.svelte'
import TodoItemPresenter from './components/todos/TodoItemPresenter.svelte'
import TodoItemsPopup from './components/todos/TodoItemsPopup.svelte'
import TodoStatePresenter from './components/todos/TodoStatePresenter.svelte'
import Todos from './components/todos/Todos.svelte'

export { default as AssigneePresenter } from './components/AssigneePresenter.svelte'
export { StateRefPresenter }

async function editStatuses (
  object: SpaceWithStates,
  ev: Event,
  props: {
    ofAttribute: Ref<Attribute<Status>>
    doneOfAttribute: Ref<Attribute<Status>>
  }
): Promise<void> {
  showPopup(
    EditStatuses,
    { _id: object._id, ofAttribute: props.ofAttribute, doneOfAttribute: props.doneOfAttribute },
    'float'
  )
}

async function selectStatus (
  doc: Task | Task[],
  ev: any,
  props: {
    ofAttribute: Ref<Attribute<Status>>
    placeholder: IntlString
    _class: Ref<Class<Status>>
  }
): Promise<void> {
  showPopup(
    StatusSelector,
    { value: doc, ofAttribute: props.ofAttribute, _class: props._class, placeholder: props.placeholder },
    'top'
  )
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
    CreateStatePopup,
    CreateStateTemplatePopup,
    StatusSelector
  },
  actionImpl: {
    EditStatuses: editStatuses,
    SelectStatus: selectStatus
  },
  function: {
    GetAllStates: getAllStates,
    StatusSort: statusSort
  }
})

async function getAllStates (
  query: DocumentQuery<Doc> | undefined,
  onUpdate: () => void,
  queryId: Ref<Doc>,
  attr: Attribute<State>
): Promise<any[]> {
  const _space = query?.space
  if (_space !== undefined) {
    const promise = new Promise<Array<Ref<Doc>>>((resolve, reject) => {
      let refresh: boolean = false
      const lq = CategoryQuery.getLiveQuery(queryId)
      refresh = lq.query(task.class.SpaceWithStates, { _id: _space as Ref<SpaceWithStates> }, (res) => {
        const result = res[0]?.states ?? []
        CategoryQuery.results.set(queryId, result)
        resolve(result)
        onUpdate()
      })

      if (!refresh) {
        resolve(CategoryQuery.results.get(queryId) ?? [])
      }
    })
    return await promise
  }
  // statusStore.subscribe(onUpdate)
  return Array.from(get(statusStore).values())
    .filter((p) => p.ofAttribute === attr._id)
    .map((p) => p._id)
}

async function statusSort (
  client: TxOperations,
  value: Array<Ref<State>>,
  space: Ref<SpaceWithStates> | undefined,
  viewletDescriptorId?: Ref<ViewletDescriptor>
): Promise<Array<Ref<State>>> {
  let _space: SpaceWithStates | undefined
  if (space !== undefined) {
    _space = await client.findOne(task.class.SpaceWithStates, { _id: space })
  }
  const statuses = get(statusStore)

  if (_space !== undefined) {
    value.sort((a, b) => {
      const aVal = statuses.get(a) as State
      const bVal = statuses.get(b) as State
      if (_space != null) {
        const aIndex = _space.states.findIndex((s) => s === a)
        const bIndex = _space.states.findIndex((s) => s === b)
        return aIndex - bIndex
      } else {
        return aVal.name.localeCompare(bVal.name)
      }
    })
  } else {
    const res: Map<Ref<State>, string> = new Map()
    let prevRank: string | undefined
    for (const state of value) {
      if (res.has(state)) continue
      _space = await client.findOne(task.class.SpaceWithStates, { states: state })
      if (_space === undefined) continue
      for (let index = 0; index < _space.states.length; index++) {
        const st = _space.states[index]
        const prev = index > 0 ? res.get(_space.states[index - 1]) : prevRank
        const next = index < _space.states.length - 1 ? res.get(_space.states[index + 1]) : undefined
        const rank = calcRank(
          prev !== undefined ? { rank: prev } : undefined,
          next !== undefined ? { rank: next } : undefined
        )
        res.set(st, rank)
        prevRank = rank
      }
    }
    const result: Array<{
      _id: Ref<State>
      rank: string
    }> = []
    for (const [key, value] of res.entries()) {
      result.push({ _id: key, rank: value })
    }
    result.sort((a, b) => a.rank.localeCompare(b.rank))
    return result.filter((p) => value.includes(p._id)).map((p) => p._id)
  }

  return value
}
