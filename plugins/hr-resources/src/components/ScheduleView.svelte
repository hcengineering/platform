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
  import { getCurrentAccount, Ref, Timestamp } from '@anticrm/core'
  import type { Department, Request, RequestType, Staff } from '@anticrm/hr'
  import { createQuery } from '@anticrm/presentation'
  import {
    Label,
    daysInMonth,
    isWeekend,
    areDatesEqual,
    day as getDay,
    getWeekDayName,
    showPopup,
    eventToHTMLElement,
    Scroller,
    tooltip,
    LabelAndProps
  } from '@anticrm/ui'
  import { EmployeePresenter } from '@anticrm/contact-resources'
  import { CalendarMode } from '@anticrm/calendar-resources'
  import contact from '@anticrm/contact-resources/src/plugin'
  import hr from '../plugin'
  import { Employee, EmployeeAccount } from '@anticrm/contact'
  import CreateRequest from './CreateRequest.svelte'
  import ScheduleRequests from './ScheduleRequests.svelte'
  import RequestsPopup from './RequestsPopup.svelte'

  export let department: Ref<Department>
  export let descendants: Map<Ref<Department>, Department[]>
  export let departmentById: Map<Ref<Department>, Department>
  export let currentDate: Date = new Date()
  export let mode: CalendarMode

  $: startDate = new Date(
    new Date(mode === CalendarMode.Year ? new Date(currentDate).setMonth(1) : currentDate).setDate(1)
  ).setHours(0, 0, 0, 0)
  $: endDate =
    mode === CalendarMode.Year
      ? new Date(startDate).setFullYear(new Date(startDate).getFullYear() + 1)
      : new Date(startDate).setMonth(new Date(startDate).getMonth() + 1)
  $: departments = [department, ...getDescendants(department, descendants)]

  const lq = createQuery()
  const typeQuery = createQuery()
  const staffQuery = createQuery()
  let staff: Staff[] = []
  let types: Map<Ref<RequestType>, RequestType> = new Map<Ref<RequestType>, RequestType>()

  typeQuery.query(hr.class.RequestType, {}, (res) => {
    types = new Map(
      res.map((type) => {
        return [type._id, type]
      })
    )
  })

  staffQuery.query(hr.mixin.Staff, {}, (res) => {
    staff = res
  })

  let employeeRequests = new Map<Ref<Staff>, Request[]>()

  function getDescendants (
    department: Ref<Department>,
    descendants: Map<Ref<Department>, Department[]>
  ): Ref<Department>[] {
    const res = (descendants.get(department) ?? []).map((p) => p._id)
    for (const department of res) {
      res.push(...getDescendants(department, descendants))
    }
    return res
  }

  function update (departments: Ref<Department>[], startDate: Timestamp, endDate: Timestamp) {
    lq.query(
      hr.class.Request,
      {
        dueDate: { $gte: startDate },
        date: { $lt: endDate },
        space: { $in: departments }
      },
      (res) => {
        employeeRequests.clear()
        for (const request of res) {
          const requests = employeeRequests.get(request.attachedTo) ?? []
          requests.push(request)
          employeeRequests.set(request.attachedTo, requests)
        }
        employeeRequests = employeeRequests
      }
    )
  }

  $: update(departments, startDate, endDate)

  const todayDate = new Date()

  function getRequests (employee: Ref<Staff>, date: Date): Request[] {
    const requests = employeeRequests.get(employee)
    if (requests === undefined) return []
    const res: Request[] = []
    const time = date.getTime()
    const endTime = getEndDate(date)
    for (const request of requests) {
      if (request.date < endTime && request.dueDate > time) {
        res.push(request)
      }
    }
    return res
  }

  function createRequest (e: MouseEvent, date: Date, staff: Staff): void {
    if (!isEditable(staff)) return
    e.preventDefault()
    e.stopPropagation()
    showPopup(
      CreateRequest,
      {
        staff,
        date
      },
      eventToHTMLElement(e)
    )
  }

  const currentEmployee = (getCurrentAccount() as EmployeeAccount).employee

  function getTeamLead (_id: Ref<Department>): Ref<Employee> | undefined {
    const department = departmentById.get(_id)
    if (department === undefined) return
    if (department.teamLead != null) return department.teamLead
    return getTeamLead(department.space)
  }

  function isEditable (employee: Staff): boolean {
    if (employee._id === currentEmployee) return true
    const lead = getTeamLead(employee.department)
    return lead === currentEmployee
  }

  function getEndDate (date: Date): number {
    return mode === CalendarMode.Year
      ? new Date(date).setMonth(date.getMonth() + 1)
      : new Date(date).setDate(date.getDate() + 1)
  }

  function getTooltip (requests: Request[], employee: Staff, date: Date): LabelAndProps | undefined {
    if (requests.length === 0) return
    const endDate = getEndDate(date)
    return {
      component: RequestsPopup,
      props: { date, endDate, employee: employee._id }
    }
  }

  $: departmentStaff = staff.filter((p) => departments.includes(p.department) || employeeRequests.has(p._id))

  $: values = [...Array(mode === CalendarMode.Year ? 12 : daysInMonth(currentDate)).keys()]

  function getMonthName (date: Date): string {
    return new Intl.DateTimeFormat('default', { month: 'long' }).format(date)
  }
  function getMonth (date: Date, m: number): Date {
    date = new Date(date)
    date.setDate(1)
    date.setMonth(m)
    return date
  }

  function getTotal (requests: Request[]): number {
    let total = 0
    for (const request of requests) {
      const type = types.get(request.type)
      const days = (request.dueDate - request.date) / 1000 / 60 / 60 / 24
      total += Math.ceil(days) * (type?.value ?? 0)
    }
    return total
  }

  let hoveredIndex: number = -1
