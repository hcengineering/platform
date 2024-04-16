import contact, { type Employee, type PersonAccount, getFirstName, getLastName } from '@hcengineering/contact'
import { employeeByIdStore } from '@hcengineering/contact-resources'
import core, { type Class, type Doc, type Hierarchy, type Ref, type Type } from '@hcengineering/core'
import { getClient } from '@hcengineering/presentation'
import setting from '@hcengineering/setting'
import { type TemplateDataProvider } from '@hcengineering/templates'
import { type AnyComponent } from '@hcengineering/ui'
import view from '@hcengineering/view'
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

// This is a historical mis-use of ObjectEditor.
// ObjectEditor should be mixed into Class, and provide UI to edit instances of that class.
// But for types settings ObjectEditor mixed into type class
// provides UI to edit instance of another class - parent Attribute.
// TODO: Refactor
const editorMixinRef = view.mixin.ObjectEditor

export function getTypes (hierarchy: Hierarchy): Array<Class<Type<any>>> {
  return hierarchy
    .getDescendants(core.class.Type)
    .map((descendantClassRef) => hierarchy.getClass(descendantClassRef))
    .filter(
      (descendantClass) => descendantClass.label !== undefined && hierarchy.hasMixin(descendantClass, editorMixinRef)
    )
}

export function getTypeEditor (hierarchy: Hierarchy, type: Ref<Class<Type<any>>>): AnyComponent | undefined {
  const _class = hierarchy.getClass(type)
  return hierarchy.hasMixin(_class, editorMixinRef) ? hierarchy.as(_class, editorMixinRef).editor : undefined
}
