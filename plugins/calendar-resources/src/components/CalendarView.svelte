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
  import { Calendar, Event, generateEventId, getAllEvents } from '@hcengineering/calendar'
  import { PersonAccount } from '@hcengineering/contact'
  import {
    Class,
    Doc,
    DocumentQuery,
    FindOptions,
    Ref,
    SortingOrder,
    Timestamp,
    getCurrentAccount
  } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { createQuery } from '@hcengineering/presentation'
  import {
    AnyComponent,
    Button,
    DropdownLabelsIntl,
    IconBack,
    IconForward,
    MonthCalendar,
    YearCalendar,
    areDatesEqual,
    getMonday,
    showPopup
  } from '@hcengineering/ui'
  import { CalendarMode, DayCalendar, calendarStore, hidePrivateEvents } from '../index'
  import calendar from '../plugin'
  import Day from './Day.svelte'

  export let _class: Ref<Class<Doc>> = calendar.class.Event
  export let query: DocumentQuery<Event> | undefined = undefined
  export let options: FindOptions<Event> | undefined = undefined
  export let createComponent: AnyComponent | undefined = calendar.component.CreateEvent
  export let dragItem: Doc | undefined = undefined
  export let dragEventClass: Ref<Class<Event>> = calendar.class.Event
  export let allowedModes: CalendarMode[] = [
    CalendarMode.Days,
    CalendarMode.Week,
    CalendarMode.Month,
    CalendarMode.Year
  ]

  const me = getCurrentAccount() as PersonAccount

  const mondayStart = true
  let mode: CalendarMode = allowedModes.includes(CalendarMode.Days) ? CalendarMode.Days : allowedModes[0]

  // Current selected day
  let currentDate: Date = new Date()
  let selectedDate: Date = new Date()

  let dayCalendar: DayCalendar
  let raw: Event[] = []
  let visible: Event[] = []
  let objects: Event[] = []

  function getFrom (date: Date, mode: CalendarMode): Timestamp {
    switch (mode) {
      case CalendarMode.Days: {
        return new Date(date).setHours(0, 0, 0, 0)
      }
      case CalendarMode.Day: {
        return new Date(date).setHours(0, 0, 0, 0)
      }
      case CalendarMode.Week: {
        return getMonday(date, mondayStart).setHours(0, 0, 0, 0)
      }
      case CalendarMode.Month: {
        return new Date(new Date(date).setDate(-7)).setHours(0, 0, 0, 0)
      }
      case CalendarMode.Year: {
        return new Date(new Date(date).setMonth(0, -7)).setHours(0, 0, 0, 0)
      }
    }
  }

  function getTo (date: Date, mode: CalendarMode): Timestamp {
    switch (mode) {
      case CalendarMode.Days: {
        return new Date(date).setDate(date.getDate() + 4)
      }
      case CalendarMode.Day: {
        return new Date(date).setDate(date.getDate() + 1)
      }
      case CalendarMode.Week: {
        const monday = getMonday(date, mondayStart)
        return new Date(monday.setDate(monday.getDate() + 7)).setHours(0, 0, 0, 0)
      }
      case CalendarMode.Month: {
        return new Date(new Date(date).setMonth(date.getMonth() + 1, 14)).setHours(0, 0, 0, 0)
      }
      case CalendarMode.Year: {
        return new Date(new Date(date).setMonth(12, 14)).setHours(0, 0, 0, 0)
      }
    }
  }

  $: from = getFrom(currentDate, mode)
  $: to = getTo(currentDate, mode)

  const calendarsQuery = createQuery()

  let calendars: Calendar[] = []

  calendarsQuery.query(calendar.class.Calendar, { members: me._id }, (res) => {
    calendars = res
  })

  const q = createQuery()

  async function update (
    _class: Ref<Class<Event>>,
    query: DocumentQuery<Event> | undefined,
    calendars: Calendar[],
    options?: FindOptions<Event>
  ) {
    q.query<Event>(
      _class,
      query ?? { space: { $in: calendars.map((p) => p._id) } },
      (result) => {
        raw = result
      },
      { sort: { date: SortingOrder.Ascending }, ...options }
    )
  }
  $: update(_class, query, calendars, options)
  $: visible = hidePrivateEvents(raw, $calendarStore)
  $: objects = getAllEvents(visible, from, to)

  function inRange (start: Date, end: Date, startPeriod: Date, period: 'day' | 'hour'): boolean {
    const endPeriod =
      period === 'day'
        ? new Date(startPeriod).setDate(startPeriod.getDate() + 1)
        : new Date(startPeriod).setHours(startPeriod.getHours() + 1)
    if (end.getTime() - 1 <= startPeriod.getTime()) return false
    if (start.getTime() >= endPeriod) return false

    return true
  }

  function findEvents (events: Event[], date: Date, minutes = false): Event[] {
    return events.filter((it) => {
      let d1 = new Date(it.date)
      let d2 = new Date(it.dueDate ?? it.date)
      if (it.allDay) {
        if (minutes) return false
        d1 = new Date(d1.getTime() + new Date().getTimezoneOffset() * 60 * 1000)
        d2 = new Date(d2.getTime() + new Date().getTimezoneOffset() * 60 * 1000)
        return inRange(d1, d2, date, minutes ? 'hour' : 'day')
      }
      return inRange(d1, d2, date, minutes ? 'hour' : 'day')
    })
  }

  function inc (val: number): void {
    if (val === 0) {
      currentDate = new Date()
      dayCalendar.scrollToTime(currentDate)
      return
    }
    switch (mode) {
      case CalendarMode.Days: {
        currentDate.setDate(currentDate.getDate() + val * 3)
        break
      }
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

  function showCreateDialog (date: Date, withTime: boolean) {
    if (createComponent === undefined) {
      return
    }
    showPopup(createComponent, { date, withTime }, 'top')
  }

  function getDdItem (mode: CalendarMode) {
    switch (mode) {
      case CalendarMode.Day:
        return { id: 'day', label: calendar.string.ModeDay, mode: CalendarMode.Day }
      case CalendarMode.Days:
        return { id: 'days', label: calendar.string.DueDays, mode: CalendarMode.Days, params: { days: 3 } }
      case CalendarMode.Week:
        return { id: 'week', label: calendar.string.ModeWeek, mode: CalendarMode.Week }
      case CalendarMode.Month:
        return { id: 'month', label: calendar.string.ModeMonth, mode: CalendarMode.Month }
      case CalendarMode.Year:
        return { id: 'year', label: calendar.string.ModeYear, mode: CalendarMode.Year }
    }
  }

  function getDdItems (allowedModes: CalendarMode[]): void {
    ddItems = []
    for (const mode of allowedModes) {
      ddItems.push(getDdItem(mode))
    }
    ddItems = ddItems
  }

  const dragItemId = 'drag_item' as Ref<Event>

  function dragEnter (e: CustomEvent<any>) {
    if (dragItem !== undefined) {
      const current = raw.find((p) => p._id === dragItemId)
      if (current !== undefined) {
        current.attachedTo = dragItem._id
        current.attachedToClass = dragItem._class
        current.date = e.detail.date.getTime()
        current.dueDate = new Date(e.detail.date).setMinutes(new Date(e.detail.date).getMinutes() + 30)
      } else {
        const me = getCurrentAccount() as PersonAccount
        const temp: Event = {
          _id: dragItemId,
          allDay: false,
          eventId: generateEventId(),
          title: '',
          description: '',
          access: 'owner',
          attachedTo: dragItem._id,
          attachedToClass: dragItem._class,
          _class: dragEventClass,
          collection: 'events',
          space: `${me._id}_calendar` as Ref<Calendar>,
          modifiedBy: me._id,
          participants: [me.person],
          modifiedOn: Date.now(),
          date: e.detail.date.getTime(),
          dueDate: new Date(e.detail.date).setMinutes(new Date(e.detail.date).getMinutes() + 30)
        }
        raw.push(temp)
      }
      raw = raw
    }
  }

  $: clear(dragItem)

  function clear (dragItem: Doc | undefined) {
    if (dragItem === undefined) {
      raw = raw.filter((p) => p._id !== dragItemId)
      visible = hidePrivateEvents(raw, $calendarStore)
      objects = getAllEvents(visible, from, to)
    }
  }

  $: getDdItems(allowedModes)

  let ddItems: {
    id: string | number
    label: IntlString
    mode: CalendarMode
    params?: Record<string, any>
  }[] = [
    { id: 'day', label: calendar.string.ModeDay, mode: CalendarMode.Day },
    { id: 'days', label: calendar.string.DueDays, mode: CalendarMode.Days, params: { days: 3 } },
    { id: 'week', label: calendar.string.ModeWeek, mode: CalendarMode.Week },
    { id: 'month', label: calendar.string.ModeMonth, mode: CalendarMode.Month },
    { id: 'year', label: calendar.string.ModeYear, mode: CalendarMode.Year }
  ]
</script>

<div class="calendar-header">
  <div class="title">
    {getMonthName(currentDate)}
    <span>{currentDate.getFullYear()}</span>
  </div>
  <div class="flex-row-center gap-2">
    {#if ddItems.length > 1}
      <DropdownLabelsIntl
        items={ddItems.map((it) => {
          return { id: it.id, label: it.label, params: it.params }
        })}
        size={'medium'}
        selected={ddItems.find((it) => it.mode === mode)?.id}
        on:selected={(e) => (mode = ddItems.find((it) => it.id === e.detail)?.mode ?? ddItems[0].mode)}
      />
    {/if}
    <Button
      label={calendar.string.Today}
      on:click={() => {
        inc(0)
      }}
    />
    <Button
      icon={IconBack}
      kind={'ghost'}
      on:click={() => {
        inc(-1)
      }}
    />
    <Button
      icon={IconForward}
      kind={'ghost'}
      on:click={() => {
        inc(1)
      }}
    />
  </div>
</div>

{#if mode === CalendarMode.Year}
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
      <Day events={findEvents(objects, date)} {date} {_class} {options} {today} {selected} {wrongMonth} {query} />
    </svelte:fragment>
  </YearCalendar>
{:else if mode === CalendarMode.Month}
  <MonthCalendar {mondayStart} cellHeight={'8.5rem'} bind:selectedDate bind:currentDate>
    <svelte:fragment slot="cell" let:date let:today let:selected let:wrongMonth>
      <Day
        events={findEvents(objects, date)}
        {date}
        size={'huge'}
        {_class}
        {options}
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
{:else if mode === CalendarMode.Week}
  <DayCalendar
    bind:this={dayCalendar}
    events={objects}
    {mondayStart}
    displayedDaysCount={7}
    startFromWeekStart
    bind:selectedDate
    bind:currentDate
    on:create={(e) => showCreateDialog(e.detail.date, e.detail.withTime)}
    on:drop
    on:dragenter={dragEnter}
  />
{:else if mode === CalendarMode.Day || mode === CalendarMode.Days}
  {#key mode}
    <DayCalendar
      bind:this={dayCalendar}
      events={objects}
      {mondayStart}
      displayedDaysCount={mode === CalendarMode.Days ? 3 : 1}
      startFromWeekStart={false}
      bind:selectedDate
      bind:currentDate
      on:create={(e) => showCreateDialog(e.detail.date, e.detail.withTime)}
      on:drop
      on:dragenter={dragEnter}
    />
  {/key}
{/if}

<!-- <div class="min-h-4 max-h-4 h-4 flex-no-shrink" /> -->
<style lang="scss">
  .calendar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1.75rem 0.75rem 2.25rem;
    min-width: 0;
    min-height: 0;

    .title {
      font-size: 1.25rem;
      color: var(--theme-caption-color);

      &::first-letter {
        text-transform: uppercase;
      }
      span {
        opacity: 0.4;
      }
    }
  }
</style>