</script>

{#if departmentStaff.length}
  <Scroller tableFade>
    <table>
      <thead class="scroller-thead">
        <tr class="scroller-thead__tr">
          <th>
            <Label label={contact.string.Employee} />
          </th>
          {#each values as value, i}
            {#if mode === CalendarMode.Year}
              {@const month = getMonth(currentDate, value)}
              <th
                class="fixed"
                class:today={month.getFullYear() === todayDate.getFullYear() &&
                  month.getMonth() === todayDate.getMonth()}
                on:mousemove={() => {
                  hoveredIndex = i
                }}
                on:mouseleave={() => {
                  hoveredIndex = -1
                }}
              >
                {getMonthName(month)}
              </th>
            {:else}
              {@const day = getDay(new Date(startDate), value)}
              <th
                class:today={areDatesEqual(todayDate, day)}
                class:weekend={isWeekend(day)}
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
            {/if}
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each departmentStaff as employee, row}
          <tr>
            <td>
              <EmployeePresenter value={employee} />
            </td>
            {#each values as value, i}
              {#if mode === CalendarMode.Year}
                {@const month = getMonth(currentDate, value)}
                {@const requests = getRequests(employee._id, month)}
                {@const tooltipValue = getTooltip(requests, employee, month)}
                {#key tooltipValue}
                  <td
                    class:today={month.getFullYear() === todayDate.getFullYear() &&
                      month.getMonth() === todayDate.getMonth()}
                    class="fixed"
                    use:tooltip={tooltipValue}
                  >
                    <div class="flex-center">
                      {getTotal(requests)}
                    </div>
                  </td>
                {/key}
              {:else}
                {@const date = getDay(new Date(startDate), value)}
                {@const requests = getRequests(employee._id, date)}
                {@const editable = isEditable(employee)}
                {@const tooltipValue = getTooltip(requests, employee, date)}
                {#key [tooltipValue, editable]}
                  <td
                    class:today={areDatesEqual(todayDate, date)}
                    class:weekend={isWeekend(date)}
                    class:cursor-pointer={editable}
                    class:hovered={i === hoveredIndex}
                    class:firstLine={row === 0}
                    class:lastLine={row === departmentStaff.length - 1}
                    use:tooltip={tooltipValue}
                    on:click={(e) => createRequest(e, date, employee)}
                  >
                    {#if requests.length}
                      <ScheduleRequests {requests} {date} {editable} />
                    {/if}
                  </td>
                {/key}
              {/if}
            {/each}
          </tr>
        {/each}
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
      width: auto;
      width: 2rem;
      min-width: 1.5rem;
      border: none;
      &.fixed {
        width: 5rem;
        padding: 0 0.125rem;
        hyphens: auto;
      }
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
    }
    td {
      height: 3.5rem;
      border: none;
      color: var(--caption-color);
      &.today {
        background-color: var(--theme-bg-accent-hover);
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
</style>
