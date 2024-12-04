import contact, { type Employee, getFirstName, getLastName } from '@hcengineering/contact'
import { employeeByIdStore } from '@hcengineering/contact-resources'
import { type Class, type Doc, type Hierarchy, type Ref } from '@hcengineering/core'
import { getMetadata } from '@hcengineering/platform'
import login from '@hcengineering/login'
import presentation, { getClient } from '@hcengineering/presentation'
import setting from '@hcengineering/setting'
import { type TemplateDataProvider } from '@hcengineering/templates'
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
  // TODO: FIXME
  throw new Error('Not implemented')
  // const value = provider.get(setting.class.Integration)
  // if (value === undefined) return
  // const client = getClient()
  // const employeeAccount = await client.findOne(contact.class.PersonAccount, {
  //   _id: value.modifiedBy as PersonId
  // })
  // if (employeeAccount !== undefined) {
  //   const employee = get(employeeByIdStore).get(employeeAccount.person as Ref<Employee>)
  //   return employee != null ? getFirstName(employee.name) : undefined
  // }
}

export async function getOwnerLastName (provider: TemplateDataProvider): Promise<string | undefined> {
  // TODO: FIXME
  throw new Error('Not implemented')
  // const value = provider.get(setting.class.Integration)
  // if (value === undefined) return
  // const client = getClient()
  // const employeeAccount = await client.findOne(contact.class.PersonAccount, {
  //   _id: value.modifiedBy as PersonId
  // })
  // if (employeeAccount !== undefined) {
  //   const employee = get(employeeByIdStore).get(employeeAccount.person as Ref<Employee>)
  //   return employee != null ? getLastName(employee.name) : undefined
  // }
}

export async function getOwnerPosition (provider: TemplateDataProvider): Promise<string | undefined> {
  // TODO: FIXME
  throw new Error('Not implemented')
  // const value = provider.get(setting.class.Integration)
  // if (value === undefined) return
  // const client = getClient()
  // const employeeAccount = await client.findOne(contact.class.PersonAccount, {
  //   _id: value.modifiedBy as PersonId
  // })
  // if (employeeAccount !== undefined) {
  //   const employee = get(employeeByIdStore).get(employeeAccount.person as Ref<Employee>)
  //   if (employee != null && client.getHierarchy().hasMixin(employee, contact.mixin.Employee)) {
  //     return client.getHierarchy().as(employee, contact.mixin.Employee)?.position ?? undefined
  //   }
  //   return undefined
  // }
}

export async function rpcAccount (method: string, ...params: any[]): Promise<any> {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)

  if (accountsUrl === undefined) {
    throw new Error('accounts url not specified')
  }

  const token = getMetadata(presentation.metadata.Token)
  if (token === undefined) {
    throw new Error('no token available for the session')
  }

  const request = {
    method,
    params
  }

  try {
    const response = await fetch(accountsUrl, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    })
    const res = await response.json()

    if (res.error != null) {
      throw new Error(`Failed to ${method}: ${res.error}`)
    }

    return res
  } catch (err: any) {
    throw new Error(`Fetch error when calling ${method}: ${err.message}`)
  }
}
