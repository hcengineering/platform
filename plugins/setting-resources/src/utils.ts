/* eslint-disable @typescript-eslint/no-unused-vars */
import contact, { getFirstName, getLastName } from '@hcengineering/contact'
import { employeeByPersonIdStore } from '@hcengineering/contact-resources'
import { type Class, type Doc, type Hierarchy, type Ref } from '@hcengineering/core'
import { getMetadata } from '@hcengineering/platform'
import login from '@hcengineering/login'
import presentation, { getClient } from '@hcengineering/presentation'
import setting from '@hcengineering/setting'
import { type TemplateDataProvider } from '@hcengineering/templates'
import { getClient as getAccountClientRaw, type AccountClient } from '@hcengineering/account-client'
import { get } from 'svelte/store'

function isEditable (hierarchy: Hierarchy, p: Class<Doc>): boolean {
  let ancestors = [p._id]
  try {
    ancestors = [...hierarchy.getAncestors(p._id), p._id]
  } catch (err: any) {
    console.error(err)
  }
  let result = false
  for (const ao of ancestors) {
    try {
      const cl = hierarchy.getClass(ao)
      if (hierarchy.hasMixin(cl, setting.mixin.Editable)) {
        if (hierarchy.as(cl, setting.mixin.Editable).value) {
          result = true
        } else {
          return false
        }
      }
    } catch (err: any) {
      return false
    }
  }
  return result
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

  const employee = get(employeeByPersonIdStore).get(value.modifiedBy)
  return employee != null ? getFirstName(employee.name) : undefined
}

export async function getOwnerLastName (provider: TemplateDataProvider): Promise<string | undefined> {
  const value = provider.get(setting.class.Integration)
  if (value === undefined) return

  const employee = get(employeeByPersonIdStore).get(value.modifiedBy)
  return employee != null ? getLastName(employee.name) : undefined
}

export async function getOwnerPosition (provider: TemplateDataProvider): Promise<string | undefined> {
  const value = provider.get(setting.class.Integration)
  if (value === undefined) return

  const client = getClient()

  const employee = get(employeeByPersonIdStore).get(value.modifiedBy)
  if (employee != null && client.getHierarchy().hasMixin(employee, contact.mixin.Employee)) {
    return client.getHierarchy().as(employee, contact.mixin.Employee)?.position ?? undefined
  }
}

export function getAccountClient (): AccountClient {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)
  const token = getMetadata(presentation.metadata.Token)

  return getAccountClientRaw(accountsUrl, token)
}
