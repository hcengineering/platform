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
  import { Employee } from '@hcengineering/contact'
  import { EmployeePresenter } from '@hcengineering/contact-resources'
  import contact from '@hcengineering/contact-resources/src/plugin'
  import { AccountRole, getCurrentAccount, Ref } from '@hcengineering/core'
  import type { Department, Request, RequestType, Staff } from '@hcengineering/hr'
  import {
    areDatesEqual,
    day as getDay,
    daysInMonth,
    eventToHTMLElement,
    floorFractionDigits,
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
  import { EmployeeReports, getHolidayDatesForEmployee, getRequests, getTotal, isHoliday } from '../../utils'
  import CreateRequest from '../CreateRequest.svelte'
  import RequestsPopup from '../RequestsPopup.svelte'
  import ScheduleRequests from '../ScheduleRequests.svelte'
  import ReportsPopup from './ReportsPopup.svelte'
  import CreatePublicHoliday from './CreatePublicHoliday.svelte'

  export let currentDate: Date = new Date()

  export let startDate: Date
  export let endDate: Date

  export let departmentStaff: Staff[]
  export let department: Ref<Department>
  export let departments: Ref<Department>[]

  export let employeeRequests: Map<Ref<Staff>, Request[]>
  export let editableList: Ref<Employee>[]
  export let types: Map<Ref<RequestType>, RequestType>
  export let timeReports: Map<Ref<Employee>, EmployeeReports>

  const todayDate = new Date()

  function createRequest (e: MouseEvent, date: Date, staff: Staff): void {
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

  function isFutureDate () {
    const today = new Date(Date.now())
    return (
      currentDate >= today ||
      (currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear())
    )
  }

  function isEditable (employee: Staff): boolean {
    return editableList.includes(employee._id) && (isFutureDate() || getCurrentAccount().role === AccountRole.Owner)
  }

  const noWeekendHolidayType: Ref<RequestType>[] = [hr.ids.PTO, hr.ids.PTO2, hr.ids.Vacation]

  function getTooltip (requests: Request[], day: Date, staff: Staff): LabelAndProps | undefined {
    if (requests.length === 0) return
    if (
      day &&
      (isWeekend(day) ||
        (holidays?.size > 0 && isHoliday(getHolidayDatesForEmployee(staffDepartmentMap, staff._id, holidays), day))) &&
      requests.some((req) => noWeekendHolidayType.includes(req.type))
    ) {
      return
    }
    return {
      component: RequestsPopup,
      props: { requests: requests.map((it) => it._id) }
    }
  }

  $: values = [...Array(daysInMonth(currentDate)).keys()]

  let hoveredIndex: number = -1
  let hoveredColumn: number = -1

  function findReports (employee: Employee, date: Date, timeReports: Map<Ref<Employee>, EmployeeReports>): number {
    const wday = date.getDate()
    return floorFractionDigits(
      (timeReports.get(employee._id)?.reports ?? [])
        .filter((it) => new Date(it.date ?? 0).getDate() === wday)
        .reduce((a, b) => a + b.value, 0),
      3
    )
  }

  function showReportInfo (employee: Staff, rTime: EmployeeReports | undefined): void {
    if (rTime === undefined) {
      return
    }
    showPopup(ReportsPopup, { employee, reports: rTime.reports }, 'top')
  }

  function setPublicHoliday (date: Date) {
    showPopup(CreatePublicHoliday, { date, department })
  }

  export let staffDepartmentMap: Map<Ref<Staff>, Department[]>
  export let holidays: Map<Ref<Department>, Date[]>

  let colWidth: number
  $: colWidthRem = colWidth / $deviceInfo.fontSize
</script>

{#if departmentStaff.length}
  <Scroller fade={{ multipler: { top: 3, bottom: 3, left: colWidthRem } }} horizontal>
    <table class="scroller-first-column">
      <thead class="scroller-thead">
        <tr class="scroller-thead__tr">
          <th>
            <div class="fullfill center">
              <Label label={contact.string.Employee} />
            </div>
          </th>
          <th>#</th>
          <th>##</th>
          {#each values as value, i}
            {@const day = getDay(startDate, value)}
            <th
              class:today={areDatesEqual(todayDate, day)}
              class:holiday={isHoliday([...holidays.values()].flat(), day)}
              class:weekend={isWeekend(day)}
              class:hoveredCell={hoveredColumn === i}
              on:mousemove={() => {
                hoveredIndex = i
              }}
              on:mouseleave={() => {
                hoveredIndex = -1
              }}
              on:click={() => isFutureDate() && setPublicHoliday(day)}
            >
              {getWeekDayName(day, 'short')}
              <span>{day.getDate()}</span>
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each departmentStaff as employee, row}
          {@const requests = employeeRequests.get(employee._id) ?? []}
          {@const rTime = timeReports.get(employee._id)}
          <tr>
            <td bind:clientWidth={colWidth}>
              <div class="fullfill">
                <EmployeePresenter value={employee} />
              </div>
            </td>
            <td
              class="flex-center p-1 whitespace-nowrap text-center"
              class:firstLine={row === 0}
              class:lastLine={row === departmentStaff.length - 1}
            >
              {getTotal(
                requests,
                startDate,
                endDate,
                types,
                getHolidayDatesForEmployee(staffDepartmentMap, employee._id, holidays)
              )}
            </td>
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <td
              class="p-1 text-center whitespace-nowrap cursor-pointer"
              on:click={() => showReportInfo(employee, rTime)}
            >
              {#if rTime !== undefined}
                {floorFractionDigits(rTime.value, 3)}
                ({rTime.tasks.size})
              {:else}
                0
              {/if}
            </td>
            {#each values as value, i}
              {@const day = getDay(startDate, value)}
              {@const requests = getRequests(employeeRequests, day, day, employee._id)}
              {@const editable = isEditable(employee)}
              {@const tooltipValue = getTooltip(requests, day, employee)}
              {@const ww = findReports(employee, day, timeReports)}
              {#key [tooltipValue, editable]}
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <td
                  class="w-9 max-w-9 min-w-9"
                  class:today={areDatesEqual(todayDate, day)}
                  class:holiday={isHoliday(getHolidayDatesForEmployee(staffDepartmentMap, employee._id, holidays), day)}
                  class:weekend={isWeekend(day) ||
                    isHoliday(getHolidayDatesForEmployee(staffDepartmentMap, employee._id, holidays), day)}
                  class:cursor-pointer={editable}
                  class:hovered={i === hoveredIndex}
                  class:firstLine={row === 0}
                  class:lastLine={row === departmentStaff.length - 1}
                  use:tooltip={tooltipValue}
                  on:click={(e) => createRequest(e, day, employee)}
                  on:mousemove={() => {
                    hoveredColumn = i
                  }}
                  on:mouseleave={() => {
                    hoveredColumn = -1
                  }}
                >
                  <div class:worked={ww > 0} class="h-full w-full">
                    {#if requests.length}
                      <ScheduleRequests
                        {employeeRequests}
                        {departments}
                        {requests}
                        {editable}
                        date={day}
                        {noWeekendHolidayType}
                        {holidays}
                        {employee}
                        {staffDepartmentMap}
                      />
                    {/if}
                  </div>
                </td>
              {/key}
            {/each}
          </tr>
        {/each}
      </tbody>
      <tfoot class="scroller-tfoot">
        <tr>
          <td class="summary">
            <div class="fullfill">
              <Label label={hr.string.Summary} />
            </div>
          </td>
          <td class="flex-center p-1 whitespace-nowrap text-center summary">
            {getTotal(
              Array.from(employeeRequests.values()).flat(),
              startDate,
              endDate,
              types,
              [...holidays.values()].flat()
            )}
          </td>
          <td class="p-1 text-center summary">
            {floorFractionDigits(
              Array.from(timeReports.values())
                .flat()
                .reduce((a, b) => a + b.value, 0),
              3
            )}
          </td>
          {#each values as value, i}
            {@const day = getDay(startDate, value)}
            <td
              class="p-1 text-center summary"
              class:hovered={i === hoveredIndex}
              class:holiday={isHoliday(
                getHolidayDatesForEmployee(staffDepartmentMap, departmentStaff[0]._id, holidays),
                day
              )}
              class:weekend={isWeekend(day)}
              class:today={areDatesEqual(todayDate, day)}
              on:mousemove={() => {
                hoveredColumn = i
              }}
              on:mouseleave={() => {
                hoveredColumn = -1
              }}
            >
              {getTotal([...employeeRequests.values()].flat(), day, day, types, [...holidays.values()].flat())}
            </td>
          {/each}
        </tr>
      </tfoot>
    </table>
  </Scroller>
{:else}
  <div class="flex-center h-full w-full flex-grow fs-title">
    <Label label={hr.string.NoEmployeesInDepartment} />
  </div>
{/if}

<style lang="scss">
  table {
    position: relative;
    width: 100%;

    td,
    th {
      width: 2rem;
      min-width: 1.5rem;
      border: none;
      &:first-child {
        width: 15rem;
      }
    }
    th {
      flex-shrink: 0;
      padding: 0;
      height: 3rem;
      min-height: 3rem;
      max-height: 3rem;
      text-transform: uppercase;
      font-weight: 500;
      font-size: 0.75rem;
      line-height: 105%;
      color: var(--theme-halfcontent-color);
      box-shadow: inset 0 -1px 0 0 var(--theme-divider-color);
      user-select: none;
      cursor: pointer;

      span {
        display: block;
        font-weight: 600;
        font-size: 1rem;
      }
      &.today {
        color: var(--theme-calendar-today-color);
      }
      &.holiday:not(.today) {
        color: var(--theme-calendar-holiday-color);
      }
      &.weekend:not(.today) {
        color: var(--theme-calendar-weekend-color);
      }
      &.hoveredCell {
        background-color: var(--theme-button-pressed);
      }
    }
    td {
      height: 3.5rem;
      border: none;
      color: var(--caption-color);
      &.today {
        background-color: var(--theme-calendar-today-bgcolor);
      }
      &.summary {
        font-weight: 600;
      }
      &.weekend:not(.today) {
        background-color: var(--theme-calendar-weekend-bgcolor);
      }
      &.holiday:not(.today) {
        background-color: var(--theme-calendar-holiday-bgcolor);
      }
    }
    td:not(:last-child) {
      border-right: 1px solid var(--theme-bg-divider-color);
    }

    tbody tr:not(:last-child),
    thead th:first-child .fullfill,
    tfoot tr {
      border-bottom: 1px solid var(--theme-bg-divider-color);
    }
    tfoot tr,
    tfoot tr td:first-child .fullfill {
      box-shadow: inset 0 1px 0 0 var(--theme-divider-color);
    }
    tfoot tr,
    tfoot tr td {
      height: 3rem;
    }

    tr.scroller-thead__tr:not(:last-child) {
      border-right: 1px solid var(--theme-bg-divider-color);
    }

    .hovered {
      position: relative;

      &::after {
        position: absolute;
        content: '';
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: var(--theme-caption-color);
        opacity: 0.15;
      }
    }
  }
  .worked {
    background-color: var(--highlight-select);
  }
</style>
