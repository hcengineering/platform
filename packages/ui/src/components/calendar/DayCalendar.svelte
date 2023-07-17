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
  import { Timestamp } from '@hcengineering/core'
  import { createEventDispatcher, onMount } from 'svelte'
  import { resizeObserver, deviceOptionsStore as deviceInfo, Scroller } from '../..'
  import {
    MILLISECONDS_IN_DAY,
    addZero,
    day as getDay,
    getMonday,
    getWeekDayName,
    areDatesEqual
  } from './internal/DateUtils'
  import { CalendarItem } from '../../types'

  export let events: CalendarItem[]
  export let mondayStart = true
  export let selectedDate: Date = new Date()
  export let currentDate: Date = selectedDate
  export let displayedDaysCount = 7
  export let displayedHours = 24
  export let startFromWeekStart = true
  export let weekFormat: 'narrow' | 'short' | 'long' | undefined = displayedDaysCount > 4 ? 'short' : 'long'
  // export let startHour = 0

  const dispatch = createEventDispatcher()

  const todayDate = new Date()

  $: fontSize = $deviceInfo.fontSize
  $: weekMonday = startFromWeekStart
    ? getMonday(currentDate, mondayStart)
    : new Date(new Date(currentDate).setHours(0, 0, 0, 0))

  interface CalendarCell {
    id: number
    start: number
    end: number
    day: number
    element?: HTMLDivElement
  }
  interface CalendarElement {
    id: string
    date: Timestamp
    dueDate: Timestamp
    cols: number
  }
  interface CalendarRow {
    elements: CalendarElement[]
  }
  interface CalendarGrid {
    columns: CalendarRow[]
  }

  const cells: CalendarCell[] = Array<CalendarCell>(displayedHours * 2 * displayedDaysCount)
  let container: HTMLElement
  let scroller: HTMLElement
  let calendarWidth: number = 0
  let calendarRect: DOMRect
  let colWidth: number = 0

  for (let hourOfDay = 0; hourOfDay < displayedHours; hourOfDay++) {
    for (let line = 1; line >= 0; line--) {
      for (let dayOfWeek = 0; dayOfWeek < displayedDaysCount; dayOfWeek++) {
        const cell = line
          ? hourOfDay * 2 + displayedHours * 2 * dayOfWeek
          : hourOfDay * 2 + displayedHours * 2 * dayOfWeek + 1
        cells[cell] = {
          id: cell,
          start: line ? hourOfDay * 100 : hourOfDay * 100 + 30,
          end: line ? hourOfDay * 100 + 30 : (hourOfDay + 1) * 100,
          day: dayOfWeek
        }
      }
    }
  }
  let newEvents = events
  let grid: CalendarGrid[] = Array<CalendarGrid>(displayedDaysCount)
  $: if (newEvents !== events) {
    grid = new Array<CalendarGrid>(displayedDaysCount)
    newEvents = events
  }
  $: newEvents
    .filter((ev) => !ev.allDay)
    .forEach((event, i, arr) => {
      if (grid[event.day] === undefined) {
        grid[event.day] = {
          columns: [{ elements: [{ id: event.eventId, date: event.date, dueDate: event.dueDate, cols: 1 }] }]
        }
      } else {
        const index = grid[event.day].columns.findIndex(
          (col) => col.elements[col.elements.length - 1].dueDate <= event.date
        )
        if (index === -1) {
          const intersects = grid[event.day].columns.filter((col) =>
            checkIntersect(col.elements[col.elements.length - 1], event)
          )
          const size = intersects.length + 1
          grid[event.day].columns.forEach((col) => {
            if (checkIntersect(col.elements[col.elements.length - 1], event)) {
              col.elements[col.elements.length - 1].cols = size
            }
          })
          grid[event.day].columns.push({
            elements: [{ id: event.eventId, date: event.date, dueDate: event.dueDate, cols: size }]
          })
        } else {
          const intersects = grid[event.day].columns.filter((col) =>
            checkIntersect(col.elements[col.elements.length - 1], event)
          )
          let maxCols = 1
          intersects.forEach((col) => {
            if (col.elements[col.elements.length - 1].cols > maxCols) {
              maxCols = col.elements[col.elements.length - 1].cols
            }
          })
          if (intersects.length >= maxCols) maxCols = intersects.length + 1
          grid[event.day].columns.forEach((col) => {
            if (checkIntersect(col.elements[col.elements.length - 1], event)) {
              col.elements[col.elements.length - 1].cols = maxCols
            }
          })
          grid[event.day].columns[index].elements.push({
            id: event.eventId,
            date: event.date,
            dueDate: event.dueDate,
            cols: maxCols
          })
        }
      }
      if (i === arr.length - 1) checkGrid()
    })
  const checkGrid = () => {
    for (let i = 0; i < displayedDaysCount; i++) {
      if (grid[i] === null || typeof grid[i] !== 'object' || grid[i].columns.length === 0) continue
      for (let j = 0; j < grid[i].columns.length - 1; j++) {
        grid[i].columns[j].elements.forEach((el) => {
          grid[i].columns[j + 1].elements.forEach((nextEl) => {
            if (checkIntersect(el, nextEl)) {
              if (el.cols > nextEl.cols) nextEl.cols = el.cols
              else el.cols = nextEl.cols
            }
          })
        })
      }
    }
  }

  const checkSizes = (element: HTMLElement | Element) => {
    calendarRect = element.getBoundingClientRect()
    calendarWidth = calendarRect.width
    colWidth = (calendarWidth - 3.5 * fontSize) / displayedDaysCount
  }
  const getCellByTime = (time: number, day: number, end: boolean = false): CalendarCell | undefined => {
    return end
      ? cells.filter((cell) => cell.start < time && time <= cell.end && cell.day === day)[0]
      : cells.filter((cell) => cell.start <= time && time < cell.end && cell.day === day)[0]
  }
  const calcTimeOffset = (
    date: Timestamp | Date,
    rect: DOMRect,
    needCorrect: boolean,
    end: boolean = false
  ): number => {
    const mins = new Date(date).getMinutes()
    if (mins === 0 || mins === 30) return end ? 2 : 1
    else if (mins < 30) {
      const res = end ? ((30 - mins) / 30) * rect.height : (mins / 30) * rect.height
      return needCorrect ? res + 1 : res
    } else {
      const res = end ? ((60 - mins) / 30) * rect.height : ((mins - 30) / 30) * rect.height
      return needCorrect ? res + 1 : res
    }
  }
  const checkIntersect = (date1: CalendarItem | CalendarElement, date2: CalendarItem | CalendarElement): boolean => {
    return (
      (date2.date <= date1.date && date2.dueDate > date1.date) ||
      (date2.date >= date1.date && date2.date < date1.dueDate)
    )
  }
  const convertToTime = (date: Timestamp | Date): number => {
    const temp = new Date(date)
    return temp.getHours() * 100 + temp.getMinutes()
  }

  const getRect = (event: CalendarItem): { top: number; bottom: number; left: number; right: number } => {
    const result = { top: 0, bottom: 0, left: 0, right: 0, width: 0 }
    const checkDate = new Date(currentDate.getTime() + MILLISECONDS_IN_DAY * event.day)
    const startDay = checkDate.setHours(0, 0, 0)
    const endDay = checkDate.setHours(displayedHours - 1, 59, 59)
    const startTime = event.date < startDay ? 0 : convertToTime(event.date)
    const endTime = event.dueDate > endDay ? displayedHours * 100 : convertToTime(event.dueDate)
    const startCell = getCellByTime(startTime, event.day)
    const endCell = getCellByTime(endTime, event.day, true)

    const scrollOffset = scroller?.scrollTop ?? 0
    if (startCell?.element && endCell?.element) {
      const rectStart = startCell.element.getBoundingClientRect()
      const rectEnd = startCell.id === endCell.id ? rectStart : endCell.element.getBoundingClientRect()
      const startTimeOffset = calcTimeOffset(event.date, rectStart, startCell.id !== endCell.id)
      const endTimeOffset = calcTimeOffset(event.dueDate, rectEnd, startCell.id !== endCell.id, true)
      result.top = rectStart.top - calendarRect.top + startTimeOffset + scrollOffset
      result.bottom = calendarRect.bottom - rectEnd.bottom + endTimeOffset - scrollOffset

      let cols = 1
      let index: number = 0
      grid[event.day].columns.forEach((col, i) =>
        col.elements.forEach((el) => {
          if (el.id === event.eventId) {
            cols = el.cols
            index = i
          }
        })
      )
      const elWidth = (rectStart.width - 0.25 * fontSize - (cols - 1) * 0.125 * fontSize) / cols
      result.width = elWidth
      result.left = rectStart.left - calendarRect.left + 0.125 * fontSize + index * elWidth + index * 0.125 * fontSize
      result.right =
        calendarRect.right -
        rectEnd.right +
        0.125 * fontSize +
        (cols - index - 1) * elWidth +
        (cols - index - 1) * 0.125 * fontSize
    }
    return result
  }

  onMount(() => {
    if (container) checkSizes(container)
  })
