import { Employee, formatName } from '@anticrm/contact'
import { Ref, TxOperations } from '@anticrm/core'
import { Department, Request, RequestType } from '@anticrm/hr'
import { MessageBox } from '@anticrm/presentation'
import { showPopup } from '@anticrm/ui'
import hr from './plugin'

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
export function toUTC (date: Date | number, hours = 12, mins = 0, sec = 0): number {
  const res = new Date(date)
  if (res.getUTCFullYear() !== res.getFullYear()) {
    res.setUTCFullYear(res.getFullYear())
  }
  if (res.getUTCMonth() !== res.getMonth()) {
    res.setUTCMonth(res.getMonth())
  }
  if (res.getUTCDate() !== res.getDate()) {
    res.setUTCDate(res.getDate())
  }
  return res.setUTCHours(hours, mins, sec, 0)
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

export function getTotal (
  requests: Request[],
  types: Map<Ref<RequestType>, RequestType>,
  f: (v: number) => number = (f) => f
): number {
  let total = 0
  for (const request of requests) {
    const type = types.get(request.type)
    let days = Math.abs((request.dueDate - request.date) / 1000 / 60 / 60 / 24)
    if (days === 0) {
      days = 1
    }
    const stDate = new Date(request.date)
    const stDateDate = stDate.getDate()
    let ds = Array.from(Array(days).keys()).map((it) => stDateDate + it)
    if ((type?.value ?? -1) < 0) {
      ds = ds.filter((it) => ![0, 6].includes(new Date(stDate.setDate(it)).getDay()))
    }
    const val = Math.ceil(ds.length) * (type?.value ?? 0)
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
