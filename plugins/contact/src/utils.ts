//
// Copyright © 2023 Hardcore Engineering Inc.
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
  Account,
  AccountRole,
  AccountUuid,
  AttachedData,
  buildSocialIdString,
  Class,
  Client,
  Doc,
  FindResult,
  generateId,
  Hierarchy,
  MeasureContext,
  notEmpty,
  Person as GlobalPerson,
  PersonId,
  pickPrimarySocialId,
  Ref,
  SocialId,
  toIdMap,
  TxFactory
} from '@hcengineering/core'
import { getMetadata } from '@hcengineering/platform'
import { ColorDefinition } from '@hcengineering/ui'
import contact, { AvatarProvider, AvatarType, Channel, Contact, Employee, Person, SocialIdentity, SocialIdentityRef } from '.'

import { AVATAR_COLORS, GravatarPlaceholderType } from './types'
import ContactCache from './cache'

let currentEmployee: Ref<Employee>

const employeeListeners: ((ref: Ref<Employee>) => void)[] = []
/**
 * @public
 * @returns
 */
export function getCurrentEmployee (): Ref<Employee> {
  return currentEmployee
}

export function addEmployeeListenrer (l: (ref: Ref<Employee>) => void): void {
  employeeListeners.push(l)
}

/**
 * @public
 * @param employee -
 */
export function setCurrentEmployee (employee: Ref<Employee>): void {
  currentEmployee = employee
  for (const l of employeeListeners) {
    l(employee)
  }
}

/**
 * @public
 */
export function getAvatarColorForId (id: string | null | undefined): string {
  if (id == null) return AVATAR_COLORS[0].color
  let hash = 0

  for (let i = 0; i < id.length; i++) {
    hash += id.charCodeAt(i)
  }

  return AVATAR_COLORS[hash % AVATAR_COLORS.length].color
}

/**
 * @public
 */
export function getAvatarColors (): readonly ColorDefinition[] {
  return AVATAR_COLORS
}

/**
 * @public
 */
export function getAvatarColorName (color: string): string {
  return AVATAR_COLORS.find((col) => col.color === color)?.name ?? AVATAR_COLORS[0].name
}

/**
 * @public
 */
export function getAvatarProviderId (kind: AvatarType): Ref<AvatarProvider> | undefined {
  switch (kind) {
    case AvatarType.GRAVATAR:
      return contact.avatarProvider.Gravatar
    case AvatarType.COLOR:
      return contact.avatarProvider.Color
  }
  return contact.avatarProvider.Image
}

/**
 * @public
 */
export function getGravatarUrl (
  gravatarId: string,
  width: number = 64,
  placeholder: GravatarPlaceholderType = 'identicon'
): string {
  return `https://gravatar.com/avatar/${gravatarId}?s=${width}&d=${placeholder}`
}

/**
 * @public
 */
export async function checkHasGravatar (gravatarId: string, fetch?: typeof window.fetch): Promise<boolean> {
  try {
    return (await (fetch ?? window.fetch)(getGravatarUrl(gravatarId, 2048, '404'))).ok
  } catch {
    return false
  }
}

/**
 * @public
 */
