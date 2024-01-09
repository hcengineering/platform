//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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

import core, {
  Class,
  ClassifierKind,
  Data,
  Doc,
  DocumentQuery,
  Hierarchy,
  IdMap,
  Ref,
  Status,
  TxOperations,
  generateId,
  type AnyAttribute,
  type RefTo
} from '@hcengineering/core'
import { PlatformError, getEmbeddedLabel, unknownStatus } from '@hcengineering/platform'
import { LexoDecimal, LexoNumeralSystem36, LexoRank } from 'lexorank'
import LexoRankBucket from 'lexorank/lib/lexoRank/lexoRankBucket'
import task, { Project, ProjectStatus, ProjectType, Task, TaskType } from '.'

/**
 * @public
 */
export function genRanks (count: number): string[] {
  const sys = new LexoNumeralSystem36()
  const base = 36
  const max = base ** 6
  const gap = LexoDecimal.parse(Math.trunc(max / (count + 2)).toString(base), sys)
  let cur = LexoDecimal.parse('0', sys)
  const res: string[] = []
  for (let i = 0; i < count; i++) {
    cur = cur.add(gap)
    res.push(new LexoRank(LexoRankBucket.BUCKET_0, cur).toString())
  }
  return res
}

/**
 * @public
 */
export const calcRank = (prev?: { rank: string }, next?: { rank: string }): string => {
  const a = prev?.rank !== undefined ? LexoRank.parse(prev.rank) : LexoRank.min()
  const b = next?.rank !== undefined ? LexoRank.parse(next.rank) : LexoRank.max()
  if (a.equals(b)) {
    return a.genNext().toString()
  }
  return a.between(b).toString()
}

/**
 * @public
 */
export function getProjectTypeStates (
  projectType: Ref<ProjectType> | undefined,
  types: IdMap<ProjectType>,
  statuses: IdMap<Status>
): Status[] {
  if (projectType === undefined) return []
  return (
    (types
      .get(projectType)
      ?.statuses?.map((p) => statuses.get(p._id))
      ?.filter((p) => p !== undefined) as Status[]) ?? []
  )
}

/**
 * @public
 */
export function getStates (space: Project | undefined, types: IdMap<ProjectType>, statuses: IdMap<Status>): Status[] {
  if (space === undefined) return []
  return getProjectTypeStates(space.type, types, statuses)
}

/**
 * @public
 */
export function getTaskTypeStates (
  taskType: Ref<TaskType> | undefined,
  types: IdMap<TaskType>,
  statuses: IdMap<Status>
): Status[] {
  if (taskType === undefined) return []
  return (
    (types
      .get(taskType)
      ?.statuses?.map((p) => statuses.get(p))
      ?.filter((p) => p !== undefined) as Status[]) ?? []
  )
}

/**
 * @public
 */
export function getStatusIndex (type: ProjectType, taskTypes: IdMap<TaskType>, status: Ref<Status>): number {
  return (
    type.tasks
      .map((it) => taskTypes.get(it))
      .flatMap((it) => it?.statuses.indexOf(status))
      .filter((it) => (it ?? 0) >= 0)
      .reduce((p, c) => (p ?? 0) + (c ?? 0), 0) ?? -1
  )
}

/**
 * @public
 */
export async function createState<T extends Status> (
  client: TxOperations,
  _class: Ref<Class<T>>,
  data: Data<T>
): Promise<Ref<T>> {
  const query: DocumentQuery<Status> = { name: data.name, ofAttribute: data.ofAttribute }
  if (data.category !== undefined) {
    query.category = data.category
  }
  const exists = await client.findOne(_class, query)
  if (exists !== undefined) {
    return exists._id as Ref<T>
  }
  const res = await client.createDoc(_class, task.space.Statuses, data)
  return res
}

/**
 * @public
 */
export function calculateStatuses (
  projectType: { statuses: ProjectType['statuses'], tasks: ProjectType['tasks'] },
  taskTypes: Map<Ref<TaskType>, Data<TaskType>>,
  override: Array<{ taskTypeId: Ref<TaskType>, statuses: Array<Ref<Status>> }>
): ProjectStatus[] {
  const stIds = new Map(projectType.statuses.map((p) => [p._id, p]))
  const processed = new Set<string>()
  const result: ProjectStatus[] = []

  for (const tt of projectType.tasks) {
    const statusesList = override.find((it) => it.taskTypeId === tt)?.statuses ?? taskTypes.get(tt)?.statuses ?? []
    for (const tts of statusesList) {
      const prjStatus = stIds.get(tts)
      const key = `${tts}:${tt}`
      if (!processed.has(key)) {
        processed.add(key)
        result.push({ ...(prjStatus ?? {}), _id: tts, taskType: tt })
      }
    }
  }
  return result
}

/**
 * @public
 */
export function findStatusAttr (h: Hierarchy, _class: Ref<Class<Task>>): AnyAttribute {
  const attrs = h.getAllAttributes(_class)
  for (const it of attrs.values()) {
    if (it.type._class === core.class.RefTo && h.isDerived((it.type as RefTo<any>).to, core.class.Status)) {
      return it
    }
  }
  return h.getAttribute(task.class.Task, 'status')
}

export type TaskTypeWithFactory = Omit<Data<TaskType>, 'statuses' | 'parent' | 'targetClass'> & {
  _id: TaskType['_id']
  factory: Data<Status>[]
} & Partial<Pick<TaskType, 'targetClass'>>

