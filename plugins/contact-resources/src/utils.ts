//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2022 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import {
  ChannelProvider,
  Contact,
  contactId,
  Employee,
  EmployeeAccount,
  formatName,
  getName
} from '@hcengineering/contact'
import {
  Doc,
  getCurrentAccount,
  matchQuery,
  ObjQueryType,
  Ref,
  SortingOrder,
  Timestamp,
  toIdMap
} from '@hcengineering/core'
import { createQuery, getClient } from '@hcengineering/presentation'
import { TemplateDataProvider } from '@hcengineering/templates'
import { getPanelURI, Location } from '@hcengineering/ui'
import view, { Filter } from '@hcengineering/view'
import { FilterQuery } from '@hcengineering/view-resources'
import contact from './plugin'

const client = getClient()
const channelProviders = client.findAll(contact.class.ChannelProvider, {})

export async function getChannelProviders (): Promise<Map<Ref<ChannelProvider>, ChannelProvider>> {
  const cp = await channelProviders
  const map = new Map<Ref<ChannelProvider>, ChannelProvider>()
  for (const provider of cp) {
    map.set(provider._id, provider)
  }
  return map
}

export function formatDate (dueDateMs: Timestamp): string {
  return new Date(dueDateMs).toLocaleString('default', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export async function employeeSort (value: Array<Ref<Employee>>): Promise<Array<Ref<Employee>>> {
  return await new Promise((resolve) => {
    const query = createQuery(true)
    query.query(contact.class.Employee, { _id: { $in: value } }, (res) => {
      const employees = toIdMap(res)
      value.sort((a, b) => {
        const employeeId1 = a as Ref<Employee> | null | undefined
        const employeeId2 = b as Ref<Employee> | null | undefined

        if (employeeId1 == null && employeeId2 != null) {
          return 1
        }

        if (employeeId1 != null && employeeId2 == null) {
          return -1
        }

        if (employeeId1 != null && employeeId2 != null) {
          const employee1 = employees.get(employeeId1)
          const employee2 = employees.get(employeeId2)
          const name1 = employee1 != null ? getName(employee1) : ''
          const name2 = employee2 != null ? getName(employee2) : ''

          return name1.localeCompare(name2)
        }

        return 0
      })
      resolve(value)
      query.unsubscribe()
    })
  })
}

export async function filterChannelInResult (filter: Filter, onUpdate: () => void): Promise<ObjQueryType<any>> {
  const result = await getRefs(filter, onUpdate)
  return { $in: result }
}

export async function filterChannelNinResult (filter: Filter, onUpdate: () => void): Promise<ObjQueryType<any>> {
  const result = await getRefs(filter, onUpdate)
  return { $nin: result }
}

export async function getRefs (filter: Filter, onUpdate: () => void): Promise<Array<Ref<Doc>>> {
  const lq = FilterQuery.getLiveQuery(filter.index)
  const client = getClient()
  const mode = await client.findOne(view.class.FilterMode, { _id: filter.mode })
  if (mode === undefined) return []
  const promise = new Promise<Array<Ref<Doc>>>((resolve, reject) => {
    const refresh = lq.query(
      contact.class.Channel,
      {
        provider: { $in: filter.value }
      },
      (refs) => {
        const result = Array.from(new Set(refs.map((p) => p.attachedTo)))
        FilterQuery.results.set(filter.index, result)
        resolve(result)
        onUpdate()
      }
    )
    if (!refresh) {
      resolve(FilterQuery.results.get(filter.index) ?? [])
    }
  })
  return await promise
}

export async function getCurrentEmployeeName (): Promise<string> {
  const me = getCurrentAccount() as EmployeeAccount
  return formatName(me.name)
}

export async function getCurrentEmployeeEmail (): Promise<string> {
  const me = getCurrentAccount() as EmployeeAccount
  return me.email
}

export async function getContactName (provider: TemplateDataProvider): Promise<string | undefined> {
  const value = provider.get(contact.class.Contact) as Contact
  if (value === undefined) return
  const client = getClient()
  const hierarchy = client.getHierarchy()
  if (hierarchy.isDerived(value._class, contact.class.Person)) {
    return getName(value)
  } else {
    return value.name
  }
}

export async function getContactLink (doc: Doc): Promise<string> {
  const client = getClient()
  const hierarchy = client.getHierarchy()
  let clazz = hierarchy.getClass(doc._class)
  let label = clazz.shortLabel
  while (label === undefined && clazz.extends !== undefined) {
    clazz = hierarchy.getClass(clazz.extends)
    label = clazz.shortLabel
  }
  label = label ?? 'CONT'
  let length = 5
  let id = doc._id.slice(-length)
  const contacts = await client.findAll(clazz._id, {}, { projection: { _id: 1 } })
  let res = matchQuery(contacts, { _id: { $like: `@${id}` } }, clazz._id, hierarchy)
  while (res.length > 1) {
    length++
    id = doc._id.slice(-length)
    res = matchQuery(contacts, { _id: { $like: `@${id}` } }, clazz._id, hierarchy)
  }

  return `${contactId}|${label}-${id}`
}

function isShortId (shortLink: string): boolean {
  return /^\w+-\w+$/.test(shortLink)
}

export async function resolveLocation (loc: Location): Promise<Location | undefined> {
  const split = loc.fragment?.split('|') ?? []
  if (split[0] !== contactId) {
    return undefined
  }

  const shortLink = split[1]

  // shortlink
  if (isShortId(shortLink)) {
    return await generateLocation(loc, shortLink)
  }

  return undefined
}

async function generateLocation (loc: Location, shortLink: string): Promise<Location | undefined> {
  const tokens = shortLink.split('-')
  if (tokens.length < 2) {
    return undefined
  }
  const classLabel = tokens[0]
  const lastId = tokens[1]
  const client = getClient()
  const hierarchy = client.getHierarchy()
  const classes = hierarchy.getDescendants(contact.class.Contact)
  let _class = contact.class.Contact
  for (const clazz of classes) {
    if (hierarchy.getClass(clazz).shortLabel === classLabel) {
      _class = clazz
      break
    }
  }
  const doc = await client.findOne(_class, { _id: { $like: `%${lastId}` } }, { sort: { _id: SortingOrder.Descending } })
  if (doc === undefined) {
    console.error(`Could not find contact ${lastId}.`)
    return undefined
  }
  const appComponent = loc.path[0] ?? ''
  const workspace = loc.path[1] ?? ''
  return {
    path: [appComponent, workspace],
    fragment: getPanelURI(view.component.EditDoc, doc._id, doc._class, 'content')
  }
}
