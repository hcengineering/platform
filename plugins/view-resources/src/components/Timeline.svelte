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
  import { fly } from 'svelte/transition'
  import { Timestamp } from '@hcengineering/core'
  import type { TimelinePoint, TimelineRow, TimelineState } from '@hcengineering/ui'
  import ui, {
    CheckBox,
    Icon,
    Scroller,
    Button,
    resizeObserver,
    MILLISECONDS_IN_DAY,
    MILLISECONDS_IN_WEEK,
    IconArrowLeft,
    IconArrowRight,
    IconAdd
  } from '@hcengineering/ui'
  import { createEventDispatcher, onMount } from 'svelte'

  export let selectedRows: number[] = []
  export let selectedRow: number | undefined = undefined
  export let lines: TimelineRow[] | undefined = undefined
  export let currentTime: Timestamp = new Date().setHours(0, 0, 0, 0)

  const dispatch = createEventDispatcher()
  const NOT_ENDED = MILLISECONDS_IN_WEEK * 4
  let currentDate: Date = new Date(currentTime)
  $: currentDate = new Date(currentTime)

  export const onObjectChecked = (row: number, value: boolean) => {
    dispatch('check', { row, value })
  }
  export const selectRow = (row: number) => {
    selectedRow = row
  }
  const handleRowFocused = (row: number) => {
    dispatch('row-focus', row)
  }

  let panelWidth: number = 320
  const dayWidth: number = 5
  let container: HTMLElement
  let viewbox: HTMLElement
  let scroller: Scroller
  let scrollDir: 'horizontal' | 'vertical' | 'none' = 'none'

  const locale = new Intl.NumberFormat().resolvedOptions().locale
  const nillPoint: TimelinePoint = { label: '', date: currentDate, x: 0 }
  const nillRect: DOMRect = { x: 0, y: 0, width: 0, height: 0, left: 0, right: 0, top: 0, bottom: 0, toJSON: () => {} }
  const time: TimelineState = {
    todayMarker: nillPoint,
    offsetView: 0,
    renderedRange: { left: nillPoint, right: nillPoint, firstDays: [] },
    rows: undefined,
    months: [],
    days: [],
    timelineBox: nillRect,
    viewBox: nillRect
  }

  const checkRange = (reverse: boolean) => {
    if (reverse) {
      if (time.offsetView * -1 - time.viewBox.width <= time.renderedRange.left.x) renderPrevMonth()
    } else {
      if (time.offsetView * -1 + time.viewBox.width * 2 >= time.renderedRange.right.x) renderNextMonth()
    }
  }

  const getDateByOffset = (x: number): { date: Date; delta: number } => {
    const deltaDays = Math.floor(x / dayWidth)
    const calcDay = new Date(currentTime + deltaDays * MILLISECONDS_IN_DAY)
    return { date: calcDay, delta: deltaDays }
  }
  const getOffsetByDate = (date: Timestamp | Date): number => {
    const tempDay = new Date(date).setHours(0, 0, 0, 0)
    const deltaDays = Math.floor((tempDay - currentTime) / MILLISECONDS_IN_DAY)
    return deltaDays * dayWidth
  }
  const getNextMonth = (date: Date): TimelinePoint => {
    const fDate = new Date(date.getFullYear(), date.getMonth() + 1, 1, 0, 0)
    const offDate = getOffsetByDate(fDate)
    const lDate = Intl.DateTimeFormat(locale, { month: 'long' }).format(fDate)
    return { date: fDate, x: offDate, label: lDate }
  }
  const getNextWeek = (date: Date, reverse?: boolean): TimelinePoint => {
    const fDate = new Date(date.getTime() + MILLISECONDS_IN_WEEK * (reverse ? -1 : 1))
    const offDate = getOffsetByDate(fDate)
    const lDate = fDate.getDate().toString()
    return { date: fDate, x: offDate, label: lDate }
  }

  const renderPrevMonth = () => {
    const oldRange: TimelinePoint = time.renderedRange.left
    const newDate: Date = new Date(oldRange.date.getFullYear(), oldRange.date.getMonth() - 1, 1, 0, 0)
    const newRange: number = getOffsetByDate(newDate)
    const newLabel: string = Intl.DateTimeFormat(locale, { month: 'long' }).format(newDate)
    const newPoint: TimelinePoint = {
      x: newRange,
      date: newDate,
      label: newLabel
    }
    time.renderedRange.left = newPoint
    time.months = [newPoint, ...time.months]
    while (getNextWeek(time.days[0].date, true).x > newPoint.x) {
      const prevDay: TimelinePoint = getNextWeek(time.days[0].date, true)
      time.days = [prevDay, ...time.days]
    }
  }
  const renderNextMonth = () => {
    const oldRange: TimelinePoint = time.renderedRange.right
    const newDate: Date = new Date(oldRange.date.getFullYear(), oldRange.date.getMonth() + 1, 1, 0, 0)
    const newRange: number = getOffsetByDate(newDate)
    const newLabel: string = Intl.DateTimeFormat(locale, { month: 'long' }).format(newDate)
    const newPoint: TimelinePoint = {
      x: newRange,
      date: newDate,
      label: newLabel
    }
    time.renderedRange.right = newPoint
    time.months = [...time.months, newPoint]
    while (getNextWeek(time.days[time.days.length - 1].date).x < newPoint.x) {
      const nextDay: TimelinePoint = getNextWeek(time.days[time.days.length - 1].date)
      time.days = [...time.days, nextDay]
    }
  }

  const wheelEvent = (e: WheelEvent) => {
    e = e || window.event
    const deltaX = -e.deltaX
    const deltaY = e.deltaY
    if (scrollDir === 'none' && (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2)) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) scrollDir = 'horizontal'
      else scrollDir = 'vertical'
    } else if (Math.abs(deltaX) <= 4 && Math.abs(deltaY) <= 4) scrollDir = 'none'
    time.offsetView += deltaX
    if (scrollDir === 'horizontal') {
      mouseMoveEvent(e)
      checkRange(deltaX > 0)
    }
    if (scrollDir === 'vertical') scroller.scrollBy(deltaY)
    e.preventDefault ? e.preventDefault() : (e.returnValue = false)
  }
  const mouseMoveEvent = (e: MouseEvent) => {
    const cur = e.x - time.viewBox.left
    if (cur >= 0 && cur <= time.viewBox.width) {
      const offset = cur - time.offsetView
      const t = getDateByOffset(offset)
      time.cursorMarker = {
        label: t.date.getDate().toString(),
        x: offset,
        date: t.date
      }
    }
  }
  const mouseOutEvent = (e: MouseEvent) => {
    time.cursorMarker = undefined
  }
  const clickEvent = (e: MouseEvent) => {
    console.log('[Timeline] Cursor: ', time.cursorMarker)
  }

  onMount(() => {
    container.addEventListener('wheel', wheelEvent)
    container.addEventListener('mousemove', mouseMoveEvent)
    container.addEventListener('mouseout', mouseOutEvent)
    container.addEventListener('click', clickEvent)

    time.timelineBox = container.getBoundingClientRect()
    time.viewBox = viewbox.getBoundingClientRect()
    time.offsetView = Math.floor(time.viewBox.width / 2)
    time.todayMarker.x = 0
    time.todayMarker.date = currentDate
    time.todayMarker.label = Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(currentDate)

    let mass: number[] = [currentTime]
    lines?.forEach((line) => {
      if (line.items !== undefined) {
        let tr: number[] = []
        line.items.forEach((it) => {
          if (it.startDate) tr = [...tr, it.startDate]
          if (it.targetDate) tr = [...tr, it.targetDate]
          else if (it.startDate) tr = [...tr, it.startDate + NOT_ENDED]
        })
        if (tr.length > 0) {
          mass = [...mass, ...tr]
          tr.sort()
          const minD: Date = new Date(tr[0])
          const maxD: Date = new Date(tr[tr.length - 1])
          const r = {
            min: {
              date: minD,
              x: getOffsetByDate(minD)
            },
            max: {
              date: maxD,
              x: getOffsetByDate(maxD)
            }
          }
          time.rows ? time.rows.push(r) : (time.rows = [r])
        } else time.rows ? time.rows.push(null) : (time.rows = [null])
      } else time.rows ? time.rows.push(null) : (time.rows = [null])
    })
    mass.sort()

    let leftRange: number = getOffsetByDate(mass[0]) - time.viewBox.width * 1.5
    const leftDate: Date = new Date(getDateByOffset(leftRange).date.setDate(1))
    leftRange = getOffsetByDate(leftDate)
    time.renderedRange.left = {
      x: leftRange,
      date: leftDate,
      label: Intl.DateTimeFormat(locale, { month: 'long' }).format(leftDate)
    }
    let rightRange: number = getOffsetByDate(mass[mass.length - 1]) + time.viewBox.width * 1.5
    const tr: Date = new Date(getDateByOffset(rightRange).date)
    const rightDate: Date = new Date(new Date(tr.getFullYear(), tr.getMonth() + 1, 1, 0, 0).getTime() - 1)
    rightRange = getOffsetByDate(rightDate)
    time.renderedRange.right = {
      x: rightRange,
      date: rightDate,
      label: Intl.DateTimeFormat(locale, { month: 'long' }).format(rightDate)
    }

    time.months = [time.renderedRange.left]
    let i = 0
    do {
      const nextMonth: TimelinePoint = getNextMonth(time.months[i].date)
      time.months = [...time.months, nextMonth]
      i++
    } while (getNextMonth(time.months[i].date).x <= time.renderedRange.right.x)
    time.days = [
      {
        x: time.renderedRange.left.x,
        date: time.renderedRange.left.date,
        label: '1'
      }
    ]
    i = 0
    do {
      const nextWeek: TimelinePoint = getNextWeek(time.days[i].date)
      time.days = [...time.days, nextWeek]
      i++
    } while (getNextWeek(time.days[i].date).x <= time.renderedRange.right.x)
  })

  let moving: boolean = false
  let sX: number
  const splitterStart = (e: MouseEvent) => {
    if (time.timelineBox.width <= 450) return
    sX = (e.x - time.viewBox.left) * -1
    document.addEventListener('mouseup', splitterEnd)
    document.addEventListener('mousemove', splitterMove)
    moving = true
  }
  const splitterMove = (e: MouseEvent) => {
    if (e.x - time.timelineBox.left + sX < 300) panelWidth = 300
    else if (time.timelineBox.right - e.x + sX < 150) panelWidth = time.timelineBox.width - 150
    else panelWidth = e.x - time.timelineBox.left + sX
  }
  const splitterEnd = (e: MouseEvent) => {
    document.removeEventListener('mousemove', splitterMove)
    document.removeEventListener('mouseup', splitterEnd)
    time.viewBox = viewbox.getBoundingClientRect()
    moving = false
  }