export async function findContacts (
  client: Client,
  _class: Ref<Class<Doc>>,
  name: string,
  channels: AttachedData<Channel>[]
): Promise<{ contacts: Contact[], channels: AttachedData<Channel>[] }> {
  if (channels.length === 0 && name.length === 0) {
    return { contacts: [], channels: [] }
  }
  // Take only first part of first name for match.
  const values = channels.map((it) => it.value)

  // Same name persons

  const potentialChannels = await client.findAll(contact.class.Channel, { value: { $in: values } }, { limit: 1000 })
  let potentialContactIds = Array.from(new Set(potentialChannels.map((it) => it.attachedTo as Ref<Contact>)).values())

  if (potentialContactIds.length === 0) {
    if (client.getHierarchy().isDerived(_class, contact.class.Person)) {
      const firstName = getFirstName(name).split(' ').shift() ?? ''
      const lastName = getLastName(name)
      // try match using just first/last name
      potentialContactIds = (
        await client.findAll(contact.class.Contact, { name: { $like: `${lastName}%${firstName}%` } }, { limit: 100 })
      ).map((it) => it._id)
      if (potentialContactIds.length === 0) {
        return { contacts: [], channels: [] }
      }
    } else if (client.getHierarchy().isDerived(_class, contact.class.Organization)) {
      // try match using just first/last name
      potentialContactIds = (
        await client.findAll(contact.class.Contact, { name: { $like: `${name}` } }, { limit: 100 })
      ).map((it) => it._id)
      if (potentialContactIds.length === 0) {
        return { contacts: [], channels: [] }
      }
    }
  }

  const potentialPersons: FindResult<Contact> = await client.findAll(
    contact.class.Contact,
    { _id: { $in: potentialContactIds } },
    {
      lookup: {
        _id: {
          channels: contact.class.Channel
        }
      }
    }
  )

  const result: Contact[] = []
  const resChannels: AttachedData<Channel>[] = []
  for (const c of potentialPersons) {
    let matches = 0
    if (c.name === name) {
      matches++
    }
    for (const ch of (c.$lookup?.channels as Channel[]) ?? []) {
      for (const chc of channels) {
        if (chc.provider === ch.provider && chc.value === ch.value.trim()) {
          // We have matched value
          resChannels.push(chc)
          matches += 2
          break
        }
      }
    }

    if (matches > 0) {
      result.push(c)
    }
  }
  return { contacts: result, channels: resChannels }
}

/**
 * @public
 */
export async function findPerson (client: Client, name: string, channels: AttachedData<Channel>[]): Promise<Person[]> {
  const result = await findContacts(client, contact.class.Person, name, channels)
  return result.contacts as Person[]
}

const SEP = ','

/**
 * @public
 */
export function combineName (first: string, last: string): string {
  return last + SEP + first
}

/**
 * @public
 */
export function getFirstName (name: string): string {
  return name !== undefined ? name.substring(name.indexOf(SEP) + 1) : ''
}

/**
 * @public
 */
export function getLastName (name: string): string {
  return name !== undefined ? name.substring(0, name.indexOf(SEP)) : ''
}

/**
 * @public
 */
export function formatName (name: string, lastNameFirst?: string): string {
  const lastNameFirstCombined =
    lastNameFirst !== undefined ? lastNameFirst === 'true' : getMetadata(contact.metadata.LastNameFirst) === true
  return lastNameFirstCombined
    ? getLastName(name) + ' ' + getFirstName(name)
    : getFirstName(name) + ' ' + getLastName(name)
}

/**
 * @public
 */
export function getName (hierarchy: Hierarchy, value: Contact, lastNameFirst?: string): string {
  if (isPerson(hierarchy, value)) {
    return formatName(value.name, lastNameFirst)
  }
  return value.name
}

function isPerson (hierarchy: Hierarchy, value: Contact): value is Person {
  return isPersonClass(hierarchy, value._class)
}

function isPersonClass (hierarchy: Hierarchy, _class: Ref<Class<Doc>>): boolean {
  return hierarchy.isDerived(_class, contact.class.Person)
}

/**
 * @public
 */
export function formatContactName (
  hierarchy: Hierarchy,
  _class: Ref<Class<Doc>>,
  name: string,
  lastNameFirst?: string
): string {
  if (isPersonClass(hierarchy, _class)) {
    return formatName(name, lastNameFirst)
  }
  return name
}

export function includesAny (members: PersonId[], ids: PersonId[]): boolean {
  return members.some((m) => ids.includes(m))
}

export async function getPersonBySocialKey (client: Client, socialKey: string): Promise<Person | undefined> {
  const socialId = await client.findOne(contact.class.SocialIdentity, { key: socialKey })
  if (socialId === undefined) return undefined
  return await client.findOne(contact.class.Person, { _id: socialId?.attachedTo, _class: socialId?.attachedToClass })
}

export async function getEmployeeBySocialId (client: Client, socialIdString: PersonId): Promise<Employee | undefined> {
  const socialId = await client.findOne(contact.class.SocialIdentity, { _id: socialIdString as SocialIdentityRef })

  if (socialId === undefined) return undefined

  return await client.findOne(contact.mixin.Employee, { _id: socialId.attachedTo as Ref<Employee> })
}

