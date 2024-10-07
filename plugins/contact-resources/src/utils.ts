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
  AvatarType,
  type Channel,
  type ChannelProvider,
  type Contact,
  contactId,
  type Employee,
  formatName,
  getFirstName,
  getLastName,
  getName,
  type Person,
  type PersonAccount
} from '@hcengineering/contact'
import core, {
  type Account,
  AggregateValue,
  AggregateValueData,
  type Class,
  type Client,
  type Doc,
  type DocumentQuery,
  getCurrentAccount,
  groupByArray,
  type Hierarchy,
  type IdMap,
  matchQuery,
  type ObjQueryType,
  type Ref,
  type Space,
  type Timestamp,
  toIdMap,
  type TxOperations,
  type UserStatus,
  type WithLookup
} from '@hcengineering/core'
import notification, { type DocNotifyContext, type InboxNotification } from '@hcengineering/notification'
import { type IntlString, getEmbeddedLabel, getResource, translate } from '@hcengineering/platform'
import { createQuery, getClient } from '@hcengineering/presentation'
import { type TemplateDataProvider } from '@hcengineering/templates'
import {
  getCurrentResolvedLocation,
  getPanelURI,
  type LabelAndProps,
  type Location,
  type ResolvedLocation,
  type TabItem
} from '@hcengineering/ui'
import view, { type Filter, type GrouppingManager } from '@hcengineering/view'
import { accessDeniedStore, FilterQuery } from '@hcengineering/view-resources'
import { derived, get, writable } from 'svelte/store'
import { type LocationData } from '@hcengineering/workbench'

import contact from './plugin'
import { personStore } from '.'

export function formatDate (dueDateMs: Timestamp): string {
  return new Date(dueDateMs).toLocaleString('default', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export async function employeeSort (client: TxOperations, value: Array<Ref<Employee>>): Promise<Array<Ref<Employee>>> {
  const h = client.getHierarchy()
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
      const name1 = employee1 != null ? getName(h, employee1) : ''
      const name2 = employee2 != null ? getName(h, employee2) : ''

      return name1.localeCompare(name2)
    }

    return 0
  })
}

export async function filterChannelHasMessagesResult (filter: Filter, onUpdate: () => void): Promise<ObjQueryType<any>> {
  const result = await getRefs(filter, onUpdate, true)
  return { $in: result }
}

export async function filterChannelHasNewMessagesResult (
  filter: Filter,
  onUpdate: () => void
): Promise<ObjQueryType<any>> {
  const inboxClient = (await getResource(notification.function.GetInboxNotificationsClient))()
  const result = await getRefs(
    filter,
    onUpdate,
    undefined,
    get(inboxClient.contextByDoc),
    get(inboxClient.inboxNotificationsByContext)
  )
  return { $in: result }
}

export async function filterChannelInResult (filter: Filter, onUpdate: () => void): Promise<ObjQueryType<any>> {
  const result = await getRefs(filter, onUpdate)
  return { $in: result }
}

export async function filterChannelNinResult (filter: Filter, onUpdate: () => void): Promise<ObjQueryType<any>> {
  const result = await getRefs(filter, onUpdate)
  return { $nin: result }
}

