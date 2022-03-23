<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { Event } from '@anticrm/calendar'
  import { Class, Doc, DocumentQuery, FindOptions, Ref, SortingOrder, Space } from '@anticrm/core'
  import { createQuery } from '@anticrm/presentation'
  import { Button, IconBack, IconForward, MonthCalendar, ScrollBox, YearCalendar } from '@anticrm/ui'
  import calendar from '../plugin'
  import Day from './Day.svelte'

  export let _class: Ref<Class<Doc>>
  export let space: Ref<Space> | undefined = undefined
  export let query: DocumentQuery<Event> = {}
  export let options: FindOptions<Event> | undefined = undefined
  export let baseMenuClass: Ref<Class<Event>> | undefined = undefined
  export let config: string[]
  export let search: string = ''

  const mondayStart = true

  // Current selected day
  let value: Date = new Date()

  const sortKey = 'modifiedOn'
  const sortOrder = SortingOrder.Descending

  let loading = false
  let resultQuery: DocumentQuery<Event>
  $: spaceOpt = (space ? { space } : {})
  $: resultQuery = search === '' ? { ...query, ...spaceOpt } : { ...query, $search: search, ...spaceOpt }

  let objects: Event[] = []

  const q = createQuery()

  async function update (
    _class: Ref<Class<Event>>,
    query: DocumentQuery<Event>,
    sortKey: string,
    sortOrder: SortingOrder,
    options?: FindOptions<Event>
  ) {
    loading = true
    q.query<Event>(
      _class,
      query,
      (result) => {
        objects = result
        loading = false
      },
      { sort: { [sortKey]: sortOrder }, ...options }
    )
  }
  $: update(_class, resultQuery, sortKey, sortOrder, options)

  function areDatesLess (firstDate: Date, secondDate: Date): boolean {
    return (
      firstDate.getFullYear() <= secondDate.getFullYear() &&
      firstDate.getMonth() <= secondDate.getMonth() &&
      firstDate.getDate() <= secondDate.getDate()
    )
  }

  function findEvents (events: Event[], date: Date): Event[] {
    return events.filter(
      (it) => areDatesLess(new Date(it.date), date) && areDatesLess(date, new Date(it.dueDate ?? it.date))
    )
  }

  interface ShiftType {
    yearShift: number
    monthShift: number
    dayShift: number
    weekShift: number
  }

  let shifts: ShiftType = {
    yearShift: 0,
    monthShift: 0,
    dayShift: 0,
    weekShift: 0
  }
  let date = new Date()
  function inc (val: number): void {
    if (val === 0) {
      shifts = {
        yearShift: 0,
        monthShift: 0,
        dayShift: 0,
        weekShift: 0
      }
      return
    }
    switch (mode) {
      case CalendarMode.Day: {
        shifts = { ...shifts, dayShift: val === 0 ? 0 : shifts.dayShift + val }
        break
      }
      case CalendarMode.Week: {
        shifts = { ...shifts, weekShift: val === 0 ? 0 : shifts.weekShift + val }
        break
      }
      case CalendarMode.Month: {
        shifts = { ...shifts, monthShift: val === 0 ? 0 : shifts.monthShift + val }
        break
      }
      case CalendarMode.Year: {
        shifts = { ...shifts, yearShift: val === 0 ? 0 : shifts.yearShift + val }
        break
      }
    }
  }
  function getMonthName (date: Date): string {
    const locale = new Intl.NumberFormat().resolvedOptions().locale
    return new Intl.DateTimeFormat(locale, {
      month: 'long'
    }).format(date)
  }

  function currentDate (date: Date, shifts: ShiftType): Date {
    const res = new Date(date)
    res.setMonth(date.getMonth() + shifts.monthShift)
    res.setFullYear(date.getFullYear() + shifts.yearShift)
    res.setDate(date.getDate() + shifts.dayShift + shifts.weekShift * 7)
    return res
  }

  enum CalendarMode {
    Day,
    Week,
    Month,
    Year
  }

  let mode: CalendarMode = CalendarMode.Year

  function label (date: Date, mode: CalendarMode): string {
    switch (mode) {
      case CalendarMode.Day: {
        return `${date.getDate()} ${getMonthName(date)} ${date.getFullYear()}`
      }
      case CalendarMode.Week: {
        return `${getMonthName(date)} ${date.getFullYear()}`
      }
      case CalendarMode.Month: {
        return `${getMonthName(date)} ${date.getFullYear()}`
      }
      case CalendarMode.Year: {
        return `${date.getFullYear()}`
      }
    }
  }
</script>

<div class="fs-title ml-2 mb-2 flex-row-center">
  {label(currentDate(date, shifts), mode)}
</div>

<div class="flex gap-2 mb-4">
  <!-- <Button
    size={'small'}
    label={calendar.string.ModeDay}
    on:click={() => {
      mode = CalendarMode.Day
    }}
  />
  <Button
    size={'small'}
    label={calendar.string.ModeWeek}
    on:click={() => {
      mode = CalendarMode.Week
    }}
  /> -->
  <Button
    size={'small'}
    label={calendar.string.ModeMonth}
    on:click={() => {
      date = value
      shifts = {
        dayShift: 0,
        monthShift: 0,
        weekShift: 0,
        yearShift: 0
      }
      mode = CalendarMode.Month
    }}
  />
  <Button
    size={'small'}
    label={calendar.string.ModeYear}
    on:click={() => {
      date = value
      shifts = {
        dayShift: 0,
        monthShift: 0,
        weekShift: 0,
        yearShift: 0
      }
      mode = CalendarMode.Year
    }}
  />
  <div class="flex ml-4 gap-1">
    <Button
      icon={IconBack}
      size={'small'}
      on:click={() => {
        inc(-1)
      }}
    />
    <Button
      size={'small'}
      label={calendar.string.Today}
      on:click={() => {
        inc(0)
      }}
    />
    <Button
      icon={IconForward}
      size={'small'}
      on:click={() => {
        inc(1)
      }}
    />
  </div>
</div>

{#if mode === CalendarMode.Year}
  <ScrollBox bothScroll>
    <YearCalendar {mondayStart} cellHeight={'2.5rem'} bind:value currentDate={currentDate(date, shifts)}>
      <svelte:fragment slot="cell" let:date>
        <Day
          events={findEvents(objects, date)}
          {date}
          {_class}
          {baseMenuClass}
          {options}
          {config}
          query={resultQuery}
        />
      </svelte:fragment>
    </YearCalendar>
  </ScrollBox>
{:else if mode === CalendarMode.Month}
  <div class="flex flex-grow">
    <MonthCalendar {mondayStart} cellHeight={'8.5rem'} bind:value currentDate={currentDate(date, shifts)}>
      <svelte:fragment slot="cell" let:date>
        <Day
          events={findEvents(objects, date)}
          {date}
          size={'huge'}
          {_class}
          {baseMenuClass}
          {options}
          {config}
          query={resultQuery}
        />
      </svelte:fragment>
    </MonthCalendar>
  </div>
{/if}
