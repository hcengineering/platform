import type { Person } from '@hcengineering/contact'
import { getClient } from '@hcengineering/presentation'
import type { LabelAndProps } from '@hcengineering/ui'
import contact from '../../plugin'
import EmployeePreviewPopup from './person/EmployeePreviewPopup.svelte'
import type { Class, Ref } from '@hcengineering/core'

const client = getClient()
const h = client.getHierarchy()

export function getPreviewPopup (person: Person | { _id?: Ref<Person>, _class?: Ref<Class<Person>> } | undefined, showPopup: boolean): LabelAndProps | undefined {
  if (person?._id === undefined || person?._class === undefined || !showPopup) return
  const isPerson = person != null && h.isDerived(person._class, contact.class.Person)
  const employee = isPerson ? h.as(person as Person, contact.mixin.Employee) : undefined
  return {
    component: EmployeePreviewPopup,
    props: { employeeId: person._id, classList: ['modern'], disabled: employee?.active === false },
    timeout: 300,
    style: 'modern',
    noArrow: true
  }
}
