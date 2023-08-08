<!--
// Copyright © 2022, 2023 Hardcore Engineering Inc.
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
  import { Employee } from '@hcengineering/contact'
  import contact from '@hcengineering/contact'
  import { AccountRole, getCurrentAccount, Ref } from '@hcengineering/core'
  import { tzDateCompare, type Department, type Request, type RequestType, type Staff } from '@hcengineering/hr'
  import {
    areDatesEqual,
    day as getDay,
    daysInMonth,
    eventToHTMLElement,
    getWeekDayName,
    isWeekend,
    Label,
    LabelAndProps,
    Scroller,
    showPopup,
    tooltip,
    deviceOptionsStore as deviceInfo
  } from '@hcengineering/ui'
  import hr from '../../plugin'
  import { getHolidayDatesForEmployee, getRequests, isHoliday } from '../../utils'
  import CreateRequest from '../CreateRequest.svelte'
  import RequestsPopup from '../RequestsPopup.svelte'
  import CreatePublicHoliday from './CreatePublicHoliday.svelte'
  import ScheduleRequest from './ScheduleRequest.svelte'
  import StaffPresenter from './StaffPresenter.svelte'

  const headerHeightRem = 4.375
  const eventHeightRem = 1.5
  const eventMarginRem = 0.5
  const minColWidthRem = 2.5
  const minRowHeightRem = 4.375

  interface TimelineElement {
    request: Request
    date: number
    dueDate: number
    length: number
  }

  interface TimelineRowTrack {
    elements: TimelineElement[]
  }

  interface TimelineRow {
    employee: Staff
    requests: Request[]
    tracks: TimelineRowTrack[]
  }

  export let currentDate: Date = new Date()

  export let startDate: Date
  export let endDate: Date

  export let departmentStaff: Staff[]
  export let department: Ref<Department>
  export let departmentById: Map<Ref<Department>, Department>

  export let employeeRequests: Map<Ref<Staff>, Request[]>
  export let editableList: Ref<Employee>[]

  export let staffDepartmentMap: Map<Ref<Staff>, Department[]>
  export let holidays: Map<Ref<Department>, Date[]>

  const todayDate = new Date()

  const noWeekendHolidayType: Ref<RequestType>[] = [hr.ids.PTO, hr.ids.PTO2, hr.ids.Vacation]

  function checkConflict(request1: Request, request2: Request): boolean {
    return (
      tzDateCompare(request1.tzDate, request2.tzDueDate) <= 0 && tzDateCompare(request1.tzDueDate, request2.tzDate) >= 0
    )
  }

  function getMonthDate(request: Request): number {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    return request.tzDate.year === year && request.tzDate.month === month ? request.tzDate.day : startDate.getDate()
  }

  function getMonthDueDate(request: Request): number {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    return request.tzDueDate.year === year && request.tzDueDate.month === month
      ? request.tzDueDate.day
      : endDate.getDate()
  }

  function getOrderedEmployeeRequests(employee: Staff): Request[] {
    const requests = getRequests(employeeRequests, startDate, endDate, employee._id)
    requests.sort((a, b) => {
      const res = tzDateCompare(a.tzDate, b.tzDate)
      if (res === 0) {
        return tzDateCompare(a.tzDueDate, b.tzDueDate)
      }
      return res
    })
    return requests
  }

  function buildTimelineRows(): TimelineRow[] {
    const res: TimelineRow[] = []

    for (const employee of departmentStaff) {
      const tracks: TimelineRowTrack[] = []

      const requests = getOrderedEmployeeRequests(employee)
      for (const request of requests) {
        let found: TimelineRowTrack | undefined = undefined

        for (const track of tracks) {
          const conflict = track.elements.some((it) => checkConflict(request, it.request))
          if (!conflict) {
            found = track
            break
          }
        }

        if (found === undefined) {
          found = { elements: [] }
          tracks.push(found)
        }

        const date = getMonthDate(request)
        const dueDate = getMonthDueDate(request)

        found.elements.push({
          request,
          date,
          dueDate,
          length: dueDate - date + 1
        })
      }

      res.push({ employee, requests, tracks })
    }
    return res
  }

  function createRequest(e: MouseEvent, date: Date, staff: Staff): void {
    if (!isEditable(staff)) return
    const readonly = editableList.length === 1

    e.preventDefault()
    e.stopPropagation()
    showPopup(
      CreateRequest,
      {
        staff,
        date,
        readonly,
        employeeRequests,
        docQuery: { active: true, $search: editableList.join(' | ') }
      },
      eventToHTMLElement(e)
    )
  }

  function isFutureDate() {
    const today = new Date(Date.now())
    return (
      currentDate >= today ||
      (currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear())
    )
  }

  function isEditable(employee: Staff): boolean {
    return editableList.includes(employee._id) && (isFutureDate() || getCurrentAccount().role === AccountRole.Owner)
  }

  function getTooltip(requests: Request[], day: Date, staff: Staff): LabelAndProps | undefined {
    if (requests.length === 0) return
    const weekend = isWeekend(day)
    const holiday =
      holidays?.size > 0 && isHoliday(getHolidayDatesForEmployee(staffDepartmentMap, staff._id, holidays), day)
    if (day && (weekend || holiday) && requests.some((req) => noWeekendHolidayType.includes(req.type))) {
      return
    }
    return {
      component: RequestsPopup,
      props: { requests: requests.map((it) => it._id) }
    }
  }

  function setPublicHoliday(date: Date) {
    showPopup(CreatePublicHoliday, { date, department })
  }

  function getRowHeight(row: TimelineRow): number {
    const height = row.tracks.length * (eventHeightRem + eventMarginRem) - eventMarginRem + 2
    return Math.max(height, minRowHeightRem)
  }

  function getColumnWidth(gridWidth: number, currentDate: Date): number {
    const width = gridWidth / daysInMonth(currentDate)
    return Math.max(width, minColWidthRem)
  }

  export function getCellStyle(): string {
    return `width: ${columnWidthRem}rem;`
  }

  export function getRowStyle(row: TimelineRow): string {
    const height = getRowHeight(row)
    return `height: ${height}rem;`
  }

  export function getElementStyle(element: TimelineElement, trackIndex: number): string {
    const left = (element.date - 1) * columnWidthRem
    const top = trackIndex * (eventHeightRem + eventMarginRem)
    const width = columnWidthRem * element.length
    return `
      left: ${left}rem;
      top: ${top}rem;
      width: ${width}rem;
    `
  }

  let headerWidth: number
  $: headerWidthRem = headerWidth / $deviceInfo.fontSize

  let containerWidth: number
  $: containerWidthRem = containerWidth / $deviceInfo.fontSize

  $: values = [...Array(daysInMonth(currentDate)).keys()]

  $: columnWidthRem = getColumnWidth(containerWidthRem - headerWidthRem, currentDate)

  let rows: TimelineRow[]
  $: departmentStaff, employeeRequests, (rows = buildTimelineRows())
