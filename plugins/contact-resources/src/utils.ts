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

import { type AccountClient, getClient as getAccountClientRaw } from '@hcengineering/account-client'
import {
  addEmployeeListenrer,
  AvatarType,
  type Channel,
  type ChannelProvider,
  type Contact,
  contactId,
  type Employee,
  formatName,
  getCurrentEmployee,
  getFirstName,
  getLastName,
  getName,
  contactCache,
  getPersonRefByPersonId as getPersonRefByPersonIdBase,
  getPersonRefsByPersonIds as getPersonRefsByPersonIdsBase,
  getPersonByPersonId as getPersonByPersonIdBase,
  getPersonsByPersonIds as getPersonsByPersonIdsBase,
  getPersonByPersonRef as getPersonByPersonRefBase,
  getPersonsByPersonRefs as getPersonsByPersonRefsBase,
  getPersonRefByPersonIdCb as getPersonRefByPersonIdCbBase,
  getPersonRefsByPersonIdsCb as getPersonRefsByPersonIdsCbBase,
  getPersonByPersonIdCb as getPersonByPersonIdCbBase,
  getPersonsByPersonIdsCb as getPersonsByPersonIdsCbBase,
  getPersonByPersonRefCb as getPersonByPersonRefCbBase,
  getPersonsByPersonRefsCb as getPersonsByPersonRefsCbBase,
  getSocialIdByPersonId as getSocialIdByPersonIdBase,
  getSocialIdByPersonIdCb as getSocialIdByPersonIdCbBase,
  type PermissionsBySpace,
  type PermissionsStore,
  type Person,
  type PersonsByPermission,
  type MembersBySpace,
  type SocialIdentity
} from '@hcengineering/contact'
import core, {
  type AccountUuid,
  type AggregateValue,
  type Class,
  type Client,
  type Doc,
  type DocumentQuery,
  getCurrentAccount,
  type Hierarchy,
  type IdMap,
  notEmpty,
  type ObjQueryType,
  type Permission,
  type PersonId,
  pickPrimarySocialId,
  type Ref,
  SocialIdType,
  type Space,
  type Timestamp,
  toIdMap,
  type TxOperations,
  type TypedSpace,
  type UserStatus,
  type WithLookup
} from '@hcengineering/core'
import login from '@hcengineering/login'
import notification, { type DocNotifyContext, type InboxNotification } from '@hcengineering/notification'
import { getMetadata, getResource, type IntlString, translate } from '@hcengineering/platform'
import presentation, { addTxListener, createQuery, getClient, onClient } from '@hcengineering/presentation'
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
import { type LocationData } from '@hcengineering/workbench'
import { derived, get, type Readable, writable } from 'svelte/store'

import contact from './plugin'
import { getPreviewPopup } from './components/person/utils'
import ContactCacheStoreManager from './cache'

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
  const me = getCurrentEmployee()
  const employee = await getClient().findOne(contact.class.Person, { _id: me })
  return employee !== undefined ? formatName(employee.name) : ''
}

export async function getCurrentEmployeeEmail (): Promise<string> {
  const me = getCurrentEmployee()
  const emailSocialId = await getClient().findOne(contact.class.SocialIdentity, {
    type: SocialIdType.EMAIL,
    attachedTo: me,
    attachedToClass: contact.class.Person
  })
  return emailSocialId?.value ?? ''
}

