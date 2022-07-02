import { Employee, formatName } from '@anticrm/contact'
import { TxOperations } from '@anticrm/core'
import { Department } from '@anticrm/hr'
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