</script>

{#if rows.length}
  {@const dep = departmentById.get(department)}

  <Scroller horizontal fade={{ multipler: { top: headerHeightRem, left: headerWidthRem } }} noFade>
    <div bind:clientWidth={containerWidth} class="timeline">
      {#key [containerWidthRem, columnWidthRem, headerWidthRem]}
        <!-- Resource Header -->
        <div bind:clientWidth={headerWidth} class="timeline-header timeline-resource-header">
          <div class="timeline-row">
            <div class="timeline-resource-cell">
              <div class="timeline-resource-header__title">
                {dep?.name}
              </div>
              <div class="timeline-resource-header__subtitle">
                <Label label={contact.string.NumberMembers} params={{ count: rows.length }} />
              </div>
            </div>
          </div>
        </div>

        <!-- Resource Content -->
        <div bind:clientWidth={headerWidth} class="timeline-resource-content">
          {#each rows as row}
            <div class="timeline-row" style={getRowStyle(row)}>
              <div class="timeline-resource-cell">
                <StaffPresenter value={row.employee} />
              </div>
            </div>
          {/each}
        </div>

        <!-- Grid Header -->
        <div class="timeline-header timeline-grid-header">
          <div class="timeline-row flex">
            {#each values as value}
              {@const day = getDay(startDate, value)}
              {@const today = areDatesEqual(todayDate, day)}
              <!-- svelte-ignore a11y-click-events-have-key-events -->
              <div
                class="timeline-cell timeline-day-header flex-col-center justify-center"
                style={getCellStyle()}
                on:click={() => isFutureDate() && setPublicHoliday(day)}
              >
                <div
                  class="timeline-day-header__day flex-col-center justify-center"
                  class:timeline-day-header__day--today={today}
                >
                  {day.getDate()}
                </div>
                <div class="timeline-day-header__weekday">{getWeekDayName(day, 'short')}</div>
              </div>
            {/each}
          </div>
        </div>

        <!-- Grid Content -->
        <div class="timeline-grid-content timeline-grid-bg">
          {#each rows as row}
            {@const employee = row.employee}
            {@const tracks = row.tracks}
            {@const editable = isEditable(employee)}

            <div class="timeline-row flex" style={getRowStyle(row)}>
              <div class="timeline-events">
                {#each tracks as track, trackIndex}
                  {#each track.elements as element}
                    {@const request = element.request}
                    <div
                      class="timeline-event-wrapper"
                      style={getElementStyle(element, trackIndex)}
                      use:tooltip={{
                        component: RequestsPopup,
                        props: { requests: [request._id] }
                      }}
                    >
                      <ScheduleRequest {request} {editable} shouldShowDescription={element.length > 1} />
                    </div>
                  {/each}
                {/each}
              </div>

              {#each values as value, i}
                {@const day = getDay(startDate, value)}
                {@const today = areDatesEqual(todayDate, day)}
                {@const weekend = isWeekend(day)}
                {@const holiday = isHoliday(
                  getHolidayDatesForEmployee(staffDepartmentMap, employee._id, holidays),
                  day
                )}
                {@const requests = getRequests(employeeRequests, day, day, employee._id)}
                {@const tooltipValue = getTooltip(requests, day, employee)}

                {#key [tooltipValue, editable]}
                  <!-- svelte-ignore a11y-click-events-have-key-events -->
                  <div
                    class="timeline-cell"
                    class:timeline-cell--today={today}
                    class:timeline-cell--weekend={weekend}
                    class:timeline-cell--holiday={holiday}
                    style={getCellStyle()}
                    use:tooltip={tooltipValue}
                    on:click={(e) => createRequest(e, day, employee)}
                  >
                    {#if today}
                      <div class="timeline-cell-today-marker" />
                    {/if}
                  </div>
                {/key}
              {/each}
            </div>
          {/each}
        </div>
      {/key}
    </div>
  </Scroller>
{:else}
  <div class="flex-center h-full w-full flex-grow fs-title">
    <Label label={hr.string.NoEmployeesInDepartment} />
  </div>
{/if}

<style lang="scss">
  $timeline-row-height: 4.375rem;
  $timeline-header-height: 4.5rem;
  $timeline-column-width: 2rem;

  $timeline-bg-color: var(--theme-comp-header-color);
  $timeline-border-color: var(--theme-bg-divider-color);
  $timeline-border: 1px solid $timeline-border-color;
  $timeline-weekend-stroke-color: var(--theme-calendar-weekend-stroke-color);

  .timeline {
    width: 100%;
    display: grid;
    grid-auto-flow: column;
    grid-template-columns: auto 1fr;
    grid-template-rows: auto 1fr;
  }

  .timeline-header {
    height: $timeline-row-height;
    background-color: $timeline-bg-color;

    .timeline-row {
      height: $timeline-row-height;
      min-height: $timeline-row-height;
    }
  }

  .timeline-header {
    position: sticky;
    top: 0;
    z-index: 1;

    &.timeline-resource-header {
      left: 0;
      z-index: 2;
    }
  }

  .timeline-resource-header__title {
    white-space: nowrap;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .timeline-resource-header__subtitle {
    white-space: nowrap;
    font-size: 0.6875rem;
    font-weight: 400;
    line-height: 1.25rem;
    opacity: 0.4;
  }

  .timeline-resource-content {
    background-color: $timeline-bg-color;

    position: sticky;
    left: 0;
    z-index: 1;
  }

  .timeline-day-header {
    cursor: pointer;

    .timeline-day-header__day {
      width: 1.3125rem;
      height: 1.3125rem;
      font-size: 0.8125rem;
      font-weight: 500;

      &.timeline-day-header__day--today {
        color: white;
        background-color: #3871e0;
        border-radius: 0.375rem;
      }
    }

    .timeline-day-header__weekday {
      font-size: 0.6875rem;
      font-weight: 400;
      line-height: 1.25rem;
      opacity: 0.4;
    }
  }

  .timeline-grid-bg {
    background-image: linear-gradient(
      135deg,
      $timeline-weekend-stroke-color 10%,
      $timeline-bg-color 10%,
      $timeline-bg-color 50%,
      $timeline-weekend-stroke-color 50%,
      $timeline-weekend-stroke-color 60%,
      $timeline-bg-color 60%,
      $timeline-bg-color 100%
    );
    background-size: 7px 7px;
  }

  .timeline-row {
    position: relative;
    height: $timeline-row-height;
    border-bottom: $timeline-border;
  }

  .timeline-events {
    position: absolute;
    width: 100%;
    top: 1em;
    bottom: 1em;
    pointer-events: none;
  }

  .timeline-cell {
    border-right: $timeline-border;

    width: $timeline-column-width;
    height: 100%;

    &:not(.timeline-cell--weekend, .timeline-cell--holiday) {
      background-color: $timeline-bg-color;
    }

    &.timeline-cell--holiday {
      background-color: transparent;
    }

    &.timeline-cell--weekend {
      background-color: transparent;
    }

    &.timeline-cell--today {
      background-color: $timeline-bg-color;
    }

    .timeline-cell-today-marker {
      width: 100%;
      height: 100%;
      background-color: var(--theme-calendar-today-bgcolor);

      pointer-events: none;
    }
  }

  .timeline-resource-cell {
    border-right: $timeline-border;

    width: 100%;
    height: 100%;
    padding: 1rem 2rem;
  }

  .timeline-event-wrapper {
    position: absolute;
    height: 1.5rem;
    padding-left: 0.125rem;
    padding-right: 0.125rem;

    pointer-events: all;
  }
</style>