export async function getCurrentEmployeePosition (): Promise<string | undefined> {
  const me = getCurrentEmployee()
  const employee = await getClient().findOne<Employee>(contact.mixin.Employee, { _id: me })
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
  const isEmployee = client.getHierarchy().hasMixin(doc, contact.mixin.Employee)
  const appComponent = loc.path[0] ?? ''
  const workspace = loc.path[1] ?? ''
  const special = client.getHierarchy().isDerived(doc._class, contact.class.Organization)
    ? 'companies'
    : isEmployee
      ? 'employees'
      : 'persons'

  const objectPanel = client.getHierarchy().classHierarchyMixin(doc._class as Ref<Class<Doc>>, view.mixin.ObjectPanel)
  const component = objectPanel?.component ?? view.component.EditDoc

  return {
    loc: {
      path: [appComponent, workspace],
      fragment: getPanelURI(component, doc._id, isEmployee ? contact.mixin.Employee : doc._class, 'content')
    },
    defaultLocation: {
      path: [appComponent, workspace, contactId, special],
      fragment: getPanelURI(component, doc._id, isEmployee ? contact.mixin.Employee : doc._class, 'content')
    }
  }
}

/**
 * [Ref<Employee> => Employee] mapping
 */
export const employeeByIdStore = writable<IdMap<WithLookup<Employee>>>(new Map())

/**
 * Tracks current employee
 */
export const currentEmployeeRefStore = writable<Ref<Employee> | undefined>(getCurrentEmployee())

addEmployeeListenrer((ref) => {
  currentEmployeeRefStore.set(ref)
})

export const myEmployeeStore = derived(
  [currentEmployeeRefStore, employeeByIdStore],
  ([currentEmployeeRef, employeeById]) => {
    return currentEmployeeRef !== undefined ? employeeById.get(currentEmployeeRef) : undefined
  }
)

/**
 * [Ref<Employee> => PersonId (primary)] mapping
 */
export const primarySocialIdByEmployeeRefStore = writable<Map<Ref<Employee>, PersonId>>(new Map())

/**
 * [AccountUuid => Ref<Person>] mapping
 */
export const employeeRefByAccountUuidStore = writable<Map<AccountUuid, Ref<Employee>>>(new Map())

/**
 * [PersonId (social ID) => Employee] mapping
 */
export const employeeByPersonIdStore = writable<Map<PersonId, Employee>>(new Map())

/**
 * [string (social key) => Employee] mapping
 */
export const employeeBySocialKeyStore = writable<Map<string, Employee>>(new Map())

/**
 * [AccountUuid => Person] mapping
 */
export const employeeByAccountStore = derived(
  [employeeRefByAccountUuidStore, employeeByIdStore],
  ([personRefByAccount, employeeById]) => {
    const mapped = Array.from(personRefByAccount.entries())
      .map(([account, employeeRef]) => {
        const employee = employeeById.get(employeeRef)
        if (employee === undefined) {
          return undefined
        }
        return [account, employee] as const
      })
      .filter(notEmpty)
    return new Map(mapped)
  }
)

export const channelProviders = writable<ChannelProvider[]>([])
export const statusByUserStore = writable<Map<AccountUuid, UserStatus>>(new Map())

const providerQuery = createQuery(true)
const employeesQuery = createQuery(true)