export async function getPersonRefsBySocialIds (
  client: Client,
  ids: PersonId[] = []
): Promise<Record<PersonId, Ref<Person>>> {
  const socialIds = await client.findAll(
    contact.class.SocialIdentity,
    ids.length === 0 ? {} : { _id: { $in: ids as SocialIdentityRef[] } }
  )
  const result: Record<PersonId, Ref<Person>> = {}

  for (const socialId of socialIds) {
    result[socialId._id] = socialId.attachedTo
  }

  return result
}

export async function getPrimarySocialId (client: Client, person: Ref<Person>): Promise<PersonId | undefined> {
  const socialIds = await client.findAll(contact.class.SocialIdentity, { attachedTo: person, verifiedOn: { $gt: 0 } })

  if (socialIds.length === 0) {
    return
  }

  return pickPrimarySocialId(socialIds)._id
}

export async function getAllSocialStringsByPersonId (client: Client, personId: PersonId): Promise<PersonId[]> {
  const socialId = await client.findOne(contact.class.SocialIdentity, {
    _id: personId as SocialIdentityRef,
    attachedToClass: contact.class.Person
  })

  if (socialId === undefined) {
    return []
  }

  const socialIds = await client.findAll(contact.class.SocialIdentity, { attachedTo: socialId.attachedTo })

  return socialIds.map((it) => it._id)
}

export async function getAllSocialStringsByPersonRef (client: Client, person: Ref<Person>): Promise<PersonId[]> {
  const socialIds = await client.findAll(contact.class.SocialIdentity, { attachedTo: person })

  return socialIds.map((it) => it._id)
}

export async function getSocialStringsByEmployee (client: Client): Promise<Record<Ref<Person>, PersonId[]>> {
  const employees = await client.findAll(contact.mixin.Employee, { active: true })
  const socialIds = await client.findAll(contact.class.SocialIdentity, {
    attachedTo: { $in: employees.map((it) => it._id) },
    attachedToClass: contact.class.Person
  })
  const socialStringsByPerson: Record<Ref<Employee>, PersonId[]> = {}

  for (const socialId of socialIds) {
    const socialStrings = socialStringsByPerson[socialId.attachedTo as Ref<Employee>]

    if (socialStrings === undefined) {
      socialStringsByPerson[socialId.attachedTo as Ref<Employee>] = []
    }
    socialStrings.push(socialId._id)
  }

  return socialStringsByPerson
}

export async function getAllAccounts (client: Client): Promise<AccountUuid[]> {
  const employees = await client.findAll(contact.mixin.Employee, { active: true })

  return employees.map((it) => it.personUuid).filter(notEmpty)
}

export async function getAllUserAccounts (client: Client): Promise<AccountUuid[]> {
  const employees = await client.findAll(contact.mixin.Employee, { active: true })

  return employees.map((it) => it.personUuid).filter(notEmpty)
}

export async function ensureEmployee (
  ctx: MeasureContext,
  me: Account,
  client: Pick<Client, 'findOne' | 'findAll' | 'tx'>,
  socialIds: SocialId[],
  getGlobalPerson: () => Promise<GlobalPerson | undefined>
): Promise<Ref<Employee> | null> {
  const globalPerson = await getGlobalPerson()
  return await ensureEmployeeForPerson(ctx, me, me, client, socialIds, globalPerson)
}

