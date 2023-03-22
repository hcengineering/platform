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
  import { Event } from '@hcengineering/calendar'
  import { Class, Doc, DocumentQuery, FindOptions, Ref, SortingOrder, Space } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import {
    AnyComponent,
    areDatesEqual,
    Button,
    IconBack,
    IconForward,
    MonthCalendar,
    Scroller,
    showPopup,
    WeekCalendar,
    YearCalendar
  } from '@hcengineering/ui'
  import { BuildModelKey } from '@hcengineering/view'
  import { CalendarMode } from '../index'
  import calendar from '../plugin'
  import Day from './Day.svelte'
  import Hour from './Hour.svelte'

  export let _class: Ref<Class<Doc>>
  export let space: Ref<Space> | undefined = undefined
  export let query: DocumentQuery<Event> = {}
  export let options: FindOptions<Event> | undefined = undefined
  export let baseMenuClass: Ref<Class<Event>> | undefined = undefined
  export let config: (string | BuildModelKey)[]
  export let createComponent: AnyComponent | undefined = undefined

  const mondayStart = true

  // Current selected day
  let currentDate: Date = new Date()
  let selectedDate: Date = new Date()

  let objects: Event[] = []

  const q = createQuery()

  async function update (_class: Ref<Class<Event>>, query: DocumentQuery<Event>, options?: FindOptions<Event>) {
    q.query<Event>(
      _class,
      query,
      (result) => {
        objects = result
      },
      { sort: { date: SortingOrder.Ascending }, ...options }
    )
  }
  $: update(_class, query, options)

  function areDatesLess (firstDate: Date, secondDate: Date): boolean {
    return (
      firstDate.getFullYear() <= secondDate.getFullYear() &&
      firstDate.getMonth() <= secondDate.getMonth() &&
      firstDate.getDate() <= secondDate.getDate()
    )
  }

  function findEvents (events: Event[], date: Date, minutes = false): Event[] {
    return events.filter((it) => {
      const d1 = new Date(it.date)
      const d2 = new Date(it.dueDate ?? it.date)
      const inDays = areDatesLess(d1, date) && areDatesLess(date, d2)

      if (minutes) {
        if (areDatesEqual(d1, date)) {
          return (
            (date.getTime() <= d1.getTime() && d1.getTime() < date.getTime() + 60 * 60 * 1000) ||
            (d1.getTime() <= date.getTime() && date.getTime() < d2.getTime())
          )
        }

        if (areDatesEqual(d2, date)) {
          return (
            (date.getTime() < d2.getTime() && d2.getTime() < date.getTime() + 60 * 60 * 1000) ||
            (d1.getTime() <= date.getTime() && date.getTime() < d2.getTime())
          )
        }

        // Somethere in middle
        return inDays
      }
      return inDays
    })
  }

  function inc (val: number): void {
    if (val === 0) {
      currentDate = new Date()
      return
    }
    switch (mode) {
      case CalendarMode.Day: {
        currentDate.setDate(currentDate.getDate() + val)
        break
      }
      case CalendarMode.Week: {
        currentDate.setDate(currentDate.getDate() + val * 7)
        break
      }
      case CalendarMode.Month: {
        currentDate.setMonth(currentDate.getMonth() + val)
        break
      }
      case CalendarMode.Year: {
        currentDate.setFullYear(currentDate.getFullYear() + val)
        break
      }
    }
    currentDate = currentDate
  }
  function getMonthName (date: Date): string {
    return new Intl.DateTimeFormat('default', {
      month: 'long'
    }).format(date)
  }
  function getWeekName (date: Date): string {
    const onejan = new Date(date.getFullYear(), 0, 1)
    const week = Math.ceil(((date.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7)

    return `W${week}`
  }

  let mode: CalendarMode = CalendarMode.Year

  function label (date: Date, mode: CalendarMode): string {
    switch (mode) {
      case CalendarMode.Day: {
        return `${date.getDate()} ${getMonthName(date)} ${date.getFullYear()}`
      }
      case CalendarMode.Week: {
        return `${getWeekName(date)} ${getMonthName(date)} ${date.getFullYear()}`
      }
      case CalendarMode.Month: {
        return `${getMonthName(date)} ${date.getFullYear()}`
      }
      case CalendarMode.Year: {
        return `${date.getFullYear()}`
      }
    }
  }

  function showCreateDialog (date: Date, withTime: boolean) {
    if (createComponent === undefined) {
      return
    }
    showPopup(createComponent, { date, withTime }, 'top')
  }

  let indexes = new Map<Ref<Event>, number>()
</script>

<div class="fs-title ml-10 mb-2 flex-row-center">
  {label(currentDate, mode)}
</div>

<div class="flex gap-2 mb-4 ml-10">
  <Button
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
  />
  <Button
    size={'small'}
    label={calendar.string.ModeMonth}
    on:click={() => {
      mode = CalendarMode.Month
    }}
  />
  <Button
    size={'small'}
    label={calendar.string.ModeYear}
    on:click={() => {
      mode = CalendarMode.Year
    }}
  />
  <div class="flex ml-4 gap-2">
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

<div class="ml-10 mr-6 h-full clear-mins">
  {#if mode === CalendarMode.Year}
    <Scroller>
      <YearCalendar
        {mondayStart}
        cellHeight={'2.5rem'}
        bind:selectedDate
        bind:currentDate
        on:change={(e) => {
          currentDate = e.detail
          if (areDatesEqual(selectedDate, currentDate)) {
            mode = CalendarMode.Month
          }
          selectedDate = e.detail
        }}
      >
        <svelte:fragment slot="cell" let:date let:today let:selected let:wrongMonth>
          <Day
            events={findEvents(objects, date)}
            {date}
            {_class}
            {baseMenuClass}
            {options}
            {config}
            {today}
            {selected}
            {wrongMonth}
            {query}
          />
        </svelte:fragment>
      </YearCalendar>
    </Scroller>
  {:else if mode === CalendarMode.Month}
    <div class="flex flex-grow">
      <MonthCalendar {mondayStart} cellHeight={'8.5rem'} bind:selectedDate bind:currentDate>
        <svelte:fragment slot="cell" let:date let:today let:selected let:wrongMonth>
          <Day
            events={findEvents(objects, date)}
            {date}
            size={'huge'}
            {_class}
            {baseMenuClass}
            {options}
            {config}
            {today}
            {selected}
            {wrongMonth}
            {query}
            on:select={(e) => {
              currentDate = e.detail
              if (areDatesEqual(selectedDate, currentDate)) {
                mode = CalendarMode.Day
              }
              selectedDate = e.detail
            }}
            on:create={(e) => {
              showCreateDialog(e.detail, false)
            }}
          />
        </svelte:fragment>
      </MonthCalendar>
    </div>
  {:else if mode === CalendarMode.Week}
    <Scroller>
      <WeekCalendar
        {mondayStart}
        cellHeight={'4.5rem'}
        bind:selectedDate
        bind:currentDate
        on:select={(e) => {
          currentDate = e.detail
          selectedDate = e.detail
          mode = CalendarMode.Day
        }}
      >
        <svelte:fragment slot="cell" let:date>
          <Hour
            events={findEvents(objects, date, true)}
            {date}
            bind:indexes
            on:create={(e) => {
              showCreateDialog(e.detail, true)
            }}
          />
        </svelte:fragment>
      </WeekCalendar>
    </Scroller>
  {:else if mode === CalendarMode.Day}
    <Scroller>
      <WeekCalendar
        {mondayStart}
        displayedDaysCount={1}
        startFromWeekStart={false}
        cellHeight={'4.5rem'}
        bind:selectedDate
        bind:currentDate
      >
        <svelte:fragment slot="cell" let:date>
          <Hour
            events={findEvents(objects, date, true)}
            {date}
            bind:indexes
            wide
            on:create={(e) => {
              showCreateDialog(e.detail, true)
            }}
          />
        </svelte:fragment>
      </WeekCalendar>
    </Scroller>
  {/if}
</div>