onClient(() => {
  providerQuery.query(contact.class.ChannelProvider, {}, (res) => {
    channelProviders.set(res)
  })

  employeesQuery.query(
    contact.mixin.Employee,
    {},
    (res) => {
      const personIdToEmployee = new Map<PersonId, Employee>()
      const socialKeyToEmployee = new Map<string, Employee>()
      for (const employee of res) {
        // warmup persons cache with employees
        contactCache.fillCachesForPersonRef(employee._id, employee)

        for (const socialId of (employee.$lookup?.socialIds ?? []) as SocialIdentity[]) {
          personIdToEmployee.set(socialId._id, employee)
          socialKeyToEmployee.set(socialId.key, employee)
        }
      }
      employeeByPersonIdStore.set(personIdToEmployee)
      employeeBySocialKeyStore.set(socialKeyToEmployee)
      primarySocialIdByEmployeeRefStore.set(
        new Map(
          res
            .map((e) => {
              const socialIds = (e.$lookup?.socialIds ?? []) as SocialIdentity[]
              const primaryId = socialIds.length !== 0 ? pickPrimarySocialId(socialIds) : undefined
              if (primaryId === undefined) {
                return null
              }

              return [e._id, primaryId._id] as const
            })
            .filter(notEmpty)
        )
      )

      // Remove lookups before storing the map as the interface doesn't expose it anyways
      for (const employee of res) {
        delete employee.$lookup
      }
      employeeByIdStore.set(toIdMap(res))

      // We may need to extend this later with guests and github users
      employeeRefByAccountUuidStore.set(
        new Map(res.filter((p) => p.personUuid != null).map((p) => [p.personUuid as AccountUuid, p._id] as const))
      )
    },
    {
      lookup: {
        _id: { socialIds: contact.class.SocialIdentity }
      }
    }
  )
})

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
  return value == null ? undefined : getPreviewPopup(value, true)
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
  // TODO: FIXME
  throw new Error('Not implemented')
  // const mgr = get(personStore)

  // const existingCategories: AggregateValue[] = [new AggregateValue(undefined, [])]
  // const personMap = new Map<string, AggregateValue>()

  // const usedSpaces = new Set<Ref<Space>>()
  // const personAccountList: Array<WithLookup<PersonAccount>> = []
  // for (const v of categories) {
  //   const personAccount = mgr.getIdMap().get(v)
  //   if (personAccount !== undefined) {
  //     personAccountList.push(personAccount)
  //     usedSpaces.add(personAccount.space)
  //   }
  // }

  // for (const personAccount of personAccountList) {
  //   if (personAccount !== undefined) {
  //     let fst = personMap.get(personAccount.person)
  //     if (fst === undefined) {
  //       const people = mgr
  //         .getDocs()
  //         .filter(
  //           (it) => it.person === personAccount.person && (categories.includes(it._id) || usedSpaces.has(it.space))
  //         )
  //         .sort((a, b) => a.email.localeCompare(b.email))
  //         .map((it) => new AggregateValueData(it.person, it._id, it.space))
  //       fst = new AggregateValue(personAccount.person, people)
  //       personMap.set(personAccount.person, fst)
  //       if (fst.name === undefined) {
  //         existingCategories[0] = new AggregateValue(undefined, [...existingCategories[0].values, ...fst.values])
  //         // Join with first value
  //       } else {
  //         existingCategories.push(fst)
  //       }
  //     }
  //   }
  // }
  // return existingCategories
}

/**
 * @public
 */
export function groupPersonAccountValues (val: Doc[], targets: Set<any>): Doc[] {
  // TODO: FIXME
  throw new Error('Not implemented')
  // const values = val
  // const result: Doc[] = []
  // const unique = [...new Set(val.map((c) => (c as PersonAccount).person))]
  // unique.forEach((label, i) => {
  //   let exists = false
  //   values.forEach((c) => {
  //     if ((c as PersonAccount).person === label) {
  //       if (!exists) {
  //         result[i] = c
  //         exists = targets.has(c?._id)
  //       }
  //     }
  //   })
  // })
  // return result
}

/**
 * @public
 */