</script>

<div
  class="timeline-container"
  bind:this={container}
  use:resizeObserver={() => {
    time.timelineBox = container.getBoundingClientRect()
    time.viewBox = viewbox.getBoundingClientRect()
  }}
>
  <div class="timeline-header">
    <div class="timeline-header__title" style:width={`${panelWidth}px`}>
      <Button
        label={ui.string.Today}
        on:click={() => {
          time.offsetView = Math.floor(time.viewBox.width / 2)
        }}
      />
    </div>
    <div class="timeline-header__time" bind:this={viewbox}>
      <div class="timeline-header__time-content" style:transform={`translateX(${time.offsetView}px)`}>
        {#if time.months}
          {#each time.months as month}
            <div class="month firstLetter" style:left={`${month.x}px`}>
              {#if month.date.getMonth() === 0}
                <b class="caption-color">{month.date.getFullYear()}</b>
              {/if}
              <span style="firstLetter">{month.label}</span>
            </div>
          {/each}
        {/if}
        {#if time.days}
          {#each time.days as day}
            <div class="day" style:left={`${day.x}px`}>{day.label}</div>
          {/each}
        {/if}
        <div class="cursor" style:left={`${time.todayMarker.x}px`}>{time.todayMarker.date.getDate()}</div>
        <!-- {#if time.cursorMarker}
          <div class="cursor" style:left={`${time.cursorMarker.x}px`}>{time.cursorMarker.label}</div>
        {/if} -->
      </div>
    </div>
  </div>
  <div class="timeline-background__headers" style:width={`${panelWidth}px`} />
  <div class="timeline-background__viewbox" style:left={`${panelWidth}px`}>
    <div class="timeline-wrapped__content" style:transform={`translateX(${time.offsetView}px)`}>
      {#if time.months}
        {#each time.months as month}
          <div class="timeline-marker__month" style:left={`${month.x}px`} />
        {/each}
      {/if}
    </div>
  </div>
  {#if lines}
    <Scroller bind:this={scroller}>
      {#each lines as line, row}
        {@const rangeRow = time.rows ? time.rows[row] : null}
        <div
          class="timeline-row__container"
          class:checked={selectedRows.find((x) => x === row) !== undefined}
          class:hovered={selectedRow === row}
          on:focus={() => {}}
          on:mousemove={(ev) => {
            if (row !== selectedRow) handleRowFocused(row)
            ev.preventDefault()
          }}
        >
          <div class="timeline-row__header-wrapper" style:width={`${panelWidth}px`}>
            <div class="timeline-row__header-item">
              <div class="timeline-row__checkbox">
                <CheckBox
                  checked={selectedRows.filter((i) => i === row).length > 0}
                  on:value={(event) => onObjectChecked(row, event.detail)}
                />
              </div>
            </div>
            <slot {row} />
          </div>
          <div class="timeline-row__content-wrapper" class:nullRow={rangeRow === null && !moving}>
            <div class="timeline-wrapped__content" style:transform={`translateX(${time.offsetView}px)`}>
              {#if line.items}
                {#each line.items as item}
                  {#if item.startDate}
                    {@const target = item.targetDate ?? item.startDate + NOT_ENDED}
                    <div
                      class="timeline-item__container"
                      class:noTarget={item.targetDate === null}
                      style:left={`${getOffsetByDate(item.startDate)}px`}
                      style:right={`${getOffsetByDate(target) + dayWidth - 1}px`}
                      style:width={`${getOffsetByDate(target) - getOffsetByDate(item.startDate) + dayWidth - 1}px`}
                    >
                      <div class="timeline-item__presenter">
                        {#if item.icon}
                          <Icon icon={item.icon} size={item.iconSize ?? 'small'} iconProps={item.iconProps} />
                        {/if}
                        {#if item.presenter}<svelte:component this={item.presenter} {...item.props} />{/if}
                        {#if item.label}<span>{item.label}</span>{/if}
                      </div>
                    </div>
                  {/if}
                {/each}
              {/if}
            </div>
            {#if line.items}
              {#if rangeRow !== null && -time.offsetView + time.viewBox.width < rangeRow.min.x}
                <button
                  transition:fly={{ duration: 150, x: 50, opacity: 0 }}
                  class="timeline-action__button right"
                  on:click={() => {
                    if (rangeRow !== null) time.offsetView = -getOffsetByDate(rangeRow.min.date) + dayWidth * 5
                  }}
                >
                  <IconArrowRight size={'small'} />
                </button>
              {/if}
              {#if rangeRow !== null && -time.offsetView > rangeRow.max.x}
                <button
                  transition:fly={{ duration: 150, x: -50, opacity: 0 }}
                  class="timeline-action__button left"
                  on:click={() => {
                    if (rangeRow !== null) time.offsetView = -getOffsetByDate(rangeRow.min.date) + dayWidth * 5
                  }}
                >
                  <IconArrowLeft size={'small'} />
                </button>
              {/if}
            {/if}
            {#if rangeRow === null && selectedRow === row && time.cursorMarker && !moving}
              <button class="timeline-action__button add" style:left={`${time.offsetView + time.cursorMarker.x}px`}>
                <IconAdd size={'small'} />
              </button>
            {/if}
          </div>
        </div>
      {/each}
    </Scroller>
    <div class="timeline-foreground__viewbox" style:left={`${panelWidth}px`}>
      <div class="timeline-wrapped__content" style:transform={`translateX(${time.offsetView}px)`}>
        <div class="timeline-marker__today" style:left={`${time.todayMarker.x}px`} />
      </div>
    </div>
  {/if}
  <div class="timeline-splitter" class:moving style:left={`${panelWidth}px`} on:mousedown={splitterStart} />
</div>
