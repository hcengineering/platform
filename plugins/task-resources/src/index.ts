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
import {
  toIdMap,
  getCurrentAccount,
  type Attribute,
  type Class,
  type Doc,
  type DocumentQuery,
  type IdMap,
  type Ref,
  type Status,
  type TxOperations
} from '@hcengineering/core'
import { type IntlString, type Resources } from '@hcengineering/platform'
import { createQuery, onClient } from '@hcengineering/presentation'
import task, {
  getStatusIndex,
  makeRank,
  type Project,
  type ProjectType,
  type Rank,
  type Task,
  type TaskType
} from '@hcengineering/task'
import { getCurrentLocation, navigate, showPopup } from '@hcengineering/ui'
import { type ViewletDescriptor } from '@hcengineering/view'
import { CategoryQuery, statusStore } from '@hcengineering/view-resources'
import { get, writable } from 'svelte/store'

import AssignedTasks from './components/AssignedTasks.svelte'
import Dashboard from './components/Dashboard.svelte'
import DueDateEditor from './components/DueDateEditor.svelte'
import KanbanTemplatePresenter from './components/KanbanTemplatePresenter.svelte'
import StatusFilter from './components/StatusFilter.svelte'
import StatusSelector from './components/StatusSelector.svelte'
import StatusTableView from './components/StatusTableView.svelte'
import TaskHeader from './components/TaskHeader.svelte'
import TaskPresenter from './components/TaskPresenter.svelte'
import TemplatesIcon from './components/TemplatesIcon.svelte'
import TypesView from './components/TypesView.svelte'
import KanbanView from './components/kanban/KanbanView.svelte'
import ProjectTypePresenter from './components/projectTypes/ProjectTypePresenter.svelte'
import CreateStatePopup from './components/state/CreateStatePopup.svelte'
import StateEditor from './components/state/StateEditor.svelte'
import StateIconPresenter from './components/state/StateIconPresenter.svelte'
import StatePresenter from './components/state/StatePresenter.svelte'
import StateRefPresenter from './components/state/StateRefPresenter.svelte'
import TypeStatesPopup from './components/state/TypeStatesPopup.svelte'
import ProjectTypeClassPresenter from './components/taskTypes/ProjectTypeClassPresenter.svelte'
import TaskKindSelector from './components/taskTypes/TaskKindSelector.svelte'
import TaskTypeClassPresenter from './components/taskTypes/TaskTypeClassPresenter.svelte'
import TaskTypePresenter from './components/taskTypes/TaskTypePresenter.svelte'
import TaskTypeListPresenter from './components/taskTypes/TaskTypeListPresenter.svelte'

import CreateProjectType from './components/projectTypes/CreateProjectType.svelte'
import ProjectTypeAutomationsSectionEditor from './components/projectTypes/ProjectTypeAutomationsSectionEditor.svelte'
import ProjectTypeGeneralSectionEditor from './components/projectTypes/ProjectTypeGeneralSectionEditor.svelte'
import ProjectTypeSelector from './components/projectTypes/ProjectTypeSelector.svelte'
import ProjectTypeTasksTypeSectionEditor from './components/projectTypes/ProjectTypeTasksTypeSectionEditor.svelte'
import TaskTypeEditor from './components/taskTypes/TaskTypeEditor.svelte'

export { default as AssigneePresenter } from './components/AssigneePresenter.svelte'
export { default as TypeSelector } from './components/TypeSelector.svelte'
export * from './utils'
export { StatePresenter, StateRefPresenter, TaskKindSelector, TypeStatesPopup }

