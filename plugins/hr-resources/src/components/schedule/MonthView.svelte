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
  import { Employee, EmployeeAccount } from '@hcengineering/contact'
  import { EmployeePresenter } from '@hcengineering/contact-resources'
  import contact from '@hcengineering/contact-resources/src/plugin'
  import { getCurrentAccount, Ref } from '@hcengineering/core'
  import type { Request, RequestType, Staff } from '@hcengineering/hr'
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
    tableSP,
    tooltip
  } from '@hcengineering/ui'
  import hr from '../../plugin'
  import { EmployeeReports, fromTzDate, getTotal } from '../../utils'
  import CreateRequest from '../CreateRequest.svelte'
  import RequestsPopup from '../RequestsPopup.svelte'
  import ScheduleRequests from '../ScheduleRequests.svelte'

  export let currentDate: Date = new Date()

  export let startDate: Date

  export let departmentStaff: Staff[]

  export let employeeRequests: Map<Ref<Staff>, Request[]>
  export let teamLead: Ref<Employee> | undefined
  export let types: Map<Ref<RequestType>, RequestType>
  export let timeReports: Map<Ref<Employee>, EmployeeReports>

  const todayDate = new Date()

  function getRequests (date: Date, employee?: Ref<Staff>): Request[] {
    let requests = undefined
    if (employee) {
      requests = employeeRequests.get(employee)
    } else {
      requests = Array.from(employeeRequests.values()).flat()
    }
    if (requests === undefined) return []
    const res: Request[] = []
    const time = date.getTime()
    const endTime = getEndDate(date)
    for (const request of requests) {
      if (fromTzDate(request.tzDate) <= endTime && fromTzDate(request.tzDueDate) > time) {
        res.push(request)
      }
    }
    return res
  }

  function createRequest (e: MouseEvent, date: Date, staff: Staff): void {
    const readonly: boolean = teamLead !== currentEmployee
    let editStaff: Staff | undefined = staff
    if (readonly) {
      editStaff = departmentStaff.find((p) => p._id === currentEmployee)
      if (!editStaff) {
        return
      }
    }
    e.preventDefault()
    e.stopPropagation()
    showPopup(
      CreateRequest,
      {
        staff: editStaff,
        date,
        readonly
      },
      eventToHTMLElement(e)
    )
  }

  const currentEmployee = (getCurrentAccount() as EmployeeAccount).employee

  function isEditable (employee: Staff): boolean {
    if (employee._id === currentEmployee) return true
    return teamLead === currentEmployee
  }

  function getEndDate (date: Date): number {
    return new Date(date).setDate(date.getDate() + 1)
  }

  function getTooltip (requests: Request[]): LabelAndProps | undefined {
    if (requests.length === 0) return
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
</script>

{#if departmentStaff.length}
  <Scroller fade={tableSP} horizontal>
    <table>
      <thead class="scroller-thead">
        <tr class="scroller-thead__tr">
          <th>
            <Label label={contact.string.Employee} />
          </th>
          <th>#</th>
          <th>##</th>
          {#each values as value, i}
            {@const day = getDay(startDate, value)}
            <th
              class:today={areDatesEqual(todayDate, day)}
              class:weekend={isWeekend(day)}
              class:hoveredCell={hoveredColumn === i}
              on:mousemove={() => {
                hoveredIndex = i
              }}
              on:mouseleave={() => {
                hoveredIndex = -1
              }}
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
            <td>
              <EmployeePresenter value={employee} />
            </td>
            <td
              class="flex-center p-1 whitespace-nowrap text-center"
              class:firstLine={row === 0}
              class:lastLine={row === departmentStaff.length - 1}
            >
              {getTotal(requests, startDate.getMonth(), types)}
            </td>
            <td class="p-1 text-center">
              {#if rTime !== undefined}
                {floorFractionDigits(rTime.value, 3)}
              {:else}
                0
              {/if}
            </td>
            {#each values as value, i}
              {@const date = getDay(startDate, value)}
              {@const requests = getRequests(date, employee._id)}
              {@const editable = isEditable(employee)}
              {@const tooltipValue = getTooltip(requests)}
              {@const ww = findReports(employee, date, timeReports)}
              {#key [tooltipValue, editable]}
                <td
                  class="w-9 max-w-9 min-w-9"
                  class:today={areDatesEqual(todayDate, date)}
                  class:weekend={isWeekend(date)}
                  class:cursor-pointer={editable}
                  class:hovered={i === hoveredIndex}
                  class:firstLine={row === 0}
                  class:lastLine={row === departmentStaff.length - 1}
                  use:tooltip={tooltipValue}
                  on:click={(e) => createRequest(e, date, employee)}
                  on:mousemove={() => {
                    hoveredColumn = i
                  }}
                  on:mouseleave={() => {
                    hoveredColumn = -1
                  }}
                >
                  <div class:worked={ww > 0} class="h-full w-full">
                    {#if requests.length}
                      <ScheduleRequests {requests} {editable} />
                    {/if}
                  </div>
                </td>
              {/key}
            {/each}
          </tr>
        {/each}
        <tr>
          <td class="summary">
            <Label label={hr.string.Summary} />
          </td>
          <td class="flex-center p-1 whitespace-nowrap text-center summary">
            {getTotal(Array.from(employeeRequests.values()).flat(), startDate.getMonth(), types)}
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
            {@const date = getDay(startDate, value)}
            {@const requests = getRequests(date)}
            <td
              class="p-1 text-center summary"
              class:hovered={i === hoveredIndex}
              class:weekend={isWeekend(date)}
              class:today={areDatesEqual(todayDate, date)}
              on:mousemove={() => {
                hoveredColumn = i
              }}
              on:mouseleave={() => {
                hoveredColumn = -1
              }}
            >
              {getTotal(requests, startDate.getMonth(), types)}
            </td>
          {/each}
        </tr>
      </tbody>
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
        padding: 0.5rem;
      }
    }
    th {
      flex-shrink: 0;
      padding: 0;
      height: 2.5rem;
      min-height: 2.5rem;
      max-height: 2.5rem;
      text-transform: uppercase;
      font-weight: 500;
      font-size: 0.75rem;
      line-height: 105%;
      color: var(--dark-color);
      box-shadow: inset 0 -1px 0 0 var(--divider-color);
      user-select: none;
      cursor: pointer;

      span {
        display: block;
        font-weight: 600;
        font-size: 1rem;
      }
      &.today {
        color: var(--caption-color);
      }
      &.weekend:not(.today) {
        color: var(--warning-color);
      }
      &.hoveredCell {
        background-color: var(--highlight-select);
      }
    }
    td {
      height: 3.5rem;
      border: none;
      color: var(--caption-color);
      &.today {
        background-color: var(--theme-bg-accent-hover);
      }
      &.summary {
        font-weight: 600;
      }
      &.weekend:not(.today) {
        background-color: var(--theme-bg-accent-color);
      }
    }
    td:not(:last-child) {
      border-right: 1px solid var(--divider-color);
    }
    tr:not(.scroller-thead__tr) {
      border-bottom: 1px solid var(--divider-color);
    }
    tr.scroller-thead__tr:not(:last-child) {
      border-right: 1px solid var(--divider-color);
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
        background-color: var(--caption-color);
        opacity: 0.15;
      }
    }
  }
  .worked {
    background-color: var(--highlight-select);
  }
</style>
