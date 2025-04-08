import type { Person } from '@hcengineering/contact'
import { getClient } from '@hcengineering/presentation'
import type { LabelAndProps } from '@hcengineering/ui'
import contact from '../../plugin'
import EmployeePreview from './EmployeePreview.svelte'

const client = getClient()
const h = client.getHierarchy()

export function getPreviewPopup (person: Person | undefined, showPopup: boolean): LabelAndProps | undefined {
  if (person === undefined || !showPopup) return
  const employee = person != null ? h.as(person, contact.mixin.Employee) : undefined
  return {
    component: EmployeePreview,
    props: { employeeId: person._id, classList: ['modern'], disabled: employee?.active === false },
    timeout: 300,
    style: 'modern',
    noArrow: true
  }
}