async function editStatuses (object: Project, ev: Event): Promise<void> {
  const loc = getCurrentLocation()
  loc.path[2] = 'setting'
  loc.path[3] = 'spaceTypes'
  loc.path[4] = object.type
  navigate(loc)
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
    StatusTableView,
    TaskHeader,
    AssignedTasks,
    StateRefPresenter,
    DueDateEditor,
    CreateStatePopup,
    StatusSelector,
    TemplatesIcon,
    TypesView,
    StateIconPresenter,
    StatusFilter,
    TaskTypePresenter,
    TaskTypeListPresenter,
    TaskTypeClassPresenter,
    ProjectTypeClassPresenter,
    ProjectTypePresenter,
    ProjectTypeSelector,
    CreateProjectType,
    ProjectTypeGeneralSectionEditor,
    ProjectTypeTasksTypeSectionEditor,
    ProjectTypeAutomationsSectionEditor,
    TaskTypeEditor
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

export async function getAllStates (
  query: DocumentQuery<Doc> | undefined,
  onUpdate: () => void,
  queryId: Ref<Doc>,
  attr: Attribute<Status>,
  filterDone: boolean = true
): Promise<any[]> {
  const joinedProjectsTypes = get(typesOfJoinedProjectsStore) ?? []
  const typeId = get(selectedTypeStore) ?? (joinedProjectsTypes.length === 1 ? joinedProjectsTypes[0] : undefined)
  const type = typeId !== undefined ? get(typeStore).get(typeId) : undefined
  const $taskType = get(taskTypeStore)
  const joinedTaskTypes = Array.from($taskType.values()).filter((taskType) =>
    joinedProjectsTypes.includes(taskType.parent)
  )
  const taskTypeId = get(selectedTaskTypeStore) ?? (joinedTaskTypes.length === 1 ? joinedTaskTypes[0]?._id : undefined)
  if (taskTypeId !== undefined) {
    const taskType = $taskType.get(taskTypeId)
    if (taskType === undefined) {
      return []
    }
    if (type !== undefined) {
      const statusMap = get(statusStore).byId
      const statuses = (taskType.statuses.map((p) => statusMap.get(p)) as Status[]) ?? []
      if (filterDone) {
        return statuses
          .filter((p) => p?.category !== task.statusCategory.Lost && p?.category !== task.statusCategory.Won)
          .map((p) => p?._id)
      } else {
        return statuses.map((p) => p?._id)
      }
    }
    const _space = query?.space
    if (_space !== undefined) {
      const promise = new Promise<Array<Ref<Doc>>>((resolve, reject) => {
        let refresh: boolean = false
        const lq = CategoryQuery.getLiveQuery(queryId)
        refresh = lq.query(task.class.Project, { _id: _space as Ref<Project> }, (res) => {
          const statusMap = get(statusStore).byId
          const statuses = (taskType.statuses.map((p) => statusMap.get(p)) as Status[]) ?? []
          let result: Array<Ref<Status>> = []
          if (filterDone) {
            result = statuses
              .filter((p) => p?.category !== task.statusCategory.Lost && p?.category !== task.statusCategory.Won)
              .map((p) => p?._id)
          } else {
            result = statuses.map((p) => p?._id)
          }
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
  } else if (type !== undefined) {
    const statusMap = get(statusStore).byId
    const statuses = (type.statuses.map((p) => statusMap.get(p._id)) as Status[]) ?? []
    if (filterDone) {
      return statuses
        .filter((p) => p?.category !== task.statusCategory.Lost && p?.category !== task.statusCategory.Won)
        .map((p) => p?._id)
    } else {
      return statuses.map((p) => p?._id)
    }
  }
  const includedStatuses = new Set(joinedTaskTypes.flatMap((taskType) => taskType.statuses))
  const $statusStore = get(statusStore)
  const allStates = [...includedStatuses].map((p) => $statusStore.byId.get(p))
  const states = allStates.filter((p) => p !== undefined && p.ofAttribute === attr._id)
  if (filterDone) {
    return states
      .filter((p) => p?.category !== task.statusCategory.Lost && p?.category !== task.statusCategory.Won)
      .map((p) => p?._id)
  } else {
    return states.map((p) => p?._id)
  }
}

async function statusSort (
  client: TxOperations,
  value: Array<Ref<Status>>,
  space: Ref<Project> | undefined,
  viewletDescriptorId?: Ref<ViewletDescriptor>
): Promise<Array<Ref<Status>>> {
  const typeId = get(selectedTypeStore)
  const type = typeId !== undefined ? get(typeStore).get(typeId) : undefined
  const statuses = get(statusStore).byId
  const taskTypes = get(taskTypeStore)

  if (type !== undefined) {
    value.sort((a, b) => {
      const aVal = statuses.get(a) as Status
      const bVal = statuses.get(b) as Status
      if (type != null) {
        const aIndex = getStatusIndex(type, taskTypes, a)
        const bIndex = getStatusIndex(type, taskTypes, b)
        return aIndex - bIndex
      } else if (aVal != null && bVal != null) {
        return aVal.name.localeCompare(bVal.name)
      } else {
        return 0
      }
    })
  } else {
    const res = new Map<Ref<Status>, Rank>()
    let prevRank: Rank | undefined
    const types = await client.findAll(task.class.ProjectType, {})
    for (const state of value) {
      if (res.has(state)) continue
      const index = types.findIndex((p) => p.tasks.some((q) => taskTypes.get(q)?.statuses.includes(state)))
      if (index === -1) continue
      const type = types.splice(index, 1)[0]
      const statuses =
        type.tasks.map((it) => taskTypes.get(it)).find((it) => it?.statuses.includes(state))?.statuses ?? []

      // TODO: Check correctness
      for (let index = 0; index < statuses.length; index++) {
        const st = statuses[index]
        const prev = index > 0 ? res.get(statuses[index - 1]) : prevRank
        const next = index < statuses.length - 1 ? res.get(statuses[index + 1]) : undefined
        const rank = makeRank(prev, next)
        res.set(st, rank)
        prevRank = rank
      }
    }
    const result: Array<{
      _id: Ref<Status>
      rank: Rank
    }> = []
    for (const [key, value] of res.entries()) {
      result.push({ _id: key, rank: value })
    }
    result.sort((a, b) => a.rank.localeCompare(b.rank))
    return result.filter((p) => value.includes(p._id)).map((p) => p._id)
  }
  return value
}

export const typeStore = writable<IdMap<ProjectType>>(new Map())
export const taskTypeStore = writable<IdMap<TaskType>>(new Map())
export const typesOfJoinedProjectsStore = writable<Array<Ref<ProjectType>>>()
export const joinedProjectsStore = writable<Project[]>()

const query = createQuery(true)
const taskQuery = createQuery(true)
const projectQuery = createQuery(true)

onClient((client, user) => {
  query.query(task.class.ProjectType, {}, (res) => {
    typeStore.set(toIdMap(res))
  })

  taskQuery.query(task.class.TaskType, {}, (res) => {
    taskTypeStore.set(toIdMap(res))
  })

  projectQuery.query(
    task.class.Project,
    { members: getCurrentAccount().uuid },
    (res) => {
      typesOfJoinedProjectsStore.set(res.map((r) => r.type).filter((it, idx, arr) => arr.indexOf(it) === idx))
      joinedProjectsStore.set(res)
    },
    { showArchived: true }
  )
})

export const selectedTypeStore = writable<Ref<ProjectType> | undefined>(undefined)
export const selectedTaskTypeStore = writable<Ref<TaskType> | undefined>(undefined)

export const activeProjects = writable<IdMap<Project>>(new Map())
const activeProjectsQuery = createQuery(true)

activeProjectsQuery.query(task.class.Project, { archived: false }, (projects) => {
  activeProjects.set(toIdMap(projects))
})
