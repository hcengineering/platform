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

import type { Doc, Ref, Space } from '@hcengineering/core'
import type { ToDo } from '@hcengineering/time'
import { filterArchivedToDos, filterArchivedWorkSlots } from '../archived'

describe('filterArchivedToDos', () => {
  const active = 'active' as Ref<Space>
  const archived = 'archived' as Ref<Space>

  const todos = [
    { title: 'no project', attachedSpace: undefined },
    { title: 'active project', attachedSpace: active },
    { title: 'archived project', attachedSpace: archived }
  ]

  it('removes ToDos attached to an archived space', () => {
    expect(filterArchivedToDos(todos, new Set([archived])).map((it) => it.title)).toEqual([
      'no project',
      'active project'
    ])
  })

  it('keeps ToDos without an attached space', () => {
    const res = filterArchivedToDos(todos, new Set([archived, active]))
    expect(res.map((it) => it.title)).toEqual(['no project'])
  })

  it('returns all ToDos when nothing is archived', () => {
    expect(filterArchivedToDos(todos, new Set())).toBe(todos)
  })
})

describe('filterArchivedWorkSlots', () => {
  const hidden = 'hidden' as Ref<ToDo>
  const visible = 'visible' as Ref<ToDo>

  const events = [
    { title: 'hidden slot', attachedTo: hidden as Ref<Doc> },
    { title: 'visible slot', attachedTo: visible as Ref<Doc> },
    { title: 'calendar event', attachedTo: 'calendar' as Ref<Doc> }
  ]

  it('removes work slots of hidden ToDos', () => {
    expect(filterArchivedWorkSlots(events, new Set([hidden])).map((it) => it.title)).toEqual([
      'visible slot',
      'calendar event'
    ])
  })

  it('returns all events when no ToDo is hidden', () => {
    expect(filterArchivedWorkSlots(events, new Set())).toBe(events)
  })
})
