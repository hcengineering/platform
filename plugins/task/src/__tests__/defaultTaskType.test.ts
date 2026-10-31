//
// Copyright © 2026 Hardcore Engineering Inc.
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

import core, { type AnyAttribute, type Class, type Ref, type Status, type StatusCategory } from '@hcengineering/core'
import { type ProjectType, type Task, type TaskType, type TaskTypeDescriptor } from '..'
import { makeDefaultTaskType, makeTaskTypeFromTemplate } from '../utils'

describe('makeTaskTypeFromTemplate', () => {
  const unstarted = 'cat-unstarted' as Ref<StatusCategory>
  const todo = 'cat-todo' as Ref<StatusCategory>
  const active = 'cat-active' as Ref<StatusCategory>
  const won = 'cat-won' as Ref<StatusCategory>
  const status = (_id: string, name: string, category: Ref<StatusCategory>, color: number): Status =>
    ({ _id, name, category, color, ofAttribute: 'issue-status' }) as unknown as Status
  const statuses = [
    status('backlog', 'Backlog', unstarted, 1),
    status('todo', 'Todo', todo, 2),
    status('progress', 'In Progress', active, 3),
    status('done', 'Done', won, 4)
  ]
  const template = {
    _id: 'issue' as Ref<TaskType>,
    parent: 'classic' as Ref<ProjectType>,
    descriptor: 'descr' as Ref<TaskTypeDescriptor>,
    name: 'Issue',
    kind: 'both',
    allowedAsChildOf: ['issue' as Ref<TaskType>],
    ofClass: 'issue-class' as Ref<Class<Task>>,
    targetClass: 'issue-mixin' as Ref<Class<Task>>,
    statuses: ['backlog', 'todo', 'progress', 'done'] as Array<Ref<Status>>,
    statusClass: 'issue-status-class' as Ref<Class<Status>>,
    statusCategories: [unstarted, todo, active, won]
  } as unknown as TaskType
  const newId = 'new' as Ref<TaskType>

  it('copies the template shape and statuses', () => {
    const res = makeTaskTypeFromTemplate(newId, template, [...statuses].reverse())

    expect(res._id).toBe(newId)
    expect(res.name).toBe('Issue')
    expect(res.descriptor).toBe('descr')
    expect(res.ofClass).toBe('issue-class')
    expect(res.kind).toBe('both')
    expect(res.allowedAsChildOf).toEqual([newId])
    expect(res.statusClass).toBe('issue-status-class')
    expect(res.targetClass).toBeUndefined()
    expect(res.statusCategories).toEqual([unstarted, todo, active, won])
    expect(res.factory).toEqual([
      { name: 'Backlog', ofAttribute: 'issue-status', category: unstarted, color: 1 },
      { name: 'Todo', ofAttribute: 'issue-status', category: todo, color: 2 },
      { name: 'In Progress', ofAttribute: 'issue-status', category: active, color: 3 },
      { name: 'Done', ofAttribute: 'issue-status', category: won, color: 4 }
    ])
  })

  it('limits statuses to the given categories', () => {
    const res = makeTaskTypeFromTemplate(newId, template, statuses, [unstarted, active, won])

    expect(res.statusCategories).toEqual([unstarted, active, won])
    expect(res.factory.map((it) => it.name)).toEqual(['Backlog', 'In Progress', 'Done'])
  })

  it('keeps the template kind and does not allow itself as child if the template does not', () => {
    const res = makeTaskTypeFromTemplate(newId, { ...template, kind: 'task', allowedAsChildOf: [] }, statuses)

    expect(res.kind).toBe('task')
    expect(res.allowedAsChildOf).toEqual([])
  })
})

describe('makeDefaultTaskType', () => {
  const taskTypeId = 'tt1' as Ref<TaskType>
  const descriptor = {
    _id: 'descr' as Ref<TaskTypeDescriptor>,
    baseClass: 'issue' as Ref<Class<Task>>
  }
  const categories = [
    { _id: 'cat-backlog' as Ref<StatusCategory>, defaultStatusName: 'Backlog' },
    { _id: 'cat-active' as Ref<StatusCategory>, defaultStatusName: 'New state' },
    { _id: 'cat-won' as Ref<StatusCategory>, defaultStatusName: 'Won' }
  ]

  it('creates a usable task type with one status per category', () => {
    const statusAttr = {
      _id: 'issue-status',
      type: { _class: core.class.RefTo, to: 'issue-status-class' as Ref<Class<Status>> }
    } as unknown as AnyAttribute

    const res = makeDefaultTaskType(taskTypeId, 'Issue', descriptor, statusAttr, categories)

    expect(res._id).toBe(taskTypeId)
    expect(res.name).toBe('Issue')
    expect(res.descriptor).toBe(descriptor._id)
    expect(res.ofClass).toBe(descriptor.baseClass)
    expect(res.kind).toBe('task')
    expect(res.allowedAsChildOf).toEqual([])
    expect(res.statusClass).toBe('issue-status-class')
    expect(res.targetClass).toBeUndefined()
    expect(res.statusCategories).toEqual(['cat-backlog', 'cat-active', 'cat-won'])
    expect(res.factory).toEqual([
      { name: 'Backlog', ofAttribute: 'issue-status', category: 'cat-backlog' },
      { name: 'New state', ofAttribute: 'issue-status', category: 'cat-active' },
      { name: 'Won', ofAttribute: 'issue-status', category: 'cat-won' }
    ])
  })

  it('falls back to the base status class', () => {
    const statusAttr = { _id: 'status', type: { _class: 'other' } } as unknown as AnyAttribute

    const res = makeDefaultTaskType(taskTypeId, 'Task', descriptor, statusAttr, [])

    expect(res.statusClass).toBe(core.class.Status)
    expect(res.statusCategories).toEqual([])
    expect(res.factory).toEqual([])
  })
})
