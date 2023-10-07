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
  import { Event, ReccuringInstance } from '@hcengineering/calendar'
  import { DocumentUpdate, Ref, Timestamp } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import ui, {
    ActionIcon,
    CalendarItem,
    IconDownOutline,
    IconUpOutline,
    Label,
    MILLISECONDS_IN_DAY,
    Scroller,
    addZero,
    areDatesEqual,
    closeTooltip,
    deviceOptionsStore as deviceInfo,
    day as getDay,
    getEventPositionElement,
    getMonday,
    getWeekDayName,
    resizeObserver,
    showPopup
  } from '@hcengineering/ui'
  import { Menu } from '@hcengineering/view-resources'
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'
  import calendar from '../plugin'
  import { isReadOnly, updateReccuringInstance } from '../utils'
  import EventElement from './EventElement.svelte'
  import type {
    CalendarGrid,
    CalendarADGrid,
    CalendarADRows,
    CalendarElementRect,
    CalendarElement,
    CalendarCell
  } from '..'

  export let events: Event[]
  export let mondayStart = true
  export let selectedDate: Date = new Date()
  export let currentDate: Date = selectedDate
  export let displayedDaysCount = 7
  export let displayedHours = 24
  export let startHour = 0
  export let startFromWeekStart = true
  export let weekFormat: 'narrow' | 'short' | 'long' | undefined = displayedDaysCount > 4 ? 'short' : 'long'
  export let showHeader: boolean = true
  export let clearCells: boolean = false

  const client = getClient()
  const dispatch = createEventDispatcher()

  const todayDate = new Date()
  const ampm = new Intl.DateTimeFormat([], { hour: 'numeric' }).resolvedOptions().hour12
  const getTimeFormat = (hour: number, min: number = 0): string => {
    if (min === 0) return ampm ? `${hour > 12 ? hour - 12 : hour}${hour < 12 ? 'am' : 'pm'}` : `${addZero(hour)}:00`
    else {
      return ampm
        ? `${hour > 12 ? hour - 12 : hour}:${addZero(min)}${hour < 12 ? 'am' : 'pm'}`
        : `${addZero(hour)}:${addZero(min)}`
    }
  }
  const rem = (n: number): number => n * fontSize
  const initDisplayedDaysCount = displayedDaysCount

  export function getCalendarRect (): DOMRect | undefined {
    return container ? calendarRect : undefined
  }

  const offsetTZ = new Date().getTimezoneOffset() * 60 * 1000

  const toCalendar = (
    events: Event[],
    date: Date,
    days: number = 1,
    startHour: number = 0,
    endHour: number = 24
  ): CalendarItem[] => {
    const result: CalendarItem[] = []
    for (let day = 0; day < days; day++) {
      const startDay = new Date(MILLISECONDS_IN_DAY * day + date.getTime()).setHours(0, 0, 0, 0)
      const startDate = new Date(MILLISECONDS_IN_DAY * day + date.getTime()).setHours(startHour, 0, 0, 0)
      const lastDate = new Date(MILLISECONDS_IN_DAY * day + date.getTime()).setHours(endHour, 0, 0, 0)
      events.forEach((event) => {
        const eventStart = event.allDay ? event.date + offsetTZ : event.date
        const eventEnd = event.allDay ? event.dueDate + offsetTZ : event.dueDate
        if ((eventStart < lastDate && eventEnd > startDate) || (eventStart === eventEnd && eventStart === startDay)) {
          result.push({
            _id: event._id,
            allDay: event.allDay,
            date: eventStart,
            dueDate: eventEnd,
            day,
            access: event.access
          })
        }
      })
    }
    const sd = date.setHours(0, 0, 0, 0)
    const ld = new Date(MILLISECONDS_IN_DAY * (days - 1) + date.getTime()).setHours(23, 59, 59, 999)
    events
      .filter((ev) => ev.allDay)
      .sort((a, b) => b.dueDate - b.date - (a.dueDate - a.date))
      .forEach((event) => {
        const eventStart = event.date + offsetTZ
        const eventEnd = event.dueDate + offsetTZ
        if ((eventStart < ld && eventEnd > sd) || (eventStart === eventEnd && eventStart === sd)) {
          result.push({
            _id: event._id,
            allDay: event.allDay,
            date: eventStart,
            dueDate: eventEnd,
            day: -1,
            access: event.access
          })
        }
      })
    return result
  }

  $: calendarEvents = toCalendar(events, weekMonday, displayedDaysCount, startHour, displayedHours + startHour)

  $: fontSize = $deviceInfo.fontSize
  $: docHeight = $deviceInfo.docHeight
  $: cellHeight = 4 * fontSize
  $: weekMonday = startFromWeekStart
    ? getMonday(currentDate, mondayStart)
    : new Date(new Date(currentDate).setHours(0, 0, 0, 0))

  let timer: any
  let container: HTMLElement
  let scroller: HTMLElement
  let calendarWidth: number = 0
  let calendarRect: DOMRect
  let colWidth: number = 0
  let nowLineTop: number = -1
  let timeNow: string = '--:--'
  let nowLineStyle: string = ''
  let newEvents = calendarEvents
  let grid: CalendarGrid[] = Array<CalendarGrid>(displayedDaysCount)
  let alldays: CalendarItem[] = []
  let alldaysGrid: CalendarADGrid[] = Array<CalendarADGrid>(displayedDaysCount)
  let adMaxRow: number = 1
  let adRows: CalendarADRows[]
  const cellBorder: number = 1
  const stepsPerHour: number = 4
  const heightAD: number = 2
  const minAD: number = 2
  const maxAD: number = 3
  let minHeightAD: number = 0
  let maxHeightAD: number = 0
  let shownHeightAD: number = 0
  let shownAD: boolean = false
  let shortAlldays: { id: string; day: number; fixRow?: boolean }[] = []
  let moreCounts: number[] = Array<number>(displayedDaysCount)
  const nullCalendarElement: CalendarElementRect = {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    width: 0,
    height: rem(heightAD),
    fit: true,
    visibility: 1
  }

  $: minimizedAD = maxHeightAD === minHeightAD && maxHeightAD !== 0

  const updateEvents = (events: CalendarItem[]): CalendarItem[] => {
    grid = new Array<CalendarGrid>(displayedDaysCount)
    alldaysGrid = new Array<CalendarADGrid>(displayedDaysCount)
    alldays = []
    shortAlldays = []
    moreCounts = new Array<number>(displayedDaysCount)
    if (shownAD && adMaxRow <= maxAD) shownAD = false
    prepareAllDays()

    events
      .filter((ev) => !ev.allDay)
      .forEach((event, i, arr) => {
        if (grid[event.day] === undefined) {
          grid[event.day] = {
            columns: [{ elements: [{ id: event._id, date: event.date, dueDate: event.dueDate, cols: 1 }] }]
          }
        } else {
          const index = grid[event.day].columns.findIndex(
            (col) => col.elements[col.elements.length - 1].dueDate <= event.date
          )
          const intersects = grid[event.day].columns.filter((col) =>
            checkIntersect(col.elements[col.elements.length - 1], event)
          )
          if (index === -1) {
            const size = intersects.length + 1
            grid[event.day].columns.forEach((col) => {
              if (checkIntersect(col.elements[col.elements.length - 1], event)) {
                col.elements[col.elements.length - 1].cols = size
              }
            })
            grid[event.day].columns.push({
              elements: [{ id: event._id, date: event.date, dueDate: event.dueDate, cols: size }]
            })
          } else {
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
              id: event._id,
              date: event.date,
              dueDate: event.dueDate,
              cols: maxCols
            })
          }
        }
        if (i === arr.length - 1) checkGrid()
      })
    return events
  }
  $: newEvents = updateEvents(calendarEvents)

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
    alldays = calendarEvents.filter((ev) => ev.allDay)
    adRows = []
    for (let i = 0; i < displayedDaysCount; i++) alldaysGrid[i] = { alldays: [null] }
    adMaxRow = 1
    alldays
      .filter((event) => event.day === -1)
      .forEach((event) => {
        const days = newEvents
          .filter((ev) => ev.allDay && ev.day !== -1 && event._id === ev._id)
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
        adRows.push({ id: event._id, row: emptyRow, startCol: days[0], endCol: days[days.length - 1] })
        days.forEach((day) => (alldaysGrid[day].alldays[emptyRow] = event._id))
      })
    const shown = minimizedAD ? minAD : maxAD
    let tempEventID: string = ''
    for (let r = 0; r < shown; r++) {
      const lastRow = r === shown - 1
      for (let d = 0; d < displayedDaysCount; d++) {
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
            if (filtered.length > 1) moreCounts[d] = filtered.length
            else {
              if (filtered.length === 1 && filtered[0] !== null) {
                shortAlldays.push({ id: filtered[0], day: d, fixRow: true })
              }
              moreCounts[d] = 0
            }
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
    return mins < 2 ? (end ? 1 : 2) : mins >= 57 ? (end ? 1 + cellBorder : 1) : 1
  }

  const getRect = (event: CalendarItem): CalendarElementRect => {
    const result = { ...nullCalendarElement }
    const checkDate = new Date(weekMonday.getTime() + MILLISECONDS_IN_DAY * event.day)
    const startDay = checkDate.setHours(startHour, 0, 0, 0)
    const endDay = checkDate.setHours(displayedHours - 1, 59, 59, 999)
    const startTime = event.date <= startDay ? { hours: startHour, mins: 0 } : convertToTime(event.date)
    const endTime =
      event.dueDate > endDay ? { hours: displayedHours - startHour, mins: 0 } : convertToTime(event.dueDate)
    if (getDay(weekMonday, event.day).setHours(endTime.hours, endTime.mins, 0, 0) <= todayDate.getTime()) {
      result.visibility = 0
    }
    result.top =
      (showHeader ? rem(3.5) : 0) +
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
        if (el.id === event._id) {
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
  const getADRect = (id: string, day?: number, fixRow?: boolean): CalendarElementRect => {
    const result = { ...nullCalendarElement }
    const index = adRows.findIndex((ev) => ev.id === id)

    const checkTime = new Date().setHours(0, 0, 0, 0)
    const startEvent = getDay(weekMonday, typeof day !== 'undefined' ? day : adRows[index].startCol).getTime()
    const endEvent = getDay(weekMonday, adRows[index].endCol).setHours(24)
    if (endEvent <= checkTime) result.visibility = 0
    else if (startEvent <= checkTime && endEvent > checkTime) {
      const eventTime = endEvent - startEvent
      const remained = endEvent - checkTime
      const proc = remained / eventTime
      result.visibility = proc
    }

    const shown = minimizedAD ? minAD : maxAD
    const row = fixRow ? shown - 1 : adRows[index].row
    const lastRow = row === shown - 1
    const fitting = !shownAD && lastRow && typeof day !== 'undefined'
    result.top = rem(0.125 + row * (heightAD + 0.125))
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
    } else if (fitting && (row > shown - 1 || (lastRow && moreCounts[day] > 0))) {
      result.fit = false
    } else {
      result.left = rem(0.125) + adRows[index].startCol * (colWidth + 0.125)
      const w = adRows[index].endCol - adRows[index].startCol
      result.width = colWidth + colWidth * w - rem(0.25)
    }
    return result
  }
  const getMask = (visibility: number): string => {
    return visibility === 0 || visibility === 1
      ? 'none'
      : `linear-gradient(-90deg, rgba(0, 0, 0, 1) ${visibility * 100}%, rgba(0, 0, 0, .4) ${visibility * 100}%)`
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

  const getTopOffset = (date: Date): number => {
    const d = convertToTime(date)
    return (
      (showHeader ? rem(3.5) : 0) +
      styleAD +
      cellHeight * d.hours +
      (d.mins / 60) * cellHeight +
      (d.mins > 50 ? -getGridOffset(d.mins, true) : d.mins < 10 ? getGridOffset(d.mins) : 0)
    )
  }
  const renderNow = (): void => {
    const d = new Date()
    const n = convertToTime(d)
    nowLineStyle =
      n.hours <= startHour && n.mins < 10
        ? ' lowerLabel'
        : n.hours >= displayedHours + startHour - 1 && n.mins > 50
          ? ' upperLabel'
          : ''
    timeNow = getTimeFormat(n.hours, n.mins)
    nowLineTop = getTopOffset(d)
  }
  const checkNowLine = (): void => {
    if (timer) clearInterval(timer)
    let equal = false
    for (let i = 0; i < displayedDaysCount; i++) if (areDatesEqual(getDay(weekMonday, i), todayDate)) equal = true
    if (equal) {
      renderNow()
      timer = setInterval(() => renderNow(), 1000)
    } else nowLineTop = -1
  }
  export const scrollToTime = (date: Date): void => {
    const top = getTopOffset(date)
    const offset = (scroller.getBoundingClientRect().height - rem(heightAD + 0.25)) / 2
    scroller.scrollTo({ top: top - offset })
  }
  $: if (currentDate) checkNowLine()

  onMount(() => {
    minHeightAD = rem((heightAD + 0.125) * minAD + 0.25)
    if (container) {
      checkSizes(container)
      scrollToTime(todayDate)
    }
  })
  onDestroy(() => {
    if (timer) clearInterval(timer)
  })

  const checkSizes = (element: HTMLElement | Element) => {
    calendarRect = element.getBoundingClientRect()
    calendarWidth = calendarRect.width
    if (calendarWidth < 356 && initDisplayedDaysCount >= 1) displayedDaysCount = 1
    else if (calendarWidth < 512 && initDisplayedDaysCount >= 2) displayedDaysCount = 2
    else if (calendarWidth >= 512 && displayedDaysCount < initDisplayedDaysCount) displayedDaysCount = 3
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
  $: showArrowAD = (!minimizedAD && adMaxRow > maxAD) || (minimizedAD && adMaxRow > minAD)

  const getMinutes = (e: MouseEvent): number => {
    let mins: number = 0
    for (let i = 0; i < stepsPerHour; i++) {
      if (e.offsetY >= (i * cellHeight) / stepsPerHour && e.offsetY < ((i + 1) * cellHeight) / stepsPerHour) {
        mins = (i * 60) / stepsPerHour
      }
    }
    return mins
  }

  let dragOnOld: CalendarCell | null = null
  let dragId: Ref<Event> | null = null
  let resizeId: Ref<Event> | null = null
  let directionResize: 'top' | 'bottom' | null
  let oldMins: number = 0
  let oldTime: number = -1
  let originDate: Timestamp = 0
  let originDueDate: Timestamp = 0

  async function updateHandler (event: Event) {
    const update: DocumentUpdate<Event> = {}
    if (originDate !== event.date) update.date = event.date
    if (originDueDate !== event.dueDate) update.dueDate = event.dueDate
    if (Object.keys(update).length > 0) {
      if (event._class === calendar.class.ReccuringInstance) {
        await updateReccuringInstance(update, {
          ...event,
          date: originDate,
          dueDate: originDueDate
        } as ReccuringInstance)
      } else {
        await client.update(event, update)
      }
    }
  }
  async function mouseUpElement (e: MouseEvent) {
    window.removeEventListener('mouseup', mouseUpElement)
    const event = events.find((ev) => ev._id === resizeId)
    if (event !== undefined) await updateHandler(event)
    resizeId = directionResize = null
  }
  function mouseDownElement (e: MouseEvent, event: Event, direction: 'top' | 'bottom'): void {
    if (e.buttons !== 1) return
    e.stopPropagation()
    resizeId = event._id
    directionResize = direction
    originDate = event.date
    originDueDate = event.dueDate
    window.addEventListener('mouseup', mouseUpElement)
  }
  function mouseMoveElement (
    e: MouseEvent & { currentTarget: EventTarget & HTMLDivElement },
    day: Date,
    hour: number
  ): void {
    if (resizeId == null && directionResize == null) return
    let mins: number = 0
    for (let i = 0; i < stepsPerHour; i++) {
      if (e.offsetY >= (i * cellHeight) / stepsPerHour && e.offsetY < ((i + 1) * cellHeight) / stepsPerHour) mins = i
    }
    if (oldMins === mins) return
    oldMins = mins
    const newDate = new Date(day).setHours(
      hour + startHour,
      (mins * 60) / stepsPerHour + (directionResize === 'top' ? 0 : 60 / stepsPerHour),
      0,
      0
    )
    const index = events.findIndex((ev) => ev._id === resizeId)
    if (index === -1) return
    if (directionResize === 'top') {
      if (events[index].dueDate - newDate >= 15 * 60000) events[index].date = newDate
    } else {
      if (newDate - events[index].date >= 15 * 60000) events[index].dueDate = newDate
    }
    events = events
  }
  function dragStartElement (e: DragEvent & { currentTarget: EventTarget & HTMLDivElement }, event: Event): void {
    if (isReadOnly(event) || event.allDay) return
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'all'
    originDate = event.date
    originDueDate = event.dueDate
    dragOnOld = null
    oldTime = -1
    closeTooltip()
    setTimeout(() => (dragId = event._id), 50)
  }
  async function dragEndElement (e: DragEvent) {
    const event = events.find((ev) => ev._id === dragId)
    if (event !== undefined) await updateHandler(event)
    dragId = null
  }
  function dragDrop (e: DragEvent, day: Date, hourOfDay: number): void {
    const newTime = new Date(day).setHours(hourOfDay + startHour, getMinutes(e), 0, 0)
    if (dragId) {
      const index = events.findIndex((ev) => ev._id === dragId)
      const diff = newTime - oldTime
      if (diff && index !== -1 && oldTime !== -1) {
        events[index].date = originDate + diff
        events[index].dueDate = originDueDate + diff
        events = events
      }
    } else {
      dispatch('dragDrop', {
        day,
        hour: hourOfDay + startHour,
        date: new Date(newTime)
      })
    }
    dragOnOld = null
  }
  function dragOver (e: DragEvent, day: Date, hourOfDay: number): void {
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
    e.preventDefault()
    const dragOn: CalendarCell = {
      day,
      hourOfDay,
      minutes: getMinutes(e)
    }
    if (
      dragOnOld !== null &&
      areDatesEqual(dragOn.day, dragOnOld.day) &&
      dragOn.hourOfDay === dragOnOld.hourOfDay &&
      dragOn.minutes === dragOnOld.minutes
    ) {
      return
    }
    dragOnOld = dragOn
    const newTime = new Date(day).setHours(hourOfDay + startHour, dragOn.minutes, 0, 0)
    if (dragId) {
      if (oldTime === -1) oldTime = newTime
      const index = events.findIndex((ev) => ev._id === dragId)
      const diff = newTime - oldTime
      if (diff && index !== -1) {
        events[index].date = originDate + diff
        events[index].dueDate = originDueDate + diff
      }
      events.sort((a, b) => a.date - b.date)
    } else dispatch('dragEnter', { date: new Date(newTime) })
  }

  function showMenu (ev: MouseEvent, event: Event) {
    ev.preventDefault()
    closeTooltip()
    showPopup(Menu, { object: event }, getEventPositionElement(ev))
  }
</script>

<Scroller
  bind:divScroll={scroller}
  fade={{ multipler: { top: (showHeader ? 3.5 : 0) + styleAD / fontSize, bottom: 0 } }}
>
  <div
    bind:this={container}
    on:dragleave
    class="calendar-container"
    class:clearCells={clearCells || resizeId !== null || dragId !== null}
    class:cursor-row-resize={resizeId !== null && directionResize !== null}
    style:--calendar-ad-height={styleAD + 'px'}
    style:grid={`${showHeader ? '[header] 3.5rem ' : ''}[all-day] ${styleAD}px repeat(${
      (displayedHours - startHour) * 2
    }, [row-start] 2rem) / [time-col] 3.5rem repeat(${displayedDaysCount}, [col-start] 1fr)`}
    use:resizeObserver={(element) => checkSizes(element)}
  >
    {#if showHeader}
      <div class="sticky-header head center"><span class="zone">{getTimeZone()}</span></div>
      {#each [...Array(displayedDaysCount).keys()] as dayOfWeek}
        {@const day = getDay(weekMonday, dayOfWeek)}
        <div class="sticky-header head title" class:center={displayedDaysCount > 1}>
          <span class="day" class:today={areDatesEqual(todayDate, day)}>{day.getDate()}</span>
          <span class="weekday">{getWeekDayName(day, weekFormat)}</span>
        </div>
      {/each}
    {/if}

    <div class="sticky-header allday-header content-dark-color" class:top={!showHeader} class:opened={showArrowAD}>
      <div class="flex-center text-sm leading-3 text-center" style:height={`${heightAD + 0.25}rem`}>
        <Label label={calendar.string.AllDay} />
      </div>
      {#if showArrowAD}
        <ActionIcon
          icon={shownAD ? IconUpOutline : IconDownOutline}
          size={'small'}
          action={() => {
            shownAD = !shownAD
          }}
        />
      {/if}
    </div>
    <div
      class="sticky-header allday-container"
      class:top={!showHeader}
      style:grid-column={`col-start 1 / span ${displayedDaysCount}`}
    >
      {#if shownHeightAD > maxHeightAD && shownAD}
        <Scroller noFade={false}>
          {#key [styleAD, calendarWidth, displayedDaysCount, showHeader]}
            <div style:min-height={`${shownHeightAD - cellBorder * 2}px`} />
            {#each alldays as event, i}
              {@const rect = getADRect(event._id)}
              {@const ev = events.find((p) => p._id === event._id)}
              {#if ev}
                <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                <div
                  class="calendar-element"
                  style:top={`${rect.top}px`}
                  style:height={`${rect.height}px`}
                  style:left={`${rect.left}px`}
                  style:width={`${rect.width}px`}
                  style:opacity={rect.visibility === 0 ? 0.4 : 1}
                  style:--mask-image={getMask(rect.visibility)}
                  tabindex={500 + i}
                >
                  <EventElement hourHeight={cellHeight} event={ev} size={{ width: rect.width, height: rect.height }} />
                </div>
              {/if}
            {/each}
          {/key}
        </Scroller>
      {:else if shownAD}
        {#key [styleAD, calendarWidth, displayedDaysCount, showHeader]}
          {#each alldays as event, i}
            {@const rect = getADRect(event._id)}
            {@const ev = events.find((p) => p._id === event._id)}
            {#if ev}
              <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
              <div
                class="calendar-element"
                style:top={`${rect.top}px`}
                style:height={`${rect.height}px`}
                style:left={`${rect.left}px`}
                style:width={`${rect.width}px`}
                style:opacity={rect.visibility === 0 ? 0.4 : 1}
                style:--mask-image={getMask(rect.visibility)}
                tabindex={500 + i}
              >
                <EventElement hourHeight={cellHeight} event={ev} size={{ width: rect.width, height: rect.height }} />
              </div>
            {/if}
          {/each}
        {/key}
      {:else}
        {#key [styleAD, calendarWidth, displayedDaysCount, showHeader]}
          {#each shortAlldays as event, i}
            {@const rect = getADRect(event.id, event.day, event.fixRow)}
            {@const ev = events.find((p) => p._id === event.id)}
            {#if ev}
              <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
              <div
                class="calendar-element"
                style:top={`${rect.top}px`}
                style:height={`${rect.height}px`}
                style:left={`${rect.left}px`}
                style:width={`${rect.width}px`}
                style:opacity={rect.visibility === 0 ? 0.4 : 1}
                style:--mask-image={getMask(rect.visibility)}
                tabindex={500 + i}
              >
                <EventElement hourHeight={cellHeight} event={ev} size={{ width: rect.width, height: rect.height }} />
              </div>
            {/if}
          {/each}
          {#each moreCounts as more, day}
            {@const addon = shortAlldays.length}
            {#if more !== 0}
              {@const rect = getMore(day)}
              <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
              <!-- svelte-ignore a11y-click-events-have-key-events -->
              <div
                class="calendar-element withPointer antiButton ghost medium accent cursor-pointer"
                style:top={`${rect.top}px`}
                style:height={`${heightAD}rem`}
                style:left={`${rect.left}px`}
                style:width={`${rect.width}px`}
                style:padding={'0 .5rem 0 1.25rem'}
                style:--mask-image={'none'}
                tabindex={500 + addon + day}
                on:click={() => (shownAD = true)}
              >
                <Label label={ui.string.MoreCount} params={{ count: more }} />
              </div>
            {/if}
          {/each}
        {/key}
      {/if}
    </div>

    {#each [...Array(displayedHours - startHour).keys()] as hourOfDay}
      {#if hourOfDay === 0}
        {#if showHeader}
          <div class="clear-cell" />
        {:else}
          <div class="sticky-header head center zm"><span class="zone mini">{getTimeZone()}</span></div>
        {/if}
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
          on:mousemove={(e) => mouseMoveElement(e, day, hourOfDay)}
          on:dragover={(e) => dragOver(e, day, hourOfDay)}
          on:drop|preventDefault={(e) => dragDrop(e, day, hourOfDay)}
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

    {#key [styleAD, calendarWidth, displayedDaysCount, showHeader]}
      {#each newEvents.filter((ev) => !ev.allDay) as event, i}
        {@const rect = getRect(event)}
        {@const ev = events.find((p) => p._id === event._id)}
        {#if ev}
          <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
          <div
            class="calendar-element"
            class:past={rect.visibility === 0}
            style:top={`${rect.top}px`}
            style:bottom={`${rect.bottom}px`}
            style:left={`${rect.left}px`}
            style:right={`${rect.right}px`}
            style:--mask-image={'none'}
            draggable={!ev.allDay && !resizeId}
            tabindex={1000 + i}
            on:dragstart={(e) => dragStartElement(e, ev)}
            on:dragend={dragEndElement}
          >
            <div
              class="calendar-element-start"
              class:allowed={!resizeId && !dragId && !clearCells}
              class:hovered={resizeId === ev._id && directionResize === 'top'}
              on:mousedown={(e) => mouseDownElement(e, ev, 'top')}
              on:contextmenu={(e) => showMenu(e, ev)}
            />
            <div
              class="calendar-element-end"
              class:allowed={!resizeId && !dragId && !clearCells}
              class:hovered={resizeId === ev._id && directionResize === 'bottom'}
              on:mousedown={(e) => mouseDownElement(e, ev, 'bottom')}
              on:contextmenu={(e) => showMenu(e, ev)}
            />
            <EventElement
              event={ev}
              hourHeight={cellHeight}
              size={{
                width: rect.width,
                height: (calendarRect?.height ?? rect.top + rect.bottom) - rect.top - rect.bottom
              }}
            />
          </div>
        {/if}
      {/each}
    {/key}
    {#key currentDate}
      {#if nowLineTop !== -1}
        <div data-now={timeNow} class="now-line{nowLineStyle}" style:top={`${nowLineTop}px`} />
      {/if}
    {/key}
  </div>
</Scroller>

<style lang="scss">
  .calendar-container {
    will-change: transform;
    position: relative;
    display: grid;

    &.clearCells .empty-cell {
      position: relative;
      &::after {
        position: absolute;
        content: '';
        inset: -1px;
        z-index: 5;
      }
    }
    .now-line,
    .now-line::before {
      position: absolute;
      background-color: var(--highlight-red);
    }
    .now-line {
      left: 3rem;
      right: 0;
      width: 100%;
      height: 1px;
      min-height: 1px;
      max-height: 1px;
      pointer-events: none;
      z-index: 2;

      &::before {
        content: '';
        top: -0.5rem;
        left: -2.75rem;
        right: calc(100% - 0.25rem);
        height: 1rem;
        border-radius: 0.125rem;
      }
      &::after {
        position: absolute;
        content: attr(data-now);
        top: -0.5rem;
        left: -1.25rem;
        font-weight: 500;
        font-size: 0.75rem;
        color: var(--accented-button-color);
        transform: translateX(-50%);
      }
      &.upperLabel::before,
      &.upperLabel::after {
        top: -0.875rem;
      }
      &.lowerLabel::before,
      &.lowerLabel::after {
        top: -0.125rem;
      }
    }
  }
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
    mask-image: var(--mask-image, none);
    --webkit-mask-image: var(--mask-image, none);
    border-radius: 0.25rem;

    &:not(.withPointer) {
      pointer-events: none;
    }
    &-start,
    &-end {
      position: absolute;
      left: 0;
      right: 0;
      height: 0.5rem;
      border-radius: 0.5rem;

      &::after {
        position: absolute;
        content: '';
        left: -0.25rem;
        right: -0.25rem;
        height: 1rem;
        border: 1px solid transparent;
        border-radius: 0.5rem;
        transition-property: opacity, border-width, transform;
        transition-duration: 0.15s;
        transition-timing-function: var(--timing-main);
        transform: scale(0.9);
        opacity: 0;
        cursor: row-resize;
        filter: drop-shadow(0 0 2px var(--primary-edit-border-color));
        pointer-events: none;
      }
      &.allowed::after {
        pointer-events: all;
        z-index: 10;
      }
      &.allowed:hover::after,
      &.hovered::after {
        border-width: 1px;
        transform: scale(1);
        opacity: 1;
      }
    }
    &-start {
      top: 0;
      &::after {
        top: -0.25rem;
        border-top-color: var(--primary-edit-border-color);
      }
    }
    &-end {
      bottom: 0;
      &::after {
        bottom: -0.25rem;
        border-bottom-color: var(--primary-edit-border-color);
      }
    }
  }
  :global(.calendar-element.past .event-container) {
    opacity: 0.4;
  }

  .sticky-header {
    position: sticky;
    background-color: var(--theme-comp-header-color);
    z-index: 10;

    &:not(.head) {
      top: 3.5rem;
      border-top: 1px solid var(--theme-divider-color);
      border-bottom: 1px solid var(--theme-divider-color);
    }
    &.head,
    &.top {
      top: 0;
    }
    &.zm {
      top: var(--calendar-ad-height, 2.25rem);
      mask-image: linear-gradient(to top, #0000, #000f 0.5rem, #000f calc(100% - 0.5rem), #0000 100%);
      z-index: 1;
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
      align-items: center;
      padding: 0 0.125rem;

      &.opened {
        padding: 0 0.125rem 0.625rem;
      }
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

      &.mini {
        padding: 0.125rem;
      }
    }
  }
</style>
