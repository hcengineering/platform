import contact, { Employee, PersonAccount, getFirstName, getLastName } from '@hcengineering/contact'
import { employeeByIdStore } from '@hcengineering/contact-resources'
import { Class, Doc, Hierarchy, Ref } from '@hcengineering/core'
import { getClient } from '@hcengineering/presentation'
import setting from '@hcengineering/setting'
import { TemplateDataProvider } from '@hcengineering/templates'
import { get } from 'svelte/store'

function isEditable (hierarchy: Hierarchy, p: Class<Doc>): boolean {
  let ancestors = [p._id]
  try {
    ancestors = [...hierarchy.getAncestors(p._id), p._id]
  } catch (err: any) {
    console.error(err)
  }
  for (const ao of ancestors) {
    try {
      const cl = hierarchy.getClass(ao)
      if (hierarchy.hasMixin(cl, setting.mixin.Editable) && hierarchy.as(cl, setting.mixin.Editable).value) {
        return true
      }
    } catch (err: any) {
      return false
    }
  }
  return false
}
export function filterDescendants (
  hierarchy: Hierarchy,
  ofClass: Ref<Class<Doc>> | undefined,
  res: Array<Class<Doc>>
): Array<Ref<Class<Doc>>> {
  let _classes = res
    .filter((it) => {
      try {
        return ofClass != null ? hierarchy.isDerived(it._id, ofClass) : true
      } catch (err: any) {
        return false
      }
    })
    .filter((it) => !(it.hidden ?? false))
    .filter((p) => isEditable(hierarchy, p))

  let len: number
  const _set = new Set(_classes.map((it) => it._id))
  do {
    len = _classes.length
    _classes = _classes.filter((it) => (it.extends != null ? !_set.has(it.extends) : false))
  } while (len !== _classes.length)

  return _classes.map((p) => p._id)
}

export async function getValue (provider: TemplateDataProvider): Promise<string | undefined> {
  const value = provider.get(setting.class.Integration)
  if (value === undefined) return
  return value.value
}

export async function getOwnerFirstName (provider: TemplateDataProvider): Promise<string | undefined> {
  const value = provider.get(setting.class.Integration)
  if (value === undefined) return
  const client = getClient()
  const employeeAccount = await client.findOne(contact.class.PersonAccount, {
    _id: value.modifiedBy as Ref<PersonAccount>
  })
  if (employeeAccount !== undefined) {
    const employee = get(employeeByIdStore).get(employeeAccount.person as Ref<Employee>)
    return employee != null ? getFirstName(employee.name) : undefined
  }
}

export async function getOwnerLastName (provider: TemplateDataProvider): Promise<string | undefined> {
  const value = provider.get(setting.class.Integration)
  if (value === undefined) return
  const client = getClient()
  const employeeAccount = await client.findOne(contact.class.PersonAccount, {
    _id: value.modifiedBy as Ref<PersonAccount>
  })
  if (employeeAccount !== undefined) {
    const employee = get(employeeByIdStore).get(employeeAccount.person as Ref<Employee>)
    return employee != null ? getLastName(employee.name) : undefined
  }
}

export async function getOwnerPosition (provider: TemplateDataProvider): Promise<string | undefined> {
  const value = provider.get(setting.class.Integration)
  if (value === undefined) return
  const client = getClient()
  const employeeAccount = await client.findOne(contact.class.PersonAccount, {
    _id: value.modifiedBy as Ref<PersonAccount>
  })
  if (employeeAccount !== undefined) {
    const employee = get(employeeByIdStore).get(employeeAccount.person as Ref<Employee>)
    if (employee != null && client.getHierarchy().hasMixin(employee, contact.mixin.Employee)) {
      return client.getHierarchy().as(employee, contact.mixin.Employee)?.position ?? undefined
    }
    return undefined
  }
}