export async function getRefs (
  filter: Filter,
  onUpdate: () => void,
  hasMessages?: boolean,
  docUpdates?: Map<Ref<Doc>, DocNotifyContext>,
  inboxNotificationsByContext?: Map<Ref<DocNotifyContext>, InboxNotification[]>
): Promise<Array<Ref<Doc>>> {
  const lq = FilterQuery.getLiveQuery(filter.index)
  const client = getClient()
  const mode = await client.findOne(view.class.FilterMode, { _id: filter.mode })
  if (mode === undefined) return []
  const promise = new Promise<Array<Ref<Doc>>>((resolve, reject) => {
    const hasMessagesQuery = hasMessages === true ? { items: { $gt: 0 } } : {}
    const refresh = lq.query(
      contact.class.Channel,
      {
        provider: { $in: filter.value },
        ...hasMessagesQuery
      },
      (refs) => {
        const filteredRefs =
          docUpdates !== undefined && inboxNotificationsByContext !== undefined
            ? refs.filter((channel) => {
              const docUpdate = docUpdates.get(channel._id)
              return docUpdate != null
                ? inboxNotificationsByContext.get(docUpdate._id)?.some(({ isViewed }) => !isViewed)
                : (channel.items ?? 0) > 0
            })
            : refs
        const result = Array.from(new Set(filteredRefs.map((p) => p.attachedTo)))
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
  const me = getCurrentAccount() as PersonAccount
  const client = getClient()
  const employee = await client.findOne(contact.class.Person, { _id: me.person })
  return employee !== undefined ? formatName(employee.name) : ''
}

export async function getCurrentEmployeeEmail (): Promise<string> {
  const me = getCurrentAccount() as PersonAccount
  return me.email
}

export async function getCurrentEmployeePosition (): Promise<string | undefined> {
  const me = getCurrentAccount() as PersonAccount
  const client = getClient()
  const employee = await client.findOne<Employee>(contact.mixin.Employee, { _id: me.person as Ref<Employee> })
  if (employee !== undefined) {
    return employee.position ?? ''
  }
}

export async function getContactName (provider: TemplateDataProvider): Promise<string | undefined> {
  const value = provider.get(contact.class.Contact) as Contact
  if (value === undefined) return
  const client = getClient()
  const hierarchy = client.getHierarchy()
  if (hierarchy.isDerived(value._class, contact.class.Person)) {
    return getName(client.getHierarchy(), value)
  } else {
    return value.name
  }
}

export async function getContactLastName (provider: TemplateDataProvider): Promise<string | undefined> {
  const value = provider.get(contact.class.Contact) as Contact
  if (value === undefined) return
  const client = getClient()
  const hierarchy = client.getHierarchy()
  if (hierarchy.isDerived(value._class, contact.class.Person)) {
    return getLastName(value.name)
  } else {
    return ''
  }
}

export async function getContactFirstName (provider: TemplateDataProvider): Promise<string | undefined> {
  const value = provider.get(contact.class.Contact) as Contact
  if (value === undefined) return
  const client = getClient()
  const hierarchy = client.getHierarchy()
  if (hierarchy.isDerived(value._class, contact.class.Person)) {
    return getFirstName(value.name)
  } else {
    return value.name
  }
}

export async function getContactChannel (value: Contact, provider: Ref<ChannelProvider>): Promise<string | undefined> {
  if (value === undefined) return
  const client = getClient()
  const res = await client.findOne(contact.class.Channel, {
    attachedTo: value._id,
    provider
  })
  return res?.value ?? ''
}

export async function getContactLink (doc: Doc): Promise<Location> {
  const loc = getCurrentResolvedLocation()
  loc.path.length = 2
  loc.fragment = undefined
  loc.query = undefined
  loc.path[2] = contactId
  loc.path[3] = doc._id

  return loc
}

export async function resolveLocation (loc: Location): Promise<ResolvedLocation | undefined> {
  if (loc.path[2] !== contactId) {
    return undefined
  }

  const id = loc.path[3] as Ref<Contact>
  if (id !== undefined) {
    return await generateLocation(loc, id)
  }
}

async function generateLocation (loc: Location, id: Ref<Contact>): Promise<ResolvedLocation | undefined> {
  const client = getClient()
  const doc = await client.findOne(contact.class.Contact, { _id: id })
  if (doc === undefined) {
    accessDeniedStore.set(true)
    console.error(`Could not find contact ${id}.`)
    return undefined
  }
  const appComponent = loc.path[0] ?? ''
  const workspace = loc.path[1] ?? ''
  const special = client.getHierarchy().isDerived(doc._class, contact.class.Organization)
    ? 'companies'
    : client.getHierarchy().isDerived(doc._class, contact.mixin.Employee)
      ? 'employees'
      : 'persons'

  const objectPanel = client.getHierarchy().classHierarchyMixin(doc._class as Ref<Class<Doc>>, view.mixin.ObjectPanel)
  const component = objectPanel?.component ?? view.component.EditDoc

  return {
    loc: {
      path: [appComponent, workspace],
      fragment: getPanelURI(component, doc._id, doc._class, 'content')
    },
    defaultLocation: {
      path: [appComponent, workspace, contactId, special],
      fragment: getPanelURI(component, doc._id, doc._class, 'content')
    }
  }
}

export const employeeByIdStore = writable<IdMap<WithLookup<Employee>>>(new Map())
export const employeesStore = writable<Array<WithLookup<Employee>>>([])

export const personAccountByIdStore = writable<IdMap<PersonAccount>>(new Map())

export const channelProviders = writable<ChannelProvider[]>([])

export const personAccountPersonByIdStore = writable<IdMap<WithLookup<Person>>>(new Map())

export const personIdByAccountId = derived(personAccountByIdStore, (vals) => {
  return new Map<Ref<PersonAccount>, Ref<Person>>(Array.from(vals.values()).map((it) => [it._id, it.person]))
})

export const personAccountByPersonId = derived(personAccountByIdStore, (vals) => {
  return groupByArray(Array.from(vals.values()), (it) => it.person)
})

export const statusByUserStore = writable<Map<Ref<Account>, UserStatus>>(new Map())

export const personByIdStore = derived([personAccountPersonByIdStore, employeeByIdStore], (vals) => {
  const m1 = Array.from(vals[0].entries())
  const m2 = Array.from(vals[1].entries())
  return new Map([...m1, ...m2])
})

function fillStores (): void {
  const client = getClient()

  if (client !== undefined) {
    const accountPersonQuery = createQuery(true)

    const query = createQuery(true)
    query.query(contact.mixin.Employee, { active: { $in: [true, false] } }, (res) => {
      employeesStore.set(res)
      employeeByIdStore.set(toIdMap(res))
    })

    const accountQ = createQuery(true)
    accountQ.query(contact.class.PersonAccount, {}, (res) => {
      personAccountByIdStore.set(toIdMap(res))

      const persons = res.map((it) => it.person)

      accountPersonQuery.query<Person>(contact.class.Person, { _id: { $in: persons } }, (res) => {
        const personIn = toIdMap(res)
        personAccountPersonByIdStore.set(personIn)
      })
    })

    const providerQuery = createQuery(true)
    providerQuery.query(contact.class.ChannelProvider, {}, (res) => {
      channelProviders.set(res)
    })
  } else {
    setTimeout(() => {
      fillStores()
    }, 50)
  }
}

fillStores()

const userStatusesQuery = createQuery(true)

export function loadUsersStatus (): void {
  userStatusesQuery.query(core.class.UserStatus, {}, (res) => {
    statusByUserStore.set(new Map(res.map((it) => [it.user, it])))
  })
}

export function getAvatarTypeDropdownItems (hasGravatar: boolean, imageOnly?: boolean): TabItem[] {
  if (imageOnly === true) {
    return [
      {
        id: AvatarType.IMAGE,
        labelIntl: contact.string.UseImage
      }
    ]
  }
  return [
    {
      id: AvatarType.COLOR,
      labelIntl: contact.string.UseColor
    },
    {
      id: AvatarType.IMAGE,
      labelIntl: contact.string.UseImage
    },
    ...(hasGravatar
      ? [
          {
            id: AvatarType.GRAVATAR,
            labelIntl: contact.string.UseGravatar
          }
        ]
      : [])
  ]
}

export async function contactTitleProvider (client: Client, ref: Ref<Contact>, doc?: Contact): Promise<string> {
  const object = doc ?? (await client.findOne(contact.class.Contact, { _id: ref }))
  if (object === undefined) return ''
  return getName(client.getHierarchy(), object)
}

export function getPersonTooltip (client: Client, value: Person | null | undefined): LabelAndProps | undefined {
  const hierarchy = client.getHierarchy()

  return value == null
    ? undefined
    : {
        label: getEmbeddedLabel(getName(hierarchy, value))
      }
}

export async function channelIdentifierProvider (client: Client, ref: Ref<Channel>, doc?: Channel): Promise<string> {
  const channel = doc ?? (await client.findOne(contact.class.Channel, { _id: ref }))
  if (channel === undefined) return ''

  const provider = await client.findOne(contact.class.ChannelProvider, { _id: channel.provider })

  if (provider === undefined) return channel.value

  return await translate(provider.label, {})
}

export async function channelTitleProvider (client: Client, ref: Ref<Channel>, doc?: Channel): Promise<string> {
  const channel = doc ?? (await client.findOne(contact.class.Channel, { _id: ref }))

  if (channel === undefined) return ''

  return channel.value
}

/**
 * @public
 */
export const grouppingPersonManager: GrouppingManager = {
  groupByCategories: groupByPersonAccountCategories,
  groupValues: groupPersonAccountValues,
  groupValuesWithEmpty: groupPersonAccountValuesWithEmpty,
  hasValue: hasPersonAccountValue
}

/**
 * @public
 */
export function groupByPersonAccountCategories (categories: any[]): AggregateValue[] {
  const mgr = get(personStore)

  const existingCategories: AggregateValue[] = [new AggregateValue(undefined, [])]
  const personMap = new Map<string, AggregateValue>()

  const usedSpaces = new Set<Ref<Space>>()
  const personAccountList: Array<WithLookup<PersonAccount>> = []
  for (const v of categories) {
    const personAccount = mgr.getIdMap().get(v)
    if (personAccount !== undefined) {
      personAccountList.push(personAccount)
      usedSpaces.add(personAccount.space)
    }
  }

  for (const personAccount of personAccountList) {
    if (personAccount !== undefined) {
      let fst = personMap.get(personAccount.person)
      if (fst === undefined) {
        const people = mgr
          .getDocs()
          .filter(
            (it) => it.person === personAccount.person && (categories.includes(it._id) || usedSpaces.has(it.space))
          )
          .sort((a, b) => a.email.localeCompare(b.email))
          .map((it) => new AggregateValueData(it.person, it._id, it.space))
        fst = new AggregateValue(personAccount.person, people)
        personMap.set(personAccount.person, fst)
        if (fst.name === undefined) {
          existingCategories[0] = new AggregateValue(undefined, [...existingCategories[0].values, ...fst.values])
          // Join with first value
        } else {
          existingCategories.push(fst)
        }
      }
    }
  }
  return existingCategories
}

/**
 * @public
 */
export function groupPersonAccountValues (val: Doc[], targets: Set<any>): Doc[] {
  const values = val
  const result: Doc[] = []
  const unique = [...new Set(val.map((c) => (c as PersonAccount).person))]
  unique.forEach((label, i) => {
    let exists = false
    values.forEach((c) => {
      if ((c as PersonAccount).person === label) {
        if (!exists) {
          result[i] = c
          exists = targets.has(c?._id)
        }
      }
    })
  })
  return result
}

/**
 * @public
 */
export function hasPersonAccountValue (value: Doc | undefined | null, values: any[]): boolean {
  const mgr = get(personStore)
  const personSet = new Set(mgr.filter((it) => it.person === (value as PersonAccount)?.person).map((it) => it._id))
  return values.some((it) => personSet.has(it))
}

/**
 * @public
 */
export function groupPersonAccountValuesWithEmpty (
  hierarchy: Hierarchy,
  _class: Ref<Class<Doc>>,
  key: string,
  query: DocumentQuery<Doc> | undefined
): Array<Ref<Doc>> {
  const mgr = get(personStore)
  let personAccountList = mgr.getDocs()
  if (query !== undefined) {
    const { [key]: st, space } = query
    const resQuery: DocumentQuery<Doc> = {}
    if (space !== undefined) {
      resQuery.space = space
    }
    if (st !== undefined) {
      resQuery._id = st
    }
    personAccountList = matchQuery<Doc>(personAccountList, resQuery, _class, hierarchy) as unknown as Array<
    WithLookup<PersonAccount>
    >
  }
  return personAccountList.map((it) => it._id)
}

export async function resolveLocationData (loc: Location): Promise<LocationData> {
  const special = loc.path[3]
  const specialsData: Record<string, IntlString> = {
    companies: contact.string.Organizations,
    employees: contact.string.Employees,
    persons: contact.string.Persons
  }

  if (special == null) {
    return { nameIntl: contact.string.Contacts }
  }

  const specialLabel = specialsData[special]
  if (specialLabel !== undefined) {
    return { nameIntl: specialLabel }
  }

  const client = getClient()
  const object = await client.findOne(contact.class.Contact, { _id: special as Ref<Contact> })

  if (object === undefined) {
    return { nameIntl: specialLabel }
  }

  return { name: getName(client.getHierarchy(), object) }
}
