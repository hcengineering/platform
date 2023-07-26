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
  import ui, {
    resizeObserver,
    deviceOptionsStore as deviceInfo,
    Scroller,
    Label,
    ActionIcon,
    IconUpOutline,
    IconDownOutline
  } from '../..'
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
  export let startHour = 0
  export let startFromWeekStart = true
  export let weekFormat: 'narrow' | 'short' | 'long' | undefined = displayedDaysCount > 4 ? 'short' : 'long'

  const dispatch = createEventDispatcher()

  const todayDate = new Date()
  const ampm = new Intl.DateTimeFormat([], { hour: 'numeric' }).resolvedOptions().hour12
  const getTimeFormat = (hour: number): string => {
    return ampm ? `${hour > 12 ? hour - 12 : hour}${hour < 12 ? 'am' : 'pm'}` : `${addZero(hour)}:00`
  }
  const rem = (n: number): number => n * fontSize

  $: fontSize = $deviceInfo.fontSize
  $: docHeight = $deviceInfo.docHeight
  $: cellHeight = 4 * fontSize
  $: weekMonday = startFromWeekStart
    ? getMonday(currentDate, mondayStart)
    : new Date(new Date(currentDate).setHours(0, 0, 0, 0))

  interface CalendarElement {
    id: string
    date: Timestamp
    dueDate: Timestamp
    cols: number
  }
  interface CalendarColumn {
    elements: CalendarElement[]
  }
  interface CalendarGrid {
    columns: CalendarColumn[]
  }
  interface CalendarADGrid {
    alldays: (string | null)[]
  }
  interface CalendarADRows {
    id: string
    row: number
    startCol: number
    endCol: number
  }

  let container: HTMLElement
  let scroller: HTMLElement
  let calendarWidth: number = 0
  let calendarRect: DOMRect
  let colWidth: number = 0
  let newEvents = events
  let grid: CalendarGrid[] = Array<CalendarGrid>(displayedDaysCount)
  let alldays: CalendarItem[] = []
  let alldaysGrid: CalendarADGrid[] = Array<CalendarADGrid>(displayedDaysCount)
  let adMaxRow: number = 1
  let adRows: CalendarADRows[]
  const cellBorder: number = 1
  const heightAD: number = 2
  const minAD: number = 2
  const maxAD: number = 3
  let minHeightAD: number = 0
  let maxHeightAD: number = 0
  let shownHeightAD: number = 0
  let shownAD: boolean = false
  let shortAlldays: { id: string; day: number }[] = []
  let moreCounts: number[] = Array<number>(displayedDaysCount)

  $: if (newEvents !== events) {
    grid = new Array<CalendarGrid>(displayedDaysCount)
    alldaysGrid = new Array<CalendarADGrid>(displayedDaysCount)
    newEvents = events
    alldays = []
    shortAlldays = []
    moreCounts = new Array<number>(displayedDaysCount)
    prepareAllDays()
    if (shownAD && adMaxRow <= maxAD) shownAD = false
  }
  $: minimizedAD = maxHeightAD === minHeightAD
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

  const addNullRow = () => {
    for (let i = 0; i < displayedDaysCount; i++) alldaysGrid[i].alldays.push(null)
    adMaxRow++
  }
  const prepareAllDays = () => {
    alldays = events.filter((ev) => ev.day === -1)
    adRows = []
    for (let i = 0; i < displayedDaysCount; i++) alldaysGrid[i] = { alldays: [null] }
    adMaxRow = 1
    alldays.forEach((event) => {
      const days = events
        .filter((ev) => ev.allDay && ev.day !== -1 && event.eventId === ev.eventId)
        .map((ev) => {
          return ev.day
        })
      let emptyRow = 0
      for (let checkRow = 0; checkRow < adMaxRow; checkRow++) {
        const empty = days.every((day) => alldaysGrid[day].alldays[checkRow] === null)
        if (empty) {
          emptyRow = checkRow
          break
        } else if (checkRow === adMaxRow - 1) {
          emptyRow = adMaxRow
          addNullRow()
          break
        }
      }
      adRows.push({ id: event.eventId, row: emptyRow, startCol: days[0], endCol: days[days.length - 1] })
      days.forEach((day) => (alldaysGrid[day].alldays[emptyRow] = event.eventId))
    })
    const shown = minimizedAD ? minAD : maxAD
    let tempEventID: string = ''
    for (let r = 0; r < shown; r++) {
      for (let d = 0; d < displayedDaysCount; d++) {
        const lastRow = r === shown - 1
        if (r < shown - 1 && tempEventID !== alldaysGrid[d].alldays[r] && alldaysGrid[d].alldays[r] !== null) {
          tempEventID = alldaysGrid[d].alldays[r] ?? ''
          if (tempEventID !== '') shortAlldays.push({ id: tempEventID, day: d })
        } else if (lastRow) {
          const filtered = alldaysGrid[d].alldays.slice(shown).filter((ev) => ev !== null)
          if (tempEventID !== alldaysGrid[d].alldays[r] && alldaysGrid[d].alldays[r] !== null) {
            if (filtered.length > 0) {
              tempEventID = ''
              moreCounts[d] = filtered.length + 1
            } else {
              tempEventID = alldaysGrid[d].alldays[r] ?? ''
              if (tempEventID !== '') shortAlldays.push({ id: tempEventID, day: d })
              moreCounts[d] = 0
            }
          } else if (alldaysGrid[d].alldays[r] === null) {
            tempEventID = ''
            if (filtered.length > 0) moreCounts[d] = filtered.length
            else moreCounts[d] = 0
          } else if (alldaysGrid[d].alldays[r] === tempEventID) {
            if (filtered.length > 0) {
              tempEventID = ''
              moreCounts[d] = filtered.length + 1
            } else moreCounts[d] = 0
          }
        }
      }
    }
  }

  const checkIntersect = (date1: CalendarItem | CalendarElement, date2: CalendarItem | CalendarElement): boolean => {
    return (
      (date2.date <= date1.date && date2.dueDate > date1.date) ||
      (date2.date >= date1.date && date2.date < date1.dueDate)
    )
  }
  const convertToTime = (date: Timestamp | Date): { hours: number; mins: number } => {
    const temp = new Date(date)
    return { hours: temp.getHours() - startHour, mins: temp.getMinutes() }
  }

  const getGridOffset = (mins: number, end: boolean = false): number => {
    if (mins === 0) return end ? 2 + cellBorder : 2
    return mins < 3 ? (end ? 1 : 2) : mins > 57 ? (end ? 2 + cellBorder : 1) : 1
  }

  const getRect = (
    event: CalendarItem
  ): { top: number; bottom: number; left: number; right: number; width: number } => {
    const result = { top: 0, bottom: 0, left: 0, right: 0, width: 0 }
    const checkDate = new Date(currentDate.getTime() + MILLISECONDS_IN_DAY * event.day)
    const startDay = checkDate.setHours(startHour, 0, 0)
    const endDay = checkDate.setHours(displayedHours - 1, 59, 59)
    const startTime = event.date < startDay ? { hours: 0, mins: 0 } : convertToTime(event.date)
    const endTime =
      event.dueDate > endDay ? { hours: displayedHours - startHour, mins: 0 } : convertToTime(event.dueDate)
    result.top =
      rem(3.5) +
      styleAD +
      cellHeight * startTime.hours +
      (startTime.mins / 60) * cellHeight +
      getGridOffset(startTime.mins)
    result.bottom =
      cellHeight * (displayedHours - startHour - endTime.hours - 1) +
      ((60 - endTime.mins) / 60) * cellHeight +
      getGridOffset(endTime.mins, true)
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
    const elWidth = (colWidth - rem(0.25) - (cols - 1) * rem(0.125)) / cols
    result.width = elWidth
    result.left = rem(3.5) + event.day * colWidth + index * elWidth + index * rem(0.125) + rem(0.125) + cellBorder
    result.right =
      (displayedDaysCount - event.day - 1) * colWidth +
      rem(0.125) +
      (cols - index - 1) * elWidth +
      (cols - index - 1) * rem(0.125)
    return result
  }
  const getADRect = (id: string, day?: number): { top: number; left: number; width: number; fit: boolean } => {
    const result = { top: 0, left: 0, width: 0, fit: true }
    const index = adRows.findIndex((ev) => ev.id === id)
    const shown = minimizedAD ? minAD : maxAD
    const lastRow = adRows[index].row === shown - 1
    const fitting = !shownAD && lastRow && typeof day !== 'undefined'
    result.top = rem(0.125 + adRows[index].row * (heightAD + 0.125))
    if (fitting) {
      result.left = rem(0.125) + day * (colWidth + 0.125)
      if (day < adRows[index].endCol) {
        for (let d = day; d <= adRows[index].endCol; d++) {
          if (moreCounts[d] !== 0) {
            result.width = colWidth * (d - day) - rem(0.25)
            break
          } else if (d === adRows[index].endCol) result.width = colWidth + colWidth * (d - day) - rem(0.25)
        }
      } else result.width = colWidth - rem(0.25)
    } else if (fitting && (adRows[index].row > shown - 1 || (lastRow && moreCounts[day] > 0))) {
      result.fit = false
    } else {
      result.left = rem(0.125) + adRows[index].startCol * (colWidth + 0.125)
      const w = adRows[index].endCol - adRows[index].startCol
      result.width = colWidth + colWidth * w - rem(0.25)
    }
    return result
  }
  const getMore = (day: number): { top: number; left: number; width: number } => {
    const result = { top: 0, left: 0, width: 0 }
    const lastRow = (minimizedAD ? minAD : maxAD) - 1
    result.top = rem(0.125 + lastRow * (heightAD + 0.125))
    result.left = rem(0.125) + day * (colWidth + 0.125)
    result.width = colWidth - rem(0.25)
    return result
  }

  const getTimeZone = (): string => {
    return new Intl.DateTimeFormat([], { timeZoneName: 'short' }).format(Date.now()).split(' ')[1]
  }

  onMount(() => {
    if (container) checkSizes(container)
    minHeightAD = rem((heightAD + 0.125) * minAD + 0.25)
  })

  const checkSizes = (element: HTMLElement | Element) => {
    calendarRect = element.getBoundingClientRect()
    calendarWidth = calendarRect.width
    colWidth = (calendarWidth - 3.5 * fontSize) / displayedDaysCount
  }
  $: if (docHeight && calendarRect?.top) {
    const proc = ((docHeight - calendarRect.top) * 30) / 100
    const temp = rem((heightAD + 0.125) * Math.trunc(proc / rem(heightAD + 0.125)) + 0.25)
    maxHeightAD = Math.max(temp, minHeightAD)
    shownHeightAD = rem((heightAD + 0.125) * adMaxRow + 0.25)
  }
  $: styleAD = shownAD
    ? shownHeightAD > maxHeightAD
      ? maxHeightAD
      : shownHeightAD
    : rem((heightAD + 0.125) * adMaxRow + 0.25) > maxHeightAD && minimizedAD
      ? rem((heightAD + 0.125) * (adMaxRow <= minAD ? adMaxRow : minAD) + 0.25)
      : rem((heightAD + 0.125) * (adMaxRow <= maxAD ? adMaxRow : maxAD) + 0.25)