</script>

<Scroller bind:divScroll={scroller} fade={{ multipler: { top: 5.75, bottom: 0 } }}>
  <div
    bind:this={container}
    class="calendar-container"
    style:grid={`[header] 3.5rem [all-day] 2.25rem repeat(${
      displayedHours * 2
    }, [row-start] 2rem) / [time-col] 3.5rem repeat(${displayedDaysCount}, [col-start] 1fr)`}
    use:resizeObserver={(element) => checkSizes(element)}
  >
    <div class="sticky-header head center"><span class="zone">CEST</span></div>
    {#each [...Array(displayedDaysCount).keys()] as dayOfWeek}
      {@const day = getDay(weekMonday, dayOfWeek)}
      <div class="sticky-header head title" class:center={displayedDaysCount > 1}>
        <span class="day" class:today={areDatesEqual(todayDate, day)}>{day.getDate()}</span>
        <span class="weekday">{getWeekDayName(day, weekFormat)}</span>
      </div>
    {/each}

    <div class="sticky-header center text-sm content-dark-color">All day</div>
    {#each [...Array(displayedDaysCount).keys()] as dayOfWeek}
      {@const day = getDay(weekMonday, dayOfWeek)}
      {@const alldays = events.filter((ev) => ev.allDay && ev.day === dayOfWeek)}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div
        class="sticky-header"
        class:allday-container={alldays.length > 0}
        style:width={`${colWidth}px`}
        style:grid-template-columns={`repeat(${alldays.length}, minmax(0, 1fr))`}
        on:click|stopPropagation={() =>
          dispatch('create', { day, hour: -1, halfHour: false, date: new Date(day.setHours(0, 0, 0, 0)) })}
      >
        {#each alldays as ad}
          <div class="allday-event">
            <slot name="allday" id={ad.eventId} />
          </div>
        {/each}
      </div>
    {/each}

    {#each [...Array(displayedHours).keys()] as hourOfDay}
      {#each [...Array(2).keys()] as half}
        {#if hourOfDay === 0 && half === 0}
          <div class="clear-cell" />
        {:else if hourOfDay < displayedHours - 1 && half}
          <div class="time-cell" style:grid-row={`row-start ${hourOfDay * 2 + 2} / row-start ${hourOfDay * 2 + 4}`}>
            {addZero(hourOfDay + 1)}:00
          </div>
        {:else if half}
          <div class="clear-cell" />
        {/if}
        {#each [...Array(displayedDaysCount).keys()] as dayOfWeek}
          {@const day = getDay(weekMonday, dayOfWeek)}
          {@const cell = hourOfDay * 2 + displayedHours * 2 * dayOfWeek + half}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <div
            bind:this={cells[cell].element}
            class="empty-cell {half === 0 ? 'first-half' : 'second-half'}"
            style:grid-column={`col-start ${dayOfWeek + 1} / ${dayOfWeek + 2}`}
            on:click|stopPropagation={() => {
              dispatch('create', {
                day,
                hour: hourOfDay,
                halfHour: half === 1,
                date: new Date(day.setHours(hourOfDay, half * 30, 0, 0))
              })
            }}
          />
        {/each}
      {/each}
    {/each}

    {#key calendarWidth}
      {#each events.filter((ev) => !ev.allDay) as event, i}
        {@const rect = getRect(event)}
        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
        <div
          class="calendar-element"
          style:top={`${rect.top}px`}
          style:bottom={`${rect.bottom}px`}
          style:left={`${rect.left}px`}
          style:right={`${rect.right}px`}
          tabindex={1000 + i}
        >
          <slot name="event" id={event.eventId} />
        </div>
      {/each}
    {/key}
  </div>
</Scroller>

<style lang="scss">
  .first-half,
  .second-half {
    border-left: 1px solid var(--theme-divider-color);
  }
  .second-half {
    border-bottom: 1px solid var(--theme-divider-color);
  }
  .empty-cell {
  }
  .clear-cell {
  }
  .time-cell {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    font-size: 0.75rem;
    color: var(--theme-dark-color);
  }
  .calendar-element {
    position: absolute;
    border-radius: 0.25rem;
  }
  .sticky-header {
    position: sticky;
    background-color: var(--theme-comp-header-color);
    z-index: 10;

    &.head {
      top: 0;
    }
    &:not(.head) {
      top: 3.5rem;
      border-top: 1px solid var(--theme-divider-color);
      border-bottom: 1px solid var(--theme-divider-color);
    }
    &.center {
      justify-content: center;
    }
    &.title {
      font-size: 1.125rem;
      color: var(--theme-caption-color);

      &.center {
        justify-content: center;
      }
      &:not(.center) {
        padding-left: 1.375rem;
      }

      .day.today {
        padding: 0.375rem;
        color: var(--accented-button-color);
        background-color: #3871e0;
        border-radius: 0.375rem;
      }
      .weekday {
        margin-left: 0.25rem;
        opacity: 0.4;

        &::first-letter {
          text-transform: uppercase;
        }
      }
    }
    &:not(.allday-container) {
      display: flex;
      align-items: center;
    }
    &.allday-container {
      display: inline-grid;
      justify-items: stretch;
      gap: 0.125rem;
      padding: 0.125rem;
      max-width: 100%;

      .allday-event {
        background-color: red;
        border-radius: 0.25rem;
      }
    }

    .zone {
      padding: 0.375rem;
      font-size: 0.625rem;
      color: var(--theme-dark-color);
      background-color: rgba(64, 109, 223, 0.1);
      border-radius: 0.25rem;
    }
  }
  .calendar-container {
    will-change: transform;
    position: relative;
    display: grid;
  }
</style>
