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

import { type Calendar, type Event } from '@hcengineering/calendar'
import { isVisible } from '@hcengineering/calendar-resources'
import { type Contact, type Person } from '@hcengineering/contact'
import { type IdMap, type Ref } from '@hcengineering/core'
import { type ToDo, type WorkSlot } from '@hcengineering/time'
import { type EventPersonMapping } from '../../types'

export function isVisibleMe (value: Event, me: Ref<Contact>): boolean {
  if (value.participants.includes(me)) {
    return true
  }
  return false
}
function isVisibleAll (value: ToDo): boolean {
  if (value.visibility === 'public' || value.visibility === undefined) {
    return true
  }
  return false
}

/**
 * @public
 */
export function groupTeamData (
  items: WorkSlot[],
  todos: IdMap<ToDo>,
  events: Event[],
  mePerson: Ref<Person>,
  calendarStore: IdMap<Calendar>
): EventPersonMapping[] {
  const result = new Map<Ref<Person>, EventPersonMapping>()

  const totalEventsMap = new Map<Ref<Person>, EventVars[]>()
  for (const slot of items) {
    const todo = todos.get(slot.attachedTo)
    if (todo === undefined) {
      continue
    }
    const mapping: EventPersonMapping = result.get(todo.user) ?? {
      busy: {
        slots: [],
        total: 0,
        user: todo.user
      },
      mappings: [],
      user: todo.user,
      total: 0,
      events: [],
      busyTotal: 0,
      busyEvents: []
    }
    result.set(todo.user, mapping)

    const totalEvents = totalEventsMap.get(todo.user) ?? []
    const over = calcOverlap(totalEvents, slot)
    totalEvents.push(...over.events)
    totalEventsMap.set(todo.user, totalEvents)
    if (isVisibleAll(todo)) {
      let mm = mapping.mappings.find((it) => it.todo?._id === todo._id)
      if (mm === undefined) {
        mm = {
          todo,
          slots: [],
          user: todo.user,
          total: 0
        }
        mapping.mappings.push(mm)
      }
      mm.total += over.total
      mm.slots.push({ ...slot, overlap: slot.dueDate - slot.date - over.total })
    } else {
      mapping.busy.slots.push(slot)
      mapping.busy.total += over.total
    }
    mapping.total += over.total
  }

  for (const event of events) {
    const _calendar = calendarStore.get(event.calendar)
    if (_calendar === undefined || _calendar.hidden) {
      continue
    }
    for (const p of event.participants as Array<Ref<Person>>) {
      const mapping: EventPersonMapping = result.get(p) ?? {
        busy: {
          slots: [],
          total: 0,
          user: p
        },
        mappings: [],
        user: p,
        total: 0,
        events: [],
        busyTotal: 0,
        busyEvents: []
      }
      result.set(p, mapping)
      if (mapping.events.find((it) => it.eventId === event.eventId) === undefined) {
        const totalEvents = totalEventsMap.get(p) ?? []
        const over = calcOverlap(totalEvents, event)
        totalEvents.push(...over.events)
        totalEventsMap.set(p, totalEvents)

        if (isVisible(event, calendarStore) || isVisibleMe(event, mePerson)) {
          mapping.total += over.total
          mapping.events.push({ ...event, overlap: event.dueDate - event.date - over.total })
        } else {
          mapping.busyTotal += over.total
          mapping.busyEvents.push(event)
        }
      }
    }
  }
  return Array.from(result.values())
}

/**
 * @public
 */
export const toSlots = (events: Event[]): WorkSlot[] => events as WorkSlot[]

type EventVars = Pick<Event, 'date' | 'dueDate'>

/**
 * Inside:
 * A: ------------------
 * B: ....----------....
 *
 * Before:
 * A: ...------------------
 * B: vvv--------..........
 *
 * After:
 * A: -------------------...
 * B: ....---------------vvv
 *
 * Outside:
 * A: ...-------------------...
 * B: vvv-------------------vvv
 */
function crossWith (a: EventVars, b: EventVars): EventVars[] {
  const newTmp: EventVars[] = []
  // Before
  if (b.date <= a.date) {
    const n = { date: b.date, dueDate: Math.min(a.date, b.dueDate) }
    if (n.dueDate - n.date > 0) {
      newTmp.push(n)
    }
  }
  // After
  if (a.dueDate <= b.dueDate) {
    const n = { date: Math.max(a.dueDate, b.date), dueDate: b.dueDate }
    if (n.dueDate - n.date > 0) {
      newTmp.push(n)
    }
  }
  return newTmp
}

/**
 *
 * @param events - without overlaps
 * @param event -
 * @returns
 */
function calcOverlap (events: EventVars[], event: Event): { events: EventVars[], total: number } {
  let tmp: EventVars[] = [{ date: event.date, dueDate: event.dueDate }]
  for (const a of events) {
    const newTmp: EventVars[] = []
    for (const b of tmp) {
      newTmp.push(...crossWith(a, b))
    }
    tmp = newTmp
  }
  return { events: tmp, total: tmp.reduce((v, it) => v + (it.dueDate - it.date), 0) }
}
