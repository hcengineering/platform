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
  import { Event, getAllEvents } from '@hcengineering/calendar'
  import { calendarByIdStore } from '@hcengineering/calendar-resources'
  import { getCurrentEmployee, Person } from '@hcengineering/contact'
  import { IdMap, Ref } from '@hcengineering/core'
  import { Project } from '@hcengineering/task'
  import { ToDo, WorkSlot } from '@hcengineering/time'
  import WithTeamData from '../WithTeamData.svelte'
  import { groupTeamData, toSlots } from '../utils'
  import EventElement from './EventElement.svelte'
  import PersonCalendar from './PersonCalendar.svelte'

  export let space: Ref<Project>
  export let currentDate: Date
  export let timeMode: '1hour' | '30mins' | '15mins'
  const maxDays = 1

  $: fromDate = new Date(currentDate).setDate(currentDate.getDate() - Math.round(maxDays / 2 + 1))
  $: toDate = new Date(currentDate).setDate(currentDate.getDate() + Math.round(maxDays / 2 + 1))
  const me = getCurrentEmployee()

  let project: Project | undefined
  let slots: WorkSlot[] = []
  let events: Event[] = []
  let todos: IdMap<ToDo> = new Map()
  let persons: Ref<Person>[] = []

  function calcHourWidth (events: Event[], totalWidth: number): number[] {
    const hours = new Map<number, number>()
    for (const e of events) {
      const h1 = new Date(e.date).getHours()
      const h2 = new Date(e.dueDate).getHours()
      for (let i = h1; i <= h2; i++) {
        hours.set(i, hours.get(i) ?? 0 + 1)
      }
    }
    const width: number[] = []
    for (let i = 0; i < 24; i++) {
      if (!hours.has(i)) {
        width.push(0)
      } else {
        width.push((totalWidth - 1) / hours.size)
      }
    }
    return width
  }
  const timeModes: Record<typeof timeMode, number> = {
    '15mins': 4,
    '1hour': 1,
    '30mins': 2
  }
  function calcTop (event: Event, prevEvent?: Event): number {
    if (prevEvent === undefined) {
      return 0
    }
    if (new Date(prevEvent.date).getMinutes() === new Date(event.date).getMinutes()) {
      return 0
    }
    if (prevEvent.dueDate <= event.date) {
      return 1
    }
    return 0
  }
</script>

<WithTeamData {space} {fromDate} {toDate} bind:project bind:todos bind:slots bind:events bind:persons />
<PersonCalendar
  {persons}
  startDate={currentDate}
  {maxDays}
  rowHeightRem={6.5}
  headerHeightRem={2}
  multipler={timeModes[timeMode]}
  highlightToday={false}
>
  <svelte:fragment slot="day-header" let:day let:width>
    {@const dayFrom = new Date(day).setHours(0, 0, 0, 0)}
    {@const dayTo = new Date(day).setHours(23, 59, 59, 999)}
    {@const totalSlots = toSlots(getAllEvents(slots, dayFrom, dayTo))}
    {@const totalEvents = getAllEvents(events, dayFrom, dayTo)}
    {@const hourWidths = calcHourWidth([...totalSlots, ...totalEvents], width)}
    <div class="flex-nowrap w-full p-1" style:display={'inline-flex'}>
      {#each Array.from(Array(25).keys()) as hour}
        {@const width = hourWidths[hour]}
        <div class="flex-row-center" style:width="{width}rem">
          {#if width > 0 || hour === 24}
            {#if timeMode === '30mins'}
              <span style:width="{width / 2}rem">{hour === 24 ? '00' : hour}:00</span>
              {#if hour !== 24}
                <span style:width="{width / 2}rem">{hour}:30</span>
              {/if}
            {:else if timeMode === '15mins'}
              <span style:width="{width / 4}rem">{hour === 24 ? '00' : hour}:00</span>
              {#if hour !== 24}
                <span style:width="{width / 4}rem">{hour}:15</span>
                <span style:width="{width / 4}rem">{hour}:30</span>
                <span style:width="{width / 4}rem">{hour}:45</span>
              {/if}
            {:else}
              {hour === 24 ? '00' : hour}:00
            {/if}
          {/if}
        </div>
      {/each}
    </div>
  </svelte:fragment>
  <svelte:fragment slot="day" let:day let:today let:weekend let:person let:height let:width>
    {@const dayFrom = new Date(day).setHours(0, 0, 0, 0)}
    {@const dayTo = new Date(day).setHours(23, 59, 59, 999)}
    {@const totalSlots = toSlots(getAllEvents(slots, dayFrom, dayTo))}
    {@const totalEvents = getAllEvents(events, dayFrom, dayTo)}
    {@const grouped = groupTeamData(totalSlots, todos, totalEvents, me, $calendarByIdStore)}
    {@const gitem = grouped.find((it) => it.user === person)}
    {@const hourWidths = calcHourWidth([...totalSlots, ...totalEvents], width)}
    {#if gitem}
      {@const slots = [
        ...Array.from(gitem.mappings.flatMap((it) => it.slots)),
        ...gitem.events,
        ...gitem.busyEvents,
        ...gitem.busy.slots
      ].sort((a, b) => a.date - b.date)}
      <div style:overflow-x={'hidden'} style:overflow-y={'auto'} style:height="{height}rem">
        <div class="flex flex-row-center">
          <div class="flex-nowrap p-1 w-full" style:display={'inline-flex'}>
            {#each Array.from(Array(24).keys()) as hour}
              {@const _slots = slots
                .filter((it) => new Date(it.date).getHours() === hour)
                .sort((a, b) => a.date - b.date)}
              {@const cwidth = hourWidths[hour]}
              <div class="flex-col" style:width="{cwidth}rem">
                {#each _slots as m, i}
                  <!-- <div class="flex-col mr-1"> -->
                  <!-- <TimePresenter value={m.dueDate - m.date} /> -->
                  <EventElement event={m} hour={cwidth} top={calcTop(m, _slots[i - 1])} />
                  <!-- </div> -->
                {/each}
              </div>
            {/each}
          </div>
        </div>
      </div>
    {/if}
  </svelte:fragment>
</PersonCalendar>