export function hasPersonAccountValue (value: Doc | undefined | null, values: any[]): boolean {
  // TODO: FIXME
  throw new Error('Not implemented')
  // const mgr = get(personStore)
  // const personSet = new Set(mgr.filter((it) => it.person === (value as PersonAccount)?.person).map((it) => it._id))
  // return values.some((it) => personSet.has(it))
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
  // TODO: FIXME
  throw new Error('Not implemented')
  // const mgr = get(personStore)
  // let personAccountList = mgr.getDocs()
  // if (query !== undefined) {
  //   const { [key]: st, space } = query
  //   const resQuery: DocumentQuery<Doc> = {}
  //   if (space !== undefined) {
  //     resQuery.space = space
  //   }
  //   if (st !== undefined) {
  //     resQuery._id = st
  //   }
  //   personAccountList = matchQuery<Doc>(personAccountList, resQuery, _class, hierarchy) as unknown as Array<
  //   WithLookup<PersonAccount>
  //   >
  // }
  // return personAccountList.map((it) => it._id)
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

export function checkMyPermission (_id: Ref<Permission>, space: Ref<TypedSpace>, store: PermissionsStore): boolean {
  const arePermissionsDisabled = getMetadata(core.metadata.DisablePermissions) ?? false
  if (arePermissionsDisabled) return true
  return (store.whitelist.has(space) || store.ps[space]?.has(_id)) ?? false
}

export function getPermittedPersons (
  _id: Ref<Permission>,
  space: Ref<TypedSpace>,
  store: PermissionsStore
): Array<Ref<Person>> {
  const arePermissionsDisabled = getMetadata(core.metadata.DisablePermissions) ?? false
  if (arePermissionsDisabled) return Array.from(store.ms[space] ?? [])
  return store.whitelist.has(space) ? Array.from(store.ms[space] ?? []) : Array.from(store.ap[space]?.[_id] ?? [])
}

const spacesStore = writable<Space[]>([])

export const permissionsStore = derived(
  [spacesStore, employeeRefByAccountUuidStore],
  ([spaces, personRefByAccount]) => {
    const whitelistedSpaces = new Set<Ref<Space>>()
    const permissionsBySpace: PermissionsBySpace = {}
    const employeesByPermission: PersonsByPermission = {}
    const membersBySpace: MembersBySpace = {}
    const client = getClient()
    const hierarchy = client.getHierarchy()

    for (const s of spaces) {
      membersBySpace[s._id] = new Set(s.members.map((m) => personRefByAccount.get(m)).filter(notEmpty))
      if (hierarchy.isDerived(s._class, core.class.TypedSpace)) {
        const type = client.getModel().findAllSync(core.class.SpaceType, { _id: (s as TypedSpace).type })[0]
        const mixin = type?.targetClass

        if (mixin === undefined) {
          permissionsBySpace[s._id] = new Set()
          employeesByPermission[s._id] = {}
          continue
        }

        const asMixin = hierarchy.as(s, mixin)
        const roles = client.getModel().findAllSync(core.class.Role, { attachedTo: type._id })
        const myRoles = roles.filter((r) => ((asMixin as any)[r._id] ?? []).includes(getCurrentAccount().uuid))
        permissionsBySpace[s._id] = new Set(myRoles.flatMap((r) => r.permissions))

        employeesByPermission[s._id] = {}

        for (const role of roles) {
          const assignment: AccountUuid[] = (asMixin as any)[role._id] ?? []

          if (assignment.length === 0) {
            continue
          }

          for (const permissionId of role.permissions) {
            if (employeesByPermission[s._id][permissionId] === undefined) {
              employeesByPermission[s._id][permissionId] = new Set()
            }

            assignment.forEach((acc) => {
              const personRef = personRefByAccount.get(acc)
              if (personRef !== undefined) {
                employeesByPermission[s._id][permissionId].add(personRef)
              }
            })
          }
        }
      } else {
        whitelistedSpaces.add(s._id)
      }
    }

    return {
      ps: permissionsBySpace,
      ap: employeesByPermission,
      ms: membersBySpace,
      whitelist: whitelistedSpaces
    }
  }
)

const spaceTypesQuery = createQuery(true)
const permissionsQuery = createQuery(true)
type TargetClassesProjection = Record<Ref<Class<Space>>, number>

spaceTypesQuery.query(core.class.SpaceType, {}, (types) => {
  const targetClasses = types.reduce<TargetClassesProjection>((acc, st) => {
    acc[st.targetClass] = 1
    return acc
  }, {})

  permissionsQuery.query(
    core.class.Space,
    {},
    (res) => {
      spacesStore.set(res)
    },
    {
      showArchived: true,
      projection: {
        _id: 1,
        type: 1,
        members: 1,
        ...targetClasses
      } as any
    }
  )
})

export function getAccountClient (): AccountClient {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)
  const token = getMetadata(presentation.metadata.Token)

  return getAccountClientRaw(accountsUrl, token)
}

