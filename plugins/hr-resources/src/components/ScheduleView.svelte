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
  import type { Department, Request, Staff } from '@anticrm/hr'
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

  $: startDate = new Date(new Date(currentDate).setDate(1)).setHours(0, 0, 0, 0)
  $: endDate = new Date(startDate).setMonth(new Date(startDate).getMonth() + 1)
  $: departments = [department, ...getDescendants(department, descendants)]

  const lq = createQuery()
  const staffQuery = createQuery()
  let staff: Staff[] = []

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
    const endTime = new Date(date).setDate(date.getDate() + 1)
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

  function getTooltip (employee: Staff, date: Date): LabelAndProps | undefined {
    const requests = getRequests(employee._id, date)
    if (requests.length === 0) return
    return {
      component: RequestsPopup,
      props: { date, employee: employee._id }
    }
  }

  $: departmentStaff = staff.filter((p) => departments.includes(p.department) || employeeRequests.has(p._id))
</script>

{#if departmentStaff.length}
  <Scroller>
    <table>
      <thead class="scroller-thead">
        <tr class="scroller-thead__tr">
          <th>
            <Label label={contact.string.Employee} />
          </th>
          {#each [...Array(daysInMonth(currentDate)).keys()] as dayOfMonth}
            {@const day = getDay(new Date(startDate), dayOfMonth)}
            <th class:today={areDatesEqual(todayDate, day)} class:weekend={isWeekend(day)}>
              <div class="cursor-pointer uppercase flex-col-center">
                <div class="flex-center">{getWeekDayName(day, 'short')}</div>
                <div class="flex-center">{day.getDate()}</div>
              </div>
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each departmentStaff as employee}
          <tr>
            <td>
              <EmployeePresenter value={employee} />
            </td>
            {#each [...Array(daysInMonth(currentDate)).keys()] as dayOfMonth}
              {@const date = getDay(new Date(startDate), dayOfMonth)}
              {@const requests = getRequests(employee._id, date)}
              {@const editable = isEditable(employee)}
              <td
                class:today={areDatesEqual(todayDate, date)}
                class:weekend={isWeekend(date)}
                class:cursor-pointer={editable}
                use:tooltip={getTooltip(employee, date)}
                on:click={(e) => createRequest(e, date, employee)}
              >
                {#if requests.length}
                  <ScheduleRequests {requests} {date} {editable} />
                {/if}
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </Scroller>
{:else}
  <div class="flex-center h-full flex-grow fs-title">
    <Label label={hr.string.NoEmployeesInDepartment} />
  </div>
{/if}

<style lang="scss">
  table {
    border-collapse: collapse;
    table-layout: fixed;
    width: auto;
    position: relative;

    td,
    th {
      width: auto;
      min-width: 1rem;
      &:first-child {
        width: 15rem;
        padding: 0.5rem;
      }
    }
    th {
      padding: 0.5rem;
      height: 2.5rem;
      font-weight: 500;
      font-size: 0.75rem;
      color: var(--dark-color);
      box-shadow: inset 0 -1px 0 0 var(--divider-color);
      user-select: none;
      &.today {
        color: var(--caption-color);
      }
      &.weekend:not(.today) {
        color: var(--warning-color);
      }
    }
    td {
      height: 3.5rem;
      border: 1px solid var(--divider-color);
      color: var(--caption-color);
      &.today {
        background-color: var(--theme-bg-accent-hover);
      }
      &.weekend:not(.today) {
        background-color: var(--theme-bg-accent-color);
      }
    }
  }
</style>
