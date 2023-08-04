import { Employee, getName } from '@hcengineering/contact'
import { Ref, TxOperations } from '@hcengineering/core'
import { Department, Request, RequestType, Staff, fromTzDate } from '@hcengineering/hr'
import { MessageBox } from '@hcengineering/presentation'
import { Issue, TimeSpendReport } from '@hcengineering/tracker'
import { MILLISECONDS_IN_DAY, areDatesEqual, isWeekend, showPopup } from '@hcengineering/ui'
import hr from './plugin'

const todayDate = new Date()

export async function addMember (client: TxOperations, employee?: Employee, value?: Department): Promise<void> {
  if (employee === null || employee === undefined || value === undefined) {
    return
  }

  const hierarchy = client.getHierarchy()
  if (!hierarchy.hasMixin(employee, hr.mixin.Staff)) {
    await client.createMixin(employee._id, employee._class, employee.space, hr.mixin.Staff, {
      department: value._id
    })
  } else {
    const staff = hierarchy.as(employee, hr.mixin.Staff)
    if (staff.department === value._id) return
    const current = await client.findOne(hr.class.Department, {
      _id: staff.department
    })
    if (current !== undefined) {
      await new Promise((resolve) => {
        showPopup(
          MessageBox,
          {
            label: hr.string.MoveStaff,
            labelProps: { name: getName(client.getHierarchy(), employee) },
            message: hr.string.MoveStaffDescr,
            params: {
              current: current.name,
              department: value.name
            }
          },
          undefined,
          (res?: boolean) => {
            if (res === true && value !== undefined) {
              void client
                .updateMixin(employee._id, employee._class, employee.space, hr.mixin.Staff, {
                  department: value._id
                })
                .then(() => {
                  resolve(null)
                })
            } else {
              resolve(null)
            }
          }
        )
      })
    } else {
      await client.updateMixin(employee._id, employee._class, employee.space, hr.mixin.Staff, {
        department: value._id
      })
    }
  }
}

/**
 * @public
 */
export function weekDays (year: number, month: number): number {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  let days = 0

  for (let i = 1; i <= daysInMonth; i++) {
    const dayOfWeek = new Date(year, month, i).getDay()

    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      days++
    }
  }
  return days
}

/**
 * @public
 */
export function getMonth (date: Date, m: number): Date {
  date = new Date(date)
  date.setDate(1)
  date.setMonth(m)
  return date
}

/**
 * @public
 */
export function getStartDate (year: number, month?: number): Date {
  return new Date(new Date(year, month !== undefined ? month : 0).setHours(0, 0, 0, 0))
}

/**
 * @public
 */
export function getEndDate (year: number, month?: number): Date {
  return new Date(
    new Date(
      new Date(
        month !== undefined && month === 11 ? year + 1 : year,
        month !== undefined ? (month + 1) % 12 : 11
      ).setDate(0)
    ).setHours(23, 59, 59, 999)
  )
}

/**
 * @public
 */
export function isToday (date: Date): boolean {
  return date.getFullYear() === todayDate.getFullYear() && date.getMonth() === todayDate.getMonth()
}

/**
 * @public
 */
export function getRequests (
  employeeRequests: Map<Ref<Staff>, Request[]>,
  startDate: Date,
  endDate?: Date,
  employee?: Ref<Staff>
): Request[] {
  const startTime = new Date(startDate).setHours(0, 0, 0, 0)
  const endTime =
    endDate != null ? new Date(endDate).setHours(23, 59, 59, 999) : new Date(startDate).setHours(23, 59, 59, 999)
  let requests
  if (employee != null) {
    requests = employeeRequests.get(employee)
  } else {
    requests = Array.from(employeeRequests.values()).flat()
  }
  if (requests === undefined) return []

  return requests.filter(
    (request) => fromTzDate(request.tzDate) <= endTime && fromTzDate(request.tzDueDate) > startTime
  )
}

export function getRequestDates (
  request: Request,
  types: Map<Ref<RequestType>, RequestType>,
  year: number,
  month: number,
  holidays: Date[] | undefined
): number[] {
  const type = types.get(request.type)
  const startDate = request.tzDate.month === month ? fromTzDate(request.tzDate) : new Date().setFullYear(year, month, 1)
  const endDate =
    request.tzDueDate.month === month ? fromTzDate(request.tzDueDate) : new Date().setFullYear(year, month + 1, 0)
  const days = Math.floor(Math.abs((1 + endDate - startDate) / 1000 / 60 / 60 / 24)) + 1
  const stDate = new Date(startDate)
  const stDateDate = stDate.getDate()
  let ds = Array.from(Array(days).keys()).map((it) => stDateDate + it)
  if ((type?.value ?? -1) < 0) {
    ds = ds.filter((it) => !isWeekend(new Date(stDate.setDate(it))) && !isHoliday(holidays ?? undefined, stDate))
  }
  return ds
}

export function getRequestDays (
  request: Request,
  types: Map<Ref<RequestType>, RequestType>,
  startDate: Date,
  endDate: Date,
  holidays: Date[] | undefined
): number {
  const type = types.get(request.type)
  const startTime = new Date(fromTzDate(request.tzDate)).setHours(0, 0, 0, 0)
  const endTime = new Date(fromTzDate(request.tzDueDate)).setHours(23, 59, 59, 999)
  const end = endDate.getTime()
  let current = startDate.getTime()
  let days = 0
  while (current <= end) {
    if (
      current >= startTime &&
      current <= endTime &&
      ((type?.value ?? -1) > 0 ||
        ((type?.value ?? -1) < 0 &&
          !isWeekend(new Date(current)) &&
          !isHoliday(holidays ?? undefined, new Date(current))))
    ) {
      days++
    }
    current += MILLISECONDS_IN_DAY
  }
  return days
}

export function getTotal (
  requests: Request[],
  startDate: Date,
  endDate: Date,
  types: Map<Ref<RequestType>, RequestType>,
  holidays: Date[] | undefined,
  f: (v: number) => number = (f) => f
): number {
  let total = 0
  for (const request of requests) {
    const ds = getRequestDays(request, types, startDate, endDate, holidays)
    const type = types.get(request.type)
    const val = ds * (type?.value ?? 0)
    total += f(val)
  }
  return total
}

export function isHoliday (holidays: Date[] | undefined, day: Date): boolean {
  if (holidays === undefined) return false
  return holidays.some((date) => areDatesEqual(day, date))
}

export function getHolidayDatesForEmployee (
  departmentMap: Map<Ref<Staff>, Department[]>,
  employee: Ref<Staff>,
  holidays: Map<Ref<Department>, Date[]>
): Date[] {
  if (departmentMap === undefined || departmentMap.size === 0) return []
  const deps = departmentMap.get(employee)
  if (deps === undefined) return []
  if (holidays.size === 0) return []
  const dates = []
  for (const dep of deps) {
    const depDates = holidays?.get(dep._id)
    if (depDates !== undefined) {
      dates.push(...depDates)
    }
  }
  return dates
}

export interface EmployeeReports {
  reports: TimeSpendReport[]
  tasks: Map<Ref<Issue>, Issue>
  value: number
}