</script>

<Scroller bind:divScroll={scroller} fade={{ multipler: { top: 3.5 + styleAD / fontSize, bottom: 0 } }}>
  <div
    bind:this={container}
    class="calendar-container"
    style:grid={`[header] 3.5rem [all-day] ${styleAD}px repeat(${
      (displayedHours - startHour) * 2
    }, [row-start] 2rem) / [time-col] 3.5rem repeat(${displayedDaysCount}, [col-start] 1fr)`}
    use:resizeObserver={(element) => checkSizes(element)}
  >
    <div class="sticky-header head center"><span class="zone">{getTimeZone()}</span></div>
    {#each [...Array(displayedDaysCount).keys()] as dayOfWeek}
      {@const day = getDay(weekMonday, dayOfWeek)}
      <div class="sticky-header head title" class:center={displayedDaysCount > 1}>
        <span class="day" class:today={areDatesEqual(todayDate, day)}>{day.getDate()}</span>
        <span class="weekday">{getWeekDayName(day, weekFormat)}</span>
      </div>
    {/each}

    <div class="sticky-header allday-header text-sm content-dark-color">
      All day
      {#if (!minimizedAD && adMaxRow > maxAD) || (minimizedAD && adMaxRow > minAD)}
        <ActionIcon
          icon={shownAD ? IconUpOutline : IconDownOutline}
          size={'small'}
          action={() => {
            shownAD = !shownAD
          }}
        />
      {/if}
    </div>
    <div class="sticky-header allday-container" style:grid-column={`col-start 1 / span ${displayedDaysCount}`}>
      {#if shownHeightAD > maxHeightAD && shownAD}
        <Scroller noFade={false}>
          {#key calendarWidth}{#key displayedDaysCount}
              <div style:min-height={`${shownHeightAD - cellBorder * 2}px`} />
              {#each alldays as event, i}
                {@const rect = getADRect(event.eventId)}
                <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                <div
                  class="calendar-element"
                  style:top={`${rect.top}px`}
                  style:height={`${heightAD}rem`}
                  style:left={`${rect.left}px`}
                  style:width={`${rect.width}px`}
                  tabindex={500 + i}
                >
                  <slot name="allday" id={event.eventId} width={rect.width} />
                </div>
              {/each}
            {/key}{/key}
        </Scroller>
      {:else if shownAD}
        {#key calendarWidth}{#key displayedDaysCount}
            {#each alldays as event, i}
              {@const rect = getADRect(event.eventId)}
              <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
              <div
                class="calendar-element"
                style:top={`${rect.top}px`}
                style:height={`${heightAD}rem`}
                style:left={`${rect.left}px`}
                style:width={`${rect.width}px`}
                tabindex={500 + i}
              >
                <slot name="allday" id={event.eventId} width={rect.width} />
              </div>
            {/each}
          {/key}{/key}
      {:else}
        {#key calendarWidth}{#key displayedDaysCount}
            {#each shortAlldays as event, i}
              {@const rect = getADRect(event.id, event.day)}
              <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
              <div
                class="calendar-element"
                style:top={`${rect.top}px`}
                style:height={`${heightAD}rem`}
                style:left={`${rect.left}px`}
                style:width={`${rect.width}px`}
                tabindex={500 + i}
              >
                <slot name="allday" id={event.id} width={rect.width} />
              </div>
            {/each}
            {#each moreCounts as more, day}
              {@const addon = shortAlldays.length}
              {#if more !== 0}
                {@const rect = getMore(day)}
                <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <div
                  class="calendar-element antiButton ghost medium accent cursor-pointer"
                  style:top={`${rect.top}px`}
                  style:height={`${heightAD}rem`}
                  style:left={`${rect.left}px`}
                  style:width={`${rect.width}px`}
                  style:padding-left={'1.25rem'}
                  tabindex={500 + addon + day}
                  on:click={() => (shownAD = true)}
                >
                  <Label label={ui.string.MoreCount} params={{ count: more }} />
                </div>
              {/if}
            {/each}
          {/key}{/key}
      {/if}
    </div>

    {#each [...Array(displayedHours - startHour).keys()] as hourOfDay}
      {#if hourOfDay === 0}
        <div class="clear-cell" />
      {:else if hourOfDay < displayedHours - startHour}
        <div
          class="time-cell"
          style:grid-column={'time-col 1 / col-start 1'}
          style:grid-row={`row-start ${hourOfDay * 2} / row-start ${hourOfDay * 2 + 2}`}
        >
          {getTimeFormat(hourOfDay + startHour)}
        </div>
      {/if}
      {#each [...Array(displayedDaysCount).keys()] as dayOfWeek}
        {@const day = getDay(weekMonday, dayOfWeek)}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
          class="empty-cell"
          style:width={`${colWidth}px`}
          style:grid-column={`col-start ${dayOfWeek + 1} / ${dayOfWeek + 2}`}
          style:grid-row={`row-start ${hourOfDay * 2 + 1} / row-start ${hourOfDay * 2 + 3}`}
          on:click|stopPropagation={() => {
            dispatch('create', {
              date: new Date(day.setHours(hourOfDay + startHour, 0, 0, 0)),
              withTime: true
            })
          }}
        />
      {/each}
      {#if hourOfDay === displayedHours - startHour - 1}<div class="clear-cell" />{/if}
    {/each}

    {#key styleAD}{#key calendarWidth}{#key displayedDaysCount}
          {#each newEvents.filter((ev) => !ev.allDay) as event, i}
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
              <slot name="event" id={event.eventId} width={rect.width} />
            </div>
          {/each}
        {/key}{/key}{/key}
  </div>
</Scroller>

<style lang="scss">
  .empty-cell {
    border-left: 1px solid var(--theme-divider-color);
    border-bottom: 1px solid var(--theme-divider-color);
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
        display: flex;
        justify-content: center;
        align-items: center;
        min-width: 2.25rem;
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
    &.allday-header {
      flex-direction: column;
      justify-content: space-between;
      padding: 0.625rem 0.125rem;
    }
    &.allday-container {
      overflow: hidden;

      .allday-event {
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
