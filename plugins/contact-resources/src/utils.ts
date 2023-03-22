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
  AvatarProvider,
  AvatarType,
  ChannelProvider,
  Contact,
  contactId,
  Employee,
  EmployeeAccount,
  formatName,
  getName
} from '@hcengineering/contact'
import { Doc, getCurrentAccount, IdMap, ObjQueryType, Ref, Timestamp, toIdMap } from '@hcengineering/core'
import { createQuery, getClient } from '@hcengineering/presentation'
import { TemplateDataProvider } from '@hcengineering/templates'
import { DropdownIntlItem, getCurrentLocation, getPanelURI, Location, ResolvedLocation } from '@hcengineering/ui'
import view, { Filter } from '@hcengineering/view'
import { FilterQuery } from '@hcengineering/view-resources'
import { get, writable } from 'svelte/store'
import contact from './plugin'

const client = getClient()

export async function getChannelProviders (): Promise<Map<Ref<ChannelProvider>, ChannelProvider>> {
  const cp = await client.findAll(contact.class.ChannelProvider, {})
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
  return value.sort((a, b) => {
    const employeeId1 = a as Ref<Employee> | null | undefined
    const employeeId2 = b as Ref<Employee> | null | undefined

    if (employeeId1 == null && employeeId2 != null) {
      return 1
    }

    if (employeeId1 != null && employeeId2 == null) {
      return -1
    }

    if (employeeId1 != null && employeeId2 != null) {
      const employee1 = get(employeeByIdStore).get(employeeId1)
      const employee2 = get(employeeByIdStore).get(employeeId2)
      const name1 = employee1 != null ? getName(employee1) : ''
      const name2 = employee2 != null ? getName(employee2) : ''

      return name1.localeCompare(name2)
    }

    return 0
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

export async function getContactLink (doc: Doc): Promise<Location> {
  const loc = getCurrentLocation()
  loc.path.length = 2
  loc.fragment = undefined
  loc.query = undefined
  loc.path[2] = contactId
  loc.path[3] = doc._id

  return loc
}

function isId (id: Ref<Contact>): boolean {
  return /^[0-9a-z]{24}$/.test(id)
}

export async function resolveLocation (loc: Location): Promise<ResolvedLocation | undefined> {
  if (loc.path[2] !== contactId) {
    return undefined
  }

  const id = loc.path[3] as Ref<Contact>
  if (isId(id)) {
    return await generateLocation(loc, id)
  }
}

async function generateLocation (loc: Location, id: Ref<Contact>): Promise<ResolvedLocation | undefined> {
  const client = getClient()
  const doc = await client.findOne(contact.class.Contact, { _id: id })
  if (doc === undefined) {
    console.error(`Could not find contact ${id}.`)
    return undefined
  }
  const appComponent = loc.path[0] ?? ''
  const workspace = loc.path[1] ?? ''
  return {
    loc: {
      path: [appComponent, workspace],
      fragment: getPanelURI(view.component.EditDoc, doc._id, doc._class, 'content')
    },
    shouldNavigate: false,
    defaultLocation: {
      path: [appComponent, workspace, contactId],
      fragment: getPanelURI(view.component.EditDoc, doc._id, doc._class, 'content')
    }
  }
}

export const employeeByIdStore = writable<IdMap<Employee>>(new Map())
export const employeesStore = writable<Employee[]>([])
const query = createQuery(true)
query.query(contact.class.Employee, {}, (res) => {
  employeesStore.set(res)
  employeeByIdStore.set(toIdMap(res))
})

export function getAvatarTypeDropdownItems (hasGravatar: boolean): DropdownIntlItem[] {
  return [
    {
      id: AvatarType.COLOR,
      label: contact.string.UseColor
    },
    {
      id: AvatarType.IMAGE,
      label: contact.string.UseImage
    },
    ...(hasGravatar
      ? [
          {
            id: AvatarType.GRAVATAR,
            label: contact.string.UseGravatar
          }
        ]
      : [])
  ]
}

export function getAvatarProviderId (avatar?: string | null): Ref<AvatarProvider> | undefined {
  if (avatar === null || avatar === undefined || avatar === '') {
    return
  }
  if (!avatar.includes('://')) {
    return contact.avatarProvider.Image
  }
  const [schema] = avatar.split('://')

  switch (schema) {
    case AvatarType.GRAVATAR:
      return contact.avatarProvider.Gravatar
    case AvatarType.COLOR:
      return contact.avatarProvider.Color
  }
}
