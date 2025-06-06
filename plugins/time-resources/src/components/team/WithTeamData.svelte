<!--
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
-->
<script lang="ts">
  import calendar, { Calendar, Event } from '@hcengineering/calendar'
  import { visibleCalendarStore, hidePrivateEvents, calendarByIdStore } from '@hcengineering/calendar-resources'
  import { Person } from '@hcengineering/contact'
  import { IdMap, Ref, toIdMap } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import task, { Project } from '@hcengineering/task'
  import time, { ToDo, WorkSlot } from '@hcengineering/time'

  export let space: Ref<Project>
  export let fromDate: number
  export let toDate: number
  export let project: Project | undefined
  export let slots: WorkSlot[] = []
  export let events: Event[] = []
  export let todos: IdMap<ToDo> = new Map()
  export let persons: Ref<Person>[] = []

  const client = getClient()

  const spaceQuery = createQuery()
  $: spaceQuery.query(task.class.Project, { _id: space }, (res) => {
    ;[project] = res
  })

  const query = createQuery()
  const queryR = createQuery()
  let raw: Event[] = []
  let rawEvent: Event[] = []
  let rawReq: Event[] = []

  let calendarIds: Ref<Calendar>[] = []

  $: query.query(
    calendar.class.Event,
    {
      _class: { $ne: calendar.class.ReccuringEvent },
      calendar: { $in: calendarIds },
      date: { $lte: toDate },
      dueDate: { $gte: fromDate },
      participants: { $in: persons } as any
    },
    (res) => {
      rawEvent = res
    }
  )

  $: queryR.query(
    calendar.class.ReccuringEvent,
    { calendar: { $in: calendarIds }, participants: { $in: persons } as any },
    (res) => {
      rawReq = res
    }
  )

  $: raw = rawEvent.concat(rawReq).filter((it, idx, arr) => arr.findIndex((e) => e.eventId === it.eventId) === idx)

  $: visible = hidePrivateEvents(raw, $calendarByIdStore, false)

  const todoQuery = createQuery()

  $: slots = visible.filter((it) => client.getHierarchy().isDerived(it._class, time.class.WorkSlot)) as WorkSlot[]
  $: events = visible.filter((it) => !client.getHierarchy().isDerived(it._class, time.class.WorkSlot))

  $: todoQuery.query(
    time.class.ToDo,
    {
      _id: { $in: slots.map((it) => it.attachedTo).filter((it, idx, arr) => arr.indexOf(it) === idx) }
    },
    (res) => {
      todos = toIdMap(res)
    }
  )

  $: calendarIds = $visibleCalendarStore.map((p) => p._id)
</script>
