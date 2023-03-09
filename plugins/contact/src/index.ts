//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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

import MD5 from 'crypto-js/md5'

import {
  Account,
  AttachedData,
  AttachedDoc,
  Class,
  Client,
  Data,
  Doc,
  FindResult,
  Ref,
  Space,
  Timestamp,
  UXObject
} from '@hcengineering/core'
import type { Asset, Plugin, Resource } from '@hcengineering/platform'
import { IntlString, plugin } from '@hcengineering/platform'
import type { AnyComponent, IconSize } from '@hcengineering/ui'
import { FilterMode, ViewAction, Viewlet } from '@hcengineering/view'
import { TemplateFieldCategory, TemplateField } from '@hcengineering/templates'

/**
 * @public
 */
export interface Organizations extends Space {}

/**
 * @public
 */
export interface Persons extends Space {}

/**
 * @public
 */
export interface ChannelProvider extends Doc, UXObject {
  // Placeholder
  placeholder: IntlString

  // Presenter will be shown on click for channel
  presenter?: AnyComponent

  // Action to be performed if there is no presenter defined.
  action?: ViewAction

  // Integration type
  integrationType?: Ref<Doc>
}

/**
 * @public
 */
export interface Channel extends AttachedDoc {
  provider: Ref<ChannelProvider>
  value: string
  items?: number
  lastMessage?: Timestamp
}

/**
 * @public
 */
export enum AvatarType {
  COLOR = 'color',
  IMAGE = 'image',
  GRAVATAR = 'gravatar'
}

/**
 * @public
 */
export type GetAvatarUrl = (uri: string, size: IconSize) => string

/**
 * @public
 */
export interface AvatarProvider extends Doc {
  type: AvatarType
  getUrl: Resource<GetAvatarUrl>
}

/**
 * @public
 */
export interface Contact extends Doc {
  name: string
  avatar?: string | null
  attachments?: number
  comments?: number
  channels?: number
  city: string
  createOn: Timestamp
}

/**
 * @public
 */
export interface Person extends Contact {
  birthday?: Timestamp | null
}

/**
 * @public
 */
export interface Member extends AttachedDoc {
  contact: Ref<Contact>
}
/**
 * @public
 */
export interface Organization extends Contact {
  members: number
}

/**
 * @public
 */
export interface Status extends AttachedDoc {
  attachedTo: Ref<Employee>
  attachedToClass: Ref<Class<Employee>>
  name: string
  dueDate: Timestamp
}

/**
 * @public
 */
export interface Employee extends Person {
  active: boolean
  mergedTo?: Ref<Employee>
  statuses?: number
  displayName?: string
}

/**
 * @public
 */
export interface EmployeeAccount extends Account {
  employee: Ref<Employee>
  name: string
}

/**
 * @public
 */
