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

import { AttachedData, Class, Client, Doc, FindResult, Hierarchy, Ref } from '@hcengineering/core'
import { getMetadata } from '@hcengineering/platform'
import { ColorDefinition } from '@hcengineering/ui'
import MD5 from 'crypto-js/md5'
import { AvatarProvider, AvatarType, Channel, Contact, Person, contactPlugin } from '.'
import { AVATAR_COLORS, GravatarPlaceholderType } from './types'

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
      return contactPlugin.avatarProvider.Gravatar
    case AvatarType.COLOR:
      return contactPlugin.avatarProvider.Color
  }
  return contactPlugin.avatarProvider.Image
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
    contactPlugin.class.Channel,
    { value: { $in: values } },
    { limit: 1000 }
  )
  let potentialContactIds = Array.from(new Set(potentialChannels.map((it) => it.attachedTo as Ref<Contact>)).values())

  if (potentialContactIds.length === 0) {
    if (client.getHierarchy().isDerived(_class, contactPlugin.class.Person)) {
      const firstName = getFirstName(name).split(' ').shift() ?? ''
      const lastName = getLastName(name)
      // try match using just first/last name
      potentialContactIds = (
        await client.findAll(
          contactPlugin.class.Contact,
          { name: { $like: `${lastName}%${firstName}%` } },
          { limit: 100 }
        )
      ).map((it) => it._id)
      if (potentialContactIds.length === 0) {
        return { contacts: [], channels: [] }
      }
    } else if (client.getHierarchy().isDerived(_class, contactPlugin.class.Organization)) {
      // try match using just first/last name
      potentialContactIds = (
        await client.findAll(contactPlugin.class.Contact, { name: { $like: `${name}` } }, { limit: 100 })
      ).map((it) => it._id)
      if (potentialContactIds.length === 0) {
        return { contacts: [], channels: [] }
      }
    }
  }

  const potentialPersons: FindResult<Contact> = await client.findAll(
    contactPlugin.class.Contact,
    { _id: { $in: potentialContactIds } },
    {
      lookup: {
        _id: {
          channels: contactPlugin.class.Channel
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
  const result = await findContacts(client, contactPlugin.class.Person, name, channels)
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
    lastNameFirst !== undefined ? lastNameFirst === 'true' : getMetadata(contactPlugin.metadata.LastNameFirst) === true
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
  return hierarchy.isDerived(_class, contactPlugin.class.Person)
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
