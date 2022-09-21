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
  import { CalendarMode } from '@hcengineering/calendar-resources'
  import { Employee } from '@hcengineering/contact'
  import { Ref } from '@hcengineering/core'
  import type { Department, Request, RequestType, Staff } from '@hcengineering/hr'
  import { createQuery } from '@hcengineering/presentation'
  import { Label } from '@hcengineering/ui'
  import hr from '../plugin'
  import MonthTableView from './schedule/MonthTableView.svelte'
  import MonthView from './schedule/MonthView.svelte'
  import YearView from './schedule/YearView.svelte'

  export let department: Ref<Department>
  export let descendants: Map<Ref<Department>, Department[]>
  export let departmentById: Map<Ref<Department>, Department>
  export let currentDate: Date = new Date()
  export let mode: CalendarMode
  export let display: 'chart' | 'stats'

  $: startDate = new Date(
    new Date(mode === CalendarMode.Year ? new Date(currentDate).setMonth(1) : currentDate).setDate(1)
  )
  $: endDate = new Date(
    mode === CalendarMode.Year
      ? new Date(new Date(startDate).setFullYear(new Date(startDate).getFullYear() + 1)).setDate(-1)
      : new Date(new Date(startDate).setMonth(new Date(startDate).getMonth() + 1)).setDate(-1)
  )
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

  staffQuery.query(
    hr.mixin.Staff,
    {},
    (res) => {
      staff = res
    },
    { sort: { name: 1 } }
  )

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

  function update (departments: Ref<Department>[], startDate: Date, endDate: Date) {
    lq.query(
      hr.class.Request,
      {
        'tzDueDate.year': { $gte: startDate.getFullYear() },
        'tzDueDate.month': { $gte: startDate.getMonth() },
        'tzDate.year': { $lte: endDate.getFullYear() },
        'tzDate.month': { $lte: endDate.getMonth() },
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

  function getTeamLead (_id: Ref<Department>): Ref<Employee> | undefined {
    const department = departmentById.get(_id)
    if (department === undefined) return
    if (department.teamLead != null) return department.teamLead
    return getTeamLead(department.space)
  }

  $: departmentStaff = staff.filter((p) => departments.includes(p.department) || employeeRequests.has(p._id))
</script>

{#if departmentStaff.length}
  {#if mode === CalendarMode.Year}
    <YearView {departmentStaff} {employeeRequests} {types} {currentDate} />
  {:else if mode === CalendarMode.Month}
    {#if display === 'chart'}
      <MonthView
        {departmentStaff}
        {employeeRequests}
        {types}
        {startDate}
        teamLead={getTeamLead(department)}
        {currentDate}
      />
    {:else if display === 'stats'}
      <MonthTableView {departmentStaff} {employeeRequests} {types} {currentDate} />
    {/if}
  {/if}
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