export interface ContactsTab extends Doc {
  label: IntlString
  component: AnyComponent
  index: number
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
export function formatName (name: string): string {
  return getLastName(name) + ' ' + getFirstName(name)
}

/**
 * @public
 */
export function getName (value: Contact): string {
  if (isEmployee(value)) {
    return value.displayName ?? formatName(value.name)
  }
  if (isPerson(value)) {
    return formatName(value.name)
  }
  return value.name
}

function isEmployee (value: Contact): value is Employee {
  return value._class === contactPlugin.class.Employee
}

function isPerson (value: Contact): value is Person {
  return value._class === contactPlugin.class.Organization
}

/**
 * @public
 */
export const contactId = 'contact' as Plugin

/**
 * @public
 */
const contactPlugin = plugin(contactId, {
  class: {
    AvatarProvider: '' as Ref<Class<AvatarProvider>>,
    ChannelProvider: '' as Ref<Class<ChannelProvider>>,
    Channel: '' as Ref<Class<Channel>>,
    Contact: '' as Ref<Class<Contact>>,
    Person: '' as Ref<Class<Person>>,
    Persons: '' as Ref<Class<Persons>>,
    Member: '' as Ref<Class<Member>>,
    Organization: '' as Ref<Class<Organization>>,
    Organizations: '' as Ref<Class<Organizations>>,
    Employee: '' as Ref<Class<Employee>>,
    EmployeeAccount: '' as Ref<Class<EmployeeAccount>>,
    Status: '' as Ref<Class<Status>>,
    ContactsTab: '' as Ref<Class<ContactsTab>>
  },
  component: {
    SocialEditor: '' as AnyComponent,
    CreateOrganization: '' as AnyComponent,
    CreatePerson: '' as AnyComponent,
    ChannelsPresenter: '' as AnyComponent,
    MembersPresenter: '' as AnyComponent
  },
  channelProvider: {
    Email: '' as Ref<ChannelProvider>,
    Phone: '' as Ref<ChannelProvider>,
    LinkedIn: '' as Ref<ChannelProvider>,
    Twitter: '' as Ref<ChannelProvider>,
    Telegram: '' as Ref<ChannelProvider>,
    GitHub: '' as Ref<ChannelProvider>,
    Facebook: '' as Ref<ChannelProvider>,
    Homepage: '' as Ref<ChannelProvider>,
    Whatsapp: '' as Ref<ChannelProvider>,
    Profile: '' as Ref<ChannelProvider>
  },
  avatarProvider: {
    Color: '' as Ref<AvatarProvider>,
    Image: '' as Ref<AvatarProvider>,
    Gravatar: '' as Ref<AvatarProvider>
  },
  function: {
    GetColorUrl: '' as Resource<GetAvatarUrl>,
    GetFileUrl: '' as Resource<GetAvatarUrl>,
    GetGravatarUrl: '' as Resource<GetAvatarUrl>
  },
  icon: {
    ContactApplication: '' as Asset,
    Phone: '' as Asset,
    Email: '' as Asset,
    Discord: '' as Asset,
    Facebook: '' as Asset,
    Instagram: '' as Asset,
    LinkedIn: '' as Asset,
    Telegram: '' as Asset,
    Twitter: '' as Asset,
    VK: '' as Asset,
    WhatsApp: '' as Asset,
    Youtube: '' as Asset,
    GitHub: '' as Asset,
    Edit: '' as Asset,
    Person: '' as Asset,
    Company: '' as Asset,
    SocialEdit: '' as Asset,
    Homepage: '' as Asset,
    Whatsapp: '' as Asset,
    Profile: '' as Asset
  },
  space: {
    Employee: '' as Ref<Space>,
    Contacts: '' as Ref<Space>
  },
  app: {
    Contacts: '' as Ref<Doc>
  },
  string: {
    PersonAlreadyExists: '' as IntlString,
    Person: '' as IntlString,
    Employee: '' as IntlString,
    CreateOrganization: '' as IntlString,
    UseImage: '' as IntlString,
    UseGravatar: '' as IntlString,
    UseColor: '' as IntlString
  },
  viewlet: {
    TableMember: '' as Ref<Viewlet>,
    TableContact: '' as Ref<Viewlet>
  },
  filter: {
    FilterChannelIn: '' as Ref<FilterMode>,
    FilterChannelNin: '' as Ref<FilterMode>
  },
  templateFieldCategory: {
    CurrentEmployee: '' as Ref<TemplateFieldCategory>,
    Contact: '' as Ref<TemplateFieldCategory>
  },
  templateField: {
    CurrentEmployeeName: '' as Ref<TemplateField>,
    CurrentEmployeeEmail: '' as Ref<TemplateField>,
    ContactName: '' as Ref<TemplateField>
  }
})

export default contactPlugin

/**
 * @public
 */
export async function findContacts (
  client: Client,
  _class: Ref<Class<Doc>>,
  person: Data<Contact>,
  channels: AttachedData<Channel>[]
): Promise<{ contacts: Contact[], channels: AttachedData<Channel>[] }> {
  if (channels.length === 0 && person.name.length === 0) {
    return { contacts: [], channels: [] }
  }
  // Take only first part of first name for match.
  const values = channels.map((it) => it.value)

  // Same name persons

  const potentialChannels = await client.findAll(contactPlugin.class.Channel, { value: { $in: values } })
  let potentialContactIds = Array.from(new Set(potentialChannels.map((it) => it.attachedTo as Ref<Contact>)).values())

  if (potentialContactIds.length === 0) {
    if (client.getHierarchy().isDerived(_class, contactPlugin.class.Person)) {
      const firstName = getFirstName(person.name).split(' ').shift() ?? ''
      const lastName = getLastName(person.name)
      // try match using just first/last name
      potentialContactIds = (
        await client.findAll(contactPlugin.class.Contact, { name: { $like: `${lastName}%${firstName}%` } })
      ).map((it) => it._id)
      if (potentialContactIds.length === 0) {
        return { contacts: [], channels: [] }
      }
    } else if (client.getHierarchy().isDerived(_class, contactPlugin.class.Organization)) {
      // try match using just first/last name
      potentialContactIds = (
        await client.findAll(contactPlugin.class.Contact, { name: { $like: `${person.name}` } })
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
    if (c.name === person.name) {
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
export async function findPerson (
  client: Client,
  person: Data<Person>,
  channels: AttachedData<Channel>[]
): Promise<Person[]> {
  const result = await findContacts(client, contactPlugin.class.Person, person, channels)
  return result.contacts as Person[]
}

/**
 * @public
 */
export type GravatarPlaceholderType =
  | '404'
  | 'mp'
  | 'identicon'
  | 'monsterid'
  | 'wavatar'
  | 'retro'
  | 'robohash'
  | 'blank'

/**
 * @public
 */
export function buildGravatarId (email: string): string {
  return MD5(email.trim().toLowerCase()).toString()
}

/**
 * @public
 */
export function getGravatarUrl (
  gravatarId: string,
  size: IconSize = 'full',
  placeholder: GravatarPlaceholderType = 'identicon'
): string {
  let width = 64
  switch (size) {
    case 'inline':
    case 'tiny':
    case 'x-small':
    case 'small':
    case 'medium':
      width = 64
      break
    case 'large':
      width = 256
      break
    case 'x-large':
      width = 512
      break
  }
  return `https://gravatar.com/avatar/${gravatarId}?s=${width}&d=${placeholder}`
}

/**
 * @public
 */
export async function checkHasGravatar (gravatarId: string, fetch?: typeof window.fetch): Promise<boolean> {
  try {
    return (await (fetch ?? window.fetch)(getGravatarUrl(gravatarId, 'full', '404'))).ok
  } catch {
    return false
  }
}

const AVATAR_COLORS = [
  '#4674ca', // blue
  '#315cac', // blue_dark
  '#57be8c', // green
  '#3fa372', // green_dark
  '#f9a66d', // yellow_orange
  '#ec5e44', // red
  '#e63717', // red_dark
  '#f868bc', // pink
  '#6c5fc7', // purple
  '#4e3fb4', // purple_dark
  '#57b1be', // teal
  '#847a8c' // gray
]

/**
 * @public
 */
export function getAvatarColorForId (id: string): string {
  let hash = 0

  for (let i = 0; i < id.length; i++) {
    hash += id.charCodeAt(i)
  }

  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}
