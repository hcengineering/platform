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
  import { Employee, PersonAccount } from '@hcengineering/contact'
  import contact from '@hcengineering/contact-resources/src/plugin'
  import { DocumentQuery, getCurrentAccount, Ref } from '@hcengineering/core'
  import { Department, fromTzDate, Request, RequestType, Staff } from '@hcengineering/hr'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import tracker, { Issue } from '@hcengineering/tracker'
  import { Label } from '@hcengineering/ui'
  import { groupBy } from '@hcengineering/view-resources'
  import hr from '../plugin'
  import { EmployeeReports, getEndDate, getStartDate } from '../utils'
  import MonthTableView from './schedule/MonthTableView.svelte'
  import MonthView from './schedule/MonthView.svelte'
  import YearView from './schedule/YearView.svelte'

  export let department: Ref<Department>
  export let descendants: Map<Ref<Department>, Department[]>
  export let departmentById: Map<Ref<Department>, Department>
  export let currentDate: Date = new Date()
  export let mode: CalendarMode
  export let display: 'chart' | 'stats'
  export let staffQuery: DocumentQuery<Staff> = {}

  $: startDate =
    mode === CalendarMode.Year
      ? getStartDate(currentDate.getFullYear(), 0)
      : getStartDate(currentDate.getFullYear(), currentDate.getMonth())

  $: endDate =
    mode === CalendarMode.Year
      ? getEndDate(currentDate.getFullYear(), 11)
      : getEndDate(currentDate.getFullYear(), currentDate.getMonth())

  $: departments = [department, ...getDescendants(department, descendants)]
  $: staffIdsForOpenedDepartments = staff.filter((p) => departments.includes(p.department)).map((p) => p._id)

  const lq = createQuery()
  const typeQuery = createQuery()
  const staffQ = createQuery()
  const currentEmployee = (getCurrentAccount() as PersonAccount).person

  let staff: Staff[] = []
  let requests: Request[] = []
  let types: Map<Ref<RequestType>, RequestType> = new Map<Ref<RequestType>, RequestType>()

  typeQuery.query(hr.class.RequestType, {}, (res) => {
    types = new Map(
      res.map((type) => {
        return [type._id, type]
      })
    )
  })

  $: staffQ.query(
    hr.mixin.Staff,
    staffQuery,
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

  function update (staffIdsForOpenedDepartments: Ref<Staff>[], startDate: Date, endDate: Date) {
    lq.query(
      hr.class.Request,
      {
        'tzDueDate.year': { $gte: startDate.getFullYear() },
        'tzDate.year': { $lte: endDate.getFullYear() },
        attachedTo: { $in: staffIdsForOpenedDepartments }
      },
      (res) => {
        requests = res
      }
    )
  }

  $: update(staffIdsForOpenedDepartments, startDate, endDate)

  function updateRequest (requests: Request[], startDate: Date, endDate: Date) {
    const res = requests.filter(
      (r) => fromTzDate(r.tzDueDate) >= startDate.getTime() && fromTzDate(r.tzDate) <= endDate.getTime()
    )
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

  $: updateRequest(requests, startDate, endDate)

  function pushChilds (
    department: Ref<Department>,
    departmentStaff: Staff[],
    descendants: Map<Ref<Department>, Department[]>
  ): void {
    const staff = departmentStaff.filter((p) => p.department === department)
    editableList.push(...staff.filter((p) => !editableList.includes(p._id)).map((p) => p._id))
    const desc = descendants.get(department) ?? []
    for (const des of desc) {
      pushChilds(des._id, departmentStaff, descendants)
    }
  }

  function isEditable (department: Department): boolean {
    return department.teamLead === currentEmployee || department.managers.includes(currentEmployee)
  }

  function checkDepartmentEditable (
    departmentById: Map<Ref<Department>, Department>,
    department: Ref<Department>,
    departmentStaff: Staff[],
    descendants: Map<Ref<Department>, Department[]>
  ) {
    const dep = departmentById.get(department)
    if (dep === undefined) return
    if (isEditable(dep)) {
      pushChilds(dep._id, departmentStaff, descendants)
    } else {
      const descendantDepartments = descendants.get(dep._id)
      if (descendantDepartments !== undefined) {
        for (const department of descendantDepartments) {
          if (isEditable(department)) {
            pushChilds(department._id, departmentStaff, descendants)
          } else {
            checkDepartmentEditable(departmentById, department._id, departmentStaff, descendants)
          }
        }
      }
    }
  }

  function updateEditableList (
    departmentById: Map<Ref<Department>, Department>,
    departmentStaff: Staff[],
    descendants: Map<Ref<Department>, Department[]>
  ) {
    editableList = [currentEmployee]
    checkDepartmentEditable(departmentById, hr.ids.Head, departmentStaff, descendants)
    editableList = editableList
  }

  function updateStaff (
    staff: Staff[],
    departments: Ref<Department>[],
    employeeRequests: Map<Ref<Staff>, Request[]>,
    descendants: Map<Ref<Department>, Department[]>,
    departmentById: Map<Ref<Department>, Department>
  ) {
    departmentStaff = staff.filter((p) => departments.includes(p.department) || employeeRequests.has(p._id))
    updateEditableList(departmentById, departmentStaff, descendants)
  }

  $: updateStaff(staff, departments, employeeRequests, descendants, departmentById)

  const reportQuery = createQuery()

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
          const or = newMap.get(r.employee) ?? {
            value: 0,
            reports: [],
            tasks: new Map()
          }
          const tsk = r.$lookup?.attachedTo as Issue
          newMap.set(r.employee, {
            value: or.value + r.value,
            reports: [...or.reports, r],
            tasks: or.tasks.set(tsk._id, tsk)
          })
        }
      }
      timeReports = newMap
    },
    {
      lookup: {
        attachedTo: tracker.class.Issue
      }
    }
  )
  let holidays: Map<Ref<Department>, Date[]> = new Map()
  const holidaysQuery = createQuery()
  $: holidaysQuery.query(
    hr.class.PublicHoliday,
    {
      'date.month': currentDate.getMonth(),
      'date.year': currentDate.getFullYear()
    },
    (res) => {
      const group = groupBy(res, 'department')
      holidays = new Map()
      for (const groupKey in group) {
        holidays.set(
          groupKey,
          group[groupKey].map((holiday) => new Date(fromTzDate(holiday.date)))
        )
      }
    }
  )

  async function getHolidays (month: Date): Promise<Map<Ref<Department>, Date[]>> {
    const result = await client.findAll(hr.class.PublicHoliday, {
      'date.month': month.getMonth(),
      'date.year': month.getFullYear()
    })
    const group = groupBy(result, 'department')
    const rMap = new Map()
    for (const groupKey in group) {
      rMap.set(
        groupKey,
        group[groupKey].map((holiday) => new Date(fromTzDate(holiday.date)))
      )
    }
    return rMap
  }

  const client = getClient()

  async function getDepartmentsForEmployee (departmentStaff: Staff[]): Promise<Map<Ref<Staff>, Department[]>> {
    const map = new Map<Ref<Staff>, Department[]>()
    if (departmentStaff && departmentStaff.length > 0) {
      const ids = departmentStaff.map((staff) => staff._id)
      const staffs = await client.findAll(contact.class.PersonAccount, { person: { $in: ids } })
      const departments = await client.findAll(hr.class.Department, {
        members: { $in: staffs.map((staff) => staff._id) }
      })
      staffs.forEach((staff) => {
        const filteredDepartments = departments.filter((department) => department.members.includes(staff._id))
        map.set(staff.employee as Ref<Staff>, filteredDepartments as Department[])
      })
    }
    return map
  }
  let staffDepartmentMap = new Map()
  $: getDepartmentsForEmployee(departmentStaff).then((res) => {
    staffDepartmentMap = res
  })
</script>

{#if staffDepartmentMap.size > 0}
  {#if mode === CalendarMode.Year}
    <YearView {departmentStaff} {employeeRequests} {types} {currentDate} {holidays} {staffDepartmentMap} />
  {:else if mode === CalendarMode.Month}
    {#if display === 'chart'}
      <MonthView
        {departmentStaff}
        {employeeRequests}
        {types}
        {startDate}
        {endDate}
        {editableList}
        {currentDate}
        {timeReports}
        {holidays}
        {department}
        {departments}
        {departmentById}
        {staffDepartmentMap}
      />
    {:else if display === 'stats'}
      <MonthTableView
        {departmentStaff}
        {employeeRequests}
        {types}
        {currentDate}
        {timeReports}
        {holidays}
        {staffDepartmentMap}
        {getHolidays}
      />
    {/if}
  {/if}
{:else}
  <div class="flex-center h-full w-full flex-grow fs-title">
    <Label label={hr.string.NoEmployeesInDepartment} />
  </div>
{/if}
