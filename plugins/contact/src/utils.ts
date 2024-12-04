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

import { AttachedData, buildSocialIdString, Class, Client, Doc, FindResult, Hierarchy, PersonId, Ref } from '@hcengineering/core'
import { getMetadata } from '@hcengineering/platform'
import { ColorDefinition } from '@hcengineering/ui'
import { MD5 } from 'crypto-js'
import contact, { AvatarProvider, AvatarType, Channel, Contact, Employee, Person } from '.'
import { AVATAR_COLORS, GravatarPlaceholderType } from './types'

let currentEmployee: Ref<Employee>

let resolveEmployee: (employee: Ref<Employee>) => void
export const currentEmployeePromise = new Promise<Ref<Employee>>((resolve) => {
  resolveEmployee = resolve
})

/**
 * @public
 * @returns
 */
export function getCurrentEmployee (): Ref<Employee> {
  return currentEmployee
}

/**
 * @public
 * @param employee -
 */
export function setCurrentEmployee (employee: Ref<Employee>): void {
  currentEmployee = employee
  resolveEmployee(employee)
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
export function buildGravatarId (email: string): string {
  return MD5(email.trim().toLowerCase()).toString()
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

  const potentialChannels = await client.findAll(
    contact.class.Channel,
    { value: { $in: values } },
    { limit: 1000 }
  )
  let potentialContactIds = Array.from(new Set(potentialChannels.map((it) => it.attachedTo as Ref<Contact>)).values())

  if (potentialContactIds.length === 0) {
    if (client.getHierarchy().isDerived(_class, contact.class.Person)) {
      const firstName = getFirstName(name).split(' ').shift() ?? ''
      const lastName = getLastName(name)
      // try match using just first/last name
      potentialContactIds = (
        await client.findAll(
          contact.class.Contact,
          { name: { $like: `${lastName}%${firstName}%` } },
          { limit: 100 }
        )
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

export function pickPrimarySocialId (ids: PersonId[]): PersonId {
  if (ids.length === 0) {
    throw new Error('No social ids provided')
  }

  return ids[0]
}

export function includesAny (members: PersonId[], ids: PersonId[]): boolean {
  return members.some((m) => ids.includes(m))
}

export async function getPersonBySocialId (client: Client, socialIdString: PersonId): Promise<Person | undefined> {
  const socialId = await client.findOne(contact.class.SocialIdentity, { key: socialIdString })

  return await client.findOne(contact.class.Person, { _id: socialId?.attachedTo, _class: socialId?.attachedToClass })
}

export async function getPersonRefBySocialId (client: Client, socialIdString: PersonId): Promise<Ref<Person> | undefined> {
  const socialId = await client.findOne(contact.class.SocialIdentity, { key: socialIdString })

  return socialId?.attachedTo
}

export async function getPersonRefsBySocialIds (client: Client): Promise<Record<PersonId, Ref<Person>>> {
  const socialIds = await client.findAll(contact.class.SocialIdentity, {})
  const result: Record<PersonId, Ref<Person>> = {}

  for (const socialId of socialIds) {
    result[socialId.key] = socialId.attachedTo
  }

  return result
}

export async function getPrimarySocialId (client: Client, person: Ref<Person>): Promise<PersonId | undefined> {
  const socialIds = await client.findAll(contact.class.SocialIdentity, { attachedTo: person })

  if (socialIds.length === 0) {
    return
  }

  return pickPrimarySocialId(socialIds.map((it) => it.key))
}

export async function getAllSocialStringsByPersonId (client: Client, personId: PersonId): Promise<PersonId[]> {
  const socialId = await client.findOne(contact.class.SocialIdentity, { key: personId, attachedToClass: contact.class.Person })

  if (socialId === undefined) {
    return []
  }

  const socialIds = await client.findAll(contact.class.SocialIdentity, { attachedTo: socialId.attachedTo })

  return socialIds.map((it) => it.key)
}

export async function getAllSocialStringsByPersonRef (client: Client, person: Ref<Person>): Promise<PersonId[]> {
  const socialIds = await client.findAll(contact.class.SocialIdentity, { attachedTo: person })

  return socialIds.map((it) => it.key)
}

export async function getSocialStringsByEmployee (client: Client): Promise<Record<Ref<Person>, string[]>> {
  const employees = await client.findAll(contact.mixin.Employee, { active: true })
  const socialIds = await client.findAll(contact.class.SocialIdentity, {
    attachedTo: { $in: employees.map((it) => it._id) },
    attachedToClass: contact.class.Person
  })
  const socialStringsByPerson: Record<Ref<Person>, string[]> = {}

  for (const socialId of socialIds) {
    const socialStrings = socialStringsByPerson[socialId.attachedTo]
    const socialString = buildSocialIdString(socialId)
    if (socialStrings === undefined) {
      socialStringsByPerson[socialId.attachedTo] = [socialString]
    } else {
      socialStrings.push(socialString)
    }
  }

  return socialStringsByPerson
}

export async function getAllEmployeesPrimarySocialStrings (client: Client): Promise<PersonId[]> {
  const socialStringsByPerson = getSocialStringsByEmployee(client)

  return Object.values(socialStringsByPerson).map((it) => pickPrimarySocialId(it))
}
