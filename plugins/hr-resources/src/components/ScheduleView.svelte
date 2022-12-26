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
  import { Employee, EmployeeAccount } from '@hcengineering/contact'
  import { getCurrentAccount, Ref } from '@hcengineering/core'
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
    new Date(mode === CalendarMode.Year ? new Date(currentDate).setMonth(0) : currentDate).setDate(1)
  )
  $: endDate = new Date(
    mode === CalendarMode.Year
      ? new Date(new Date(startDate).setFullYear(new Date(startDate).getFullYear() + 1)).setDate(0)
      : new Date(new Date(startDate).setMonth(new Date(startDate).getMonth() + 1)).setDate(0)
  )
  $: departments = [department, ...getDescendants(department, descendants)]

  const lq = createQuery()
  const typeQuery = createQuery()
  const staffQuery = createQuery()
  const currentEmployee = (getCurrentAccount() as EmployeeAccount).employee

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

  let departmentStaff: Staff[]
  let editableList: Ref<Employee>[] = []

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
          if (request.attachedTo) {
            employeeRequests.set(request.attachedTo, requests)
          }
        }
        employeeRequests = employeeRequests
      }
    )
  }

  $: update(departments, startDate, endDate)

  function updateEditableList () {
    editableList = []
    departmentById.forEach((department) => {
      if (department.teamLead === currentEmployee) {
        const departmentIds = [department._id]
        departmentIds.concat(getDescendants(department._id, descendants)).forEach((id) => {
          editableList.push(
            ...Array.from(
              departmentStaff.filter((p) => p.department === id),
              (s) => s._id
            )
          )
        })
      }
    })
    if (departmentStaff.filter((p) => p._id === currentEmployee).length > 0) {
      editableList.push(currentEmployee)
    }
    editableList = [...new Set(editableList)]
  }

  function updateStaff (staff: Staff[], departments: Ref<Department>[], employeeRequests: Map<Ref<Staff>, Request[]>) {
    departmentStaff = staff.filter((p) => departments.includes(p.department) || employeeRequests.has(p._id))
    updateEditableList()
  }

  $: updateStaff(staff, departments, employeeRequests)

  const reportQuery = createQuery()

  import tracker from '@hcengineering/tracker'
  import { EmployeeReports } from '../utils'

  let timeReports: Map<Ref<Employee>, EmployeeReports> = new Map()

  $: reportQuery.query(
    tracker.class.TimeSpendReport,
    {
      employee: { $in: Array.from(staff.map((it) => it._id)) },
      date: { $gt: startDate.getTime(), $lt: endDate.getTime() }
    },
    (res) => {
      const newMap = new Map<Ref<Employee>, EmployeeReports>()
      for (const r of res) {
        if (r.employee != null) {
          const or = newMap.get(r.employee)
          newMap.set(r.employee, { value: (or?.value ?? 0) + r.value, reports: [...(or?.reports ?? []), r] })
        }
      }
      timeReports = newMap
    },
    {
      lookup: {
        _id: {
          attachedTo: tracker.class.Issue
        }
      }
    }
  )
</script>

{#if departmentStaff.length}
  {#if mode === CalendarMode.Year}
    <YearView {departmentStaff} {employeeRequests} {types} {currentDate} />
  {:else if mode === CalendarMode.Month}
    {#if display === 'chart'}
      <MonthView {departmentStaff} {employeeRequests} {types} {startDate} {editableList} {currentDate} {timeReports} />
    {:else if display === 'stats'}
      <MonthTableView {departmentStaff} {employeeRequests} {types} {currentDate} {timeReports} />
    {/if}
  {/if}
{:else}
  <div class="flex-center h-full w-full flex-grow fs-title">
    <Label label={hr.string.NoEmployeesInDepartment} />
  </div>
{/if}