export async function ensureEmployeeForPerson (
  ctx: MeasureContext,
  me: Account,
  person: Account,
  client: Pick<Client, 'findOne' | 'findAll' | 'tx'>,
  socialIds: SocialId[],
  globalPerson?: GlobalPerson
): Promise<Ref<Employee> | null> {
  const txFactory = new TxFactory(me.primarySocialId)
  const personByUuid = await client.findOne(contact.class.Person, { personUuid: person.uuid })
  let personRef: Ref<Person> | undefined = personByUuid?._id
  if (personRef === undefined) {
    const socialIdentity = await client.findOne(contact.class.SocialIdentity, {
      _id: { $in: person.socialIds as SocialIdentityRef[] }
    })

    // This social id is confirmed globally as we only have ids of confirmed social identities in socialIds array
    personRef = socialIdentity?.attachedTo
  }

  if (personRef === undefined) {
    await ctx.with('create-person', {}, async () => {
      if (globalPerson === undefined) {
        console.error('Cannot get global person')
        return null
      }

      const data = {
        personUuid: person.uuid,
        name: combineName(globalPerson.firstName, globalPerson.lastName),
        city: globalPerson.city,
        avatarType: AvatarType.COLOR
      }
      personRef = generateId()

      const createPersonTx = txFactory.createTxCreateDoc(contact.class.Person, contact.space.Contacts, data, personRef)
      await client.tx(createPersonTx)
    })
  } else if (personByUuid === undefined) {
    const updatePersonTx = txFactory.createTxUpdateDoc(contact.class.Person, contact.space.Contacts, personRef, {
      personUuid: person.uuid
    })
    await client.tx(updatePersonTx)
  }

  const existingIdentifiers = toIdMap(
    await client.findAll(contact.class.SocialIdentity, { _id: { $in: person.socialIds as SocialIdentityRef[] } })
  )

  for (const socialId of socialIds) {
    const existing = existingIdentifiers.get(socialId._id as SocialIdentityRef)

    if (existing === undefined) {
      await ctx.with('create-social-identity', {}, async () => {
        if (personRef === undefined) {
          // something went wrong
          console.error('Person not found')
          return null
        }

        const createSocialIdTx = txFactory.createTxCollectionCUD(
          contact.class.Person,
          personRef,
          contact.space.Contacts,
          'socialIds',
          txFactory.createTxCreateDoc(
            contact.class.SocialIdentity,
            contact.space.Contacts,
            {
              attachedTo: personRef,
              attachedToClass: contact.class.Person,
              collection: 'socialIds',
              type: socialId.type,
              value: socialId.value,
              key: buildSocialIdString(socialId), // TODO: fill it in trigger or on DB level as stored calculated column or smth?
              verifiedOn: socialId.verifiedOn
            },
            socialId._id as SocialIdentityRef
          )
        )
        await client.tx(createSocialIdTx)
      })
    } else {
      // This social identity must be attached to the correct person. If it's not the case, something is wrong.
      // personRef must be readonly after creation and must NEVER be changed.
      if (existing.attachedTo !== personRef) {
        throw new Error('Social identity is attached to the wrong person')
      }

      // Check and update if needed
      if (existing.verifiedOn == null) {
        const updateSocialIdentityTx = txFactory.createTxUpdateDoc(
          contact.class.SocialIdentity,
          contact.space.Contacts,
          existing._id,
          {
            verifiedOn: socialId.verifiedOn
          }
        )
        await client.tx(updateSocialIdentityTx)
      }
    }
  }

  // NOTE: it is important to create Employee after Person and SocialIdentities are ensured so all the triggers applied
  // on Employee creation will be able to properly map things
  const employeeRole = person.role === AccountRole.Guest || person.role === AccountRole.ReadOnlyGuest ? 'GUEST' : 'USER'
  const employee = await client.findOne(contact.mixin.Employee, { _id: personRef as Ref<Employee> })

  if (
    employee === undefined ||
    !Hierarchy.hasMixin(employee, contact.mixin.Employee) ||
    !employee.active ||
    employee.role !== employeeRole
  ) {
    await ctx.with('create-employee', {}, async () => {
      if (personRef === undefined) {
        // something went wrong
        console.error('Person not found')
        return null
      }

      const createEmployeeTx = txFactory.createTxMixin(
        personRef,
        contact.class.Person,
        contact.space.Contacts,
        contact.mixin.Employee,
        {
          active: true,
          role: employeeRole
        }
      )
      await client.tx(createEmployeeTx)
    })
  }

  // TODO: check for merged persons with this one and do the merge
  return personRef as Ref<Employee>
}

export const contactCache = ContactCache.instance

export async function loadCachesForPersonId (client: Client, personId: PersonId): Promise<void> {
  const sidObj = await client.findOne(
    contact.class.SocialIdentity,
    {
      _id: personId as SocialIdentityRef
    },
    {
      lookup: {
        attachedTo: contact.class.Person
      }
    }
  )

  contactCache.fillCachesForPersonId(personId, sidObj)
}