type ProjectData = Omit<Data<ProjectType>, 'statuses' | 'private' | 'members' | 'archived' | 'targetClass'>

async function createStates (
  client: TxOperations,
  states: Data<Status>[],
  stateClass: Ref<Class<Status>>
): Promise<Ref<Status>[]> {
  const statuses: Ref<Status>[] = []
  for (const st of states) {
    statuses.push(await createState(client, stateClass, st))
  }
  return statuses
}

/**
 * @public
 */
export async function createProjectType (
  client: TxOperations,
  data: ProjectData,
  tasks: TaskTypeWithFactory[],
  _id: Ref<ProjectType>
): Promise<Ref<ProjectType>> {
  const current = await client.findOne(task.class.ProjectType, { _id })
  if (current !== undefined) {
    return current._id
  }

  const _tasks: Ref<TaskType>[] = []
  const tasksData = new Map<Ref<TaskType>, Data<TaskType>>()
  const _statues = new Set<Ref<Status>>()

  const categoryObj = client.getModel().findObject(data.descriptor)
  if (categoryObj === undefined) {
    throw new Error('category is not found in model')
  }

  await createTaskTypes(tasks, _id, client, _statues, tasksData, _tasks, false)

  const baseClassClass = client.getHierarchy().getClass(categoryObj.baseClass)

  const targetProjectClassId: Ref<Class<Doc>> = generateId()

  await client.createDoc(
    core.class.Mixin,
    core.space.Model,
    {
      extends: categoryObj.baseClass,
      kind: ClassifierKind.MIXIN,
      label: getEmbeddedLabel(data.name),
      icon: baseClassClass.icon
    },
    targetProjectClassId,
    undefined,
    core.account.ConfigUser
  )

  await client.createMixin(targetProjectClassId, core.class.Mixin, core.space.Model, task.mixin.ProjectTypeClass, {
    projectType: _id
  })

  const tmpl = await client.createDoc(
    task.class.ProjectType,
    core.space.Model,
    {
      description: data.description,
      shortDescription: data.shortDescription,
      descriptor: data.descriptor,
      tasks: _tasks,
      name: data.name,
      private: false,
      members: [],
      archived: false,
      statuses: calculateStatuses({ tasks: _tasks, statuses: [] }, tasksData, []),
      targetClass: targetProjectClassId,
      classic: data.classic
    },
    _id
  )

  return tmpl
}

/**
 * @public
 */
export async function updateProjectType (
  client: TxOperations,
  projectType: Ref<ProjectType>,
  tasks: TaskTypeWithFactory[]
): Promise<void> {
  const current = await client.findOne(task.class.ProjectType, { _id: projectType })
  if (current === undefined) {
    throw new PlatformError(unknownStatus('No project type found'))
  }

  const _tasks: Ref<TaskType>[] = [...current.tasks]
  const tasksData = new Map<Ref<TaskType>, Data<TaskType>>()
  const _statues = new Set<Ref<Status>>()

  const hasUpdates = await createTaskTypes(tasks, projectType, client, _statues, tasksData, _tasks, true)

  if (hasUpdates) {
    const ttypes = await client.findAll<TaskType>(task.class.TaskType, { _id: { $in: _tasks } })
    const newStatuses = calculateStatuses(
      {
        statuses: current.statuses,
        tasks: _tasks
      },
      new Map(ttypes.map((it) => [it._id, it])),
      []
    )
    await client.update(current, {
      tasks: _tasks,
      statuses: newStatuses
    })
  }
}

async function createTaskTypes (
  tasks: TaskTypeWithFactory[],
  _id: Ref<ProjectType>,
  client: TxOperations,
  _statues: Set<Ref<Status>>,
  tasksData: Map<Ref<TaskType>, Data<TaskType>>,
  _tasks: Ref<TaskType>[],
  skipExisting: boolean
): Promise<boolean> {
  const existingTaskTypes = await client.findAll(task.class.TaskType, { parent: _id })

  let hasUpdates = false
  for (const it of tasks) {
    const { factory, _id: taskId, ...data } = it

    if (skipExisting) {
      const existingOne = existingTaskTypes.find((tt) => tt.ofClass === data.ofClass)
      if (existingOne !== undefined) {
        // We have similar one, let's check categories
        continue
      }
    }
    hasUpdates = true

    const statuses = await createStates(client, factory, data.statusClass)
    for (const st of statuses) {
      _statues.add(st)
    }
    const tdata = {
      ...data,
      parent: _id,
      statuses
    }

    const ofClassClass = client.getHierarchy().getClass(data.ofClass)

    tdata.icon = ofClassClass.icon

    if (tdata.targetClass === undefined) {
      // Create target class for custom field.
      const targetClassId: Ref<Class<Task>> = generateId()
      tdata.targetClass = targetClassId

      await client.createDoc(
        core.class.Mixin,
        core.space.Model,
        {
          extends: data.ofClass,
          kind: ClassifierKind.MIXIN,
          label: ofClassClass.label,
          icon: ofClassClass.icon
        },
        targetClassId
      )

      await client.createMixin(targetClassId, core.class.Mixin, core.space.Model, task.mixin.TaskTypeClass, {
        taskType: taskId,
        projectType: _id
      })
    }
    await client.createDoc(task.class.TaskType, _id, tdata as Data<TaskType>, taskId)
    tasksData.set(taskId, tdata as Data<TaskType>)
    _tasks.push(taskId)
  }
  return hasUpdates
}
