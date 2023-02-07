import { Employee, formatName } from '@hcengineering/contact'
import { Ref, TxOperations } from '@hcengineering/core'
import { Department, Request, RequestType, Staff, TzDate } from '@hcengineering/hr'
import { MessageBox } from '@hcengineering/presentation'
import { Issue, TimeSpendReport } from '@hcengineering/tracker'
import { isWeekend, MILLISECONDS_IN_DAY, showPopup } from '@hcengineering/ui'
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
            labelProps: { name: formatName(employee.name) },
            message: hr.string.MoveStaffDescr,
            params: {
              current: current.name,
              department: value.name
            }
          },
          undefined,
          (res?: boolean) => {
            if (res === true && value !== undefined) {
              void client.updateMixin(employee._id, employee._class, employee.space, hr.mixin.Staff, {
                department: value._id
              })
            }
            resolve(null)
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
export function toTzDate (date: Date): TzDate {
  return {
    year: date.getFullYear(),
    month: date.getMonth(),
    day: date.getDate(),
    offset: date.getTimezoneOffset()
  }
}

/**
 * @public
 */
export function fromTzDate (tzDate: TzDate): number {
  return new Date().setFullYear(tzDate?.year ?? 0, tzDate.month, tzDate.day)
}

/**
 * @public
 */
export function tzDateEqual (tzDate: TzDate, tzDate2: TzDate): boolean {
  return tzDate.year === tzDate2.year && tzDate.month === tzDate2.month && tzDate.day === tzDate2.day
}

/**
 * @public
 */
export function weekDays (year: number, month: number): number {
  return new Array(32 - new Date(year, month, 32).getDate())
    .fill(1)
    .filter((id, index) => ![0, 6].includes(new Date(year, month, index + 1).getDay())).length
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
  month: number
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
    ds = ds.filter((it) => !isWeekend(new Date(stDate.setDate(it))))
  }
  return ds
}

export function getRequestDays (
  request: Request,
  types: Map<Ref<RequestType>, RequestType>,
  startDate: Date,
  endDate: Date
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
      ((type?.value ?? -1) > 0 || ((type?.value ?? -1) < 0 && !isWeekend(new Date(current))))
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
  f: (v: number) => number = (f) => f
): number {
  let total = 0
  for (const request of requests) {
    const ds = getRequestDays(request, types, startDate, endDate)
    const type = types.get(request.type)
    const val = ds * (type?.value ?? 0)
    total += f(val)
  }
  return total
}

export function tableToCSV (tableId: string, separator = ','): string {
  const rows = document.querySelectorAll('table#' + tableId + ' tr')
  // Construct csv
  const csv = []
  for (let i = 0; i < rows.length; i++) {
    const row = []
    const cols = rows[i].querySelectorAll('td, th')
    for (let j = 0; j < cols.length; j++) {
      let data = (cols[j] as HTMLElement).innerText.replace(/(\r\n|\n|\r)/gm, '').replace(/(\s\s)/gm, ' ')
      data = data.replace(/"/g, '""')
      row.push('"' + data + '"')
    }
    csv.push(row.join(separator))
  }
  return csv.join('\n')
}

export interface EmployeeReports {
  reports: TimeSpendReport[]
  tasks: Map<Ref<Issue>, Issue>
  value: number
}