export async function loadCachesForPersonIds (client: Client, personIds: PersonId[]): Promise<void> {
  const sidObjsMap = toIdMap(await client.findAll(
    contact.class.SocialIdentity,
    {
      _id: { $in: personIds as SocialIdentityRef[] }
    },
    {
      lookup: {
        attachedTo: contact.class.Person
      }
    }
  ))

  for (const personId of personIds) {
    const sidObj = sidObjsMap.get(personId as SocialIdentityRef)

    contactCache.fillCachesForPersonId(personId, sidObj)
  }
}

export async function loadCachesForPersonRef (client: Client, personRef: Ref<Person>): Promise<void> {
  const person = await client.findOne(
    contact.class.Person,
    {
      _id: personRef
    },
    {
      lookup: {
        _id: { socialIds: contact.class.SocialIdentity }
      }
    }
  )

  contactCache.fillCachesForPersonRef(personRef, person)
}

export async function loadCachesForPersonRefs (client: Client, personRefs: Array<Ref<Person>>): Promise<void> {
  const persons = toIdMap(await client.findAll(
    contact.class.Person,
    {
      _id: { $in: personRefs }
    },
    {
      lookup: {
        _id: { socialIds: contact.class.SocialIdentity }
      }
    }
  ))

  for (const personRef of personRefs) {
    const person = persons.get(personRef)

    contactCache.fillCachesForPersonRef(personRef, person)
  }
}

export async function getPersonRefByPersonId (client: Client, personId: PersonId): Promise<Ref<Person> | null> {
  if (!contactCache.personRefByPersonId.has(personId)) {
    await loadCachesForPersonId(client, personId)
  }

  return contactCache.personRefByPersonId.get(personId) ?? null
}

export async function getPersonRefsByPersonIds (client: Client, personIds: PersonId[]): Promise<Map<PersonId, Ref<Person>>> {
  if (personIds.some((personId) => !contactCache.personRefByPersonId.has(personId))) {
    await loadCachesForPersonIds(client, personIds)
  }

  return new Map(personIds.map((pid) => {
    const ref = contactCache.personRefByPersonId.get(pid)
    return ref != null ? [pid, ref] as const : undefined
  }).filter(notEmpty))
}

export async function getPersonByPersonId (client: Client, personId: PersonId): Promise<Readonly<Person> | null> {
  if (!contactCache.personByPersonId.has(personId)) {
    await loadCachesForPersonId(client, personId)
  }

  return contactCache.personByPersonId.get(personId) ?? null
}

export async function getPersonsByPersonIds (client: Client, personIds: PersonId[]): Promise<Map<PersonId, Readonly<Person>>> {
  if (personIds.some((personId) => !contactCache.personByPersonId.has(personId))) {
    await loadCachesForPersonIds(client, personIds)
  }

  return new Map(personIds.map((pid) => {
    const person = contactCache.personByPersonId.get(pid)
    return person != null ? [pid, person] as const : undefined
  }).filter(notEmpty))
}

export async function getPersonByPersonRef (client: Client, personRef: Ref<Person>): Promise<Readonly<Person> | null> {
  if (!contactCache.personByRef.has(personRef)) {
    await loadCachesForPersonRef(client, personRef)
  }

  return contactCache.personByRef.get(personRef) ?? null
}

export async function getPersonsByPersonRefs (client: Client, personRefs: Array<Ref<Person>>): Promise<Map<Ref<Person>, Readonly<Person>>> {
  if (personRefs.some((personRef) => !contactCache.personByRef.has(personRef))) {
    await loadCachesForPersonRefs(client, personRefs)
  }

  return new Map(personRefs.map((personRef) => {
    const person = contactCache.personByRef.get(personRef)
    return person != null ? [personRef, person] as const : undefined
  }).filter(notEmpty))
}

export async function getSocialIdByPersonId (client: Client, personId: PersonId): Promise<SocialIdentity | null> {
  if (!contactCache.personRefByPersonId.has(personId)) {
    await loadCachesForPersonId(client, personId)
  }

  return contactCache.socialIdByPersonId.get(personId) ?? null
}

export type { Change as ContactCacheChange } from './cache'