export async function getPersonRefByPersonId (personId: PersonId): Promise<Ref<Person> | null> {
  return await getPersonRefByPersonIdBase(getClient(), personId)
}

export function getPersonRefByPersonIdCb (personId: PersonId, cb: (person: Ref<Person> | null) => void): void {
  getPersonRefByPersonIdCbBase(getClient(), personId, cb)
}

export async function getPersonRefsByPersonIds (personIds: PersonId[]): Promise<Map<PersonId, Ref<Person>>> {
  return await getPersonRefsByPersonIdsBase(getClient(), personIds)
}

export function getPersonRefsByPersonIdsCb (
  personIds: PersonId[],
  cb: (personRefs: Map<PersonId, Ref<Person>>) => void
): void {
  getPersonRefsByPersonIdsCbBase(getClient(), personIds, cb)
}

export async function getPersonByPersonId (personId: PersonId): Promise<Person | null> {
  return await getPersonByPersonIdBase(getClient(), personId)
}

export function getPersonByPersonIdCb (personId: PersonId, cb: (person: Readonly<Person> | null) => void): void {
  getPersonByPersonIdCbBase(getClient(), personId, cb)
}

export async function getPersonsByPersonIds (personIds: PersonId[]): Promise<Map<PersonId, Readonly<Person>>> {
  return await getPersonsByPersonIdsBase(getClient(), personIds)
}

export function getPersonsByPersonIdsCb (
  personIds: PersonId[],
  cb: (persons: Map<PersonId, Readonly<Person>>) => void
): void {
  getPersonsByPersonIdsCbBase(getClient(), personIds, cb)
}

export async function getPersonByPersonRef (personRef: Ref<Person>): Promise<Person | null> {
  return await getPersonByPersonRefBase(getClient(), personRef)
}

export function getPersonByPersonRefCb (personRef: Ref<Person>, cb: (person: Readonly<Person> | null) => void): void {
  getPersonByPersonRefCbBase(getClient(), personRef, cb)
}

export async function getPersonsByPersonRefs (
  personRefs: Array<Ref<Person>>
): Promise<Map<Ref<Person>, Readonly<Person>>> {
  return await getPersonsByPersonRefsBase(getClient(), personRefs)
}

export function getPersonsByPersonRefsCb (
  personRefs: Array<Ref<Person>>,
  cb: (persons: Map<Ref<Person>, Readonly<Person>>) => void
): void {
  getPersonsByPersonRefsCbBase(getClient(), personRefs, cb)
}

export async function getSocialIdByPersonId (personId: PersonId): Promise<SocialIdentity | null> {
  return await getSocialIdByPersonIdBase(getClient(), personId)
}

export function getSocialIdByPersonIdCb (personId: PersonId, cb: (socialId: SocialIdentity | null) => void): void {
  getSocialIdByPersonIdCbBase(getClient(), personId, cb)
}

addTxListener(contactCache.handleTx)

export const contactCacheStoreManager = ContactCacheStoreManager.instance

export function getPersonRefByPersonIdStore (personIds: PersonId[]): Readable<Map<PersonId, Ref<Person>>> {
  return contactCacheStoreManager.getPersonRefByPersonIdStore(personIds)
}

export function getPersonByPersonIdStore (personIds: PersonId[]): Readable<Map<PersonId, Readonly<Person>>> {
  return contactCacheStoreManager.getPersonByPersonIdStore(personIds)
}

export function getPersonByPersonRefStore (
  personRefs: Array<Ref<Person>>
): Readable<Map<Ref<Person>, Readonly<Person>>> {
  return contactCacheStoreManager.getPersonByPersonRefStore(personRefs)
}
