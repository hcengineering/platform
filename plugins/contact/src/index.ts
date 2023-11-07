//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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

import { Account, AttachedDoc, Class, Doc, Ref, Space, Timestamp, UXObject } from '@hcengineering/core'
import type { Asset, Plugin, Resource } from '@hcengineering/platform'
import { IntlString, plugin } from '@hcengineering/platform'
import { TemplateField, TemplateFieldCategory } from '@hcengineering/templates'
import type { AnyComponent, IconSize, ResolvedLocation } from '@hcengineering/ui'
import { FilterMode, ViewAction, Viewlet } from '@hcengineering/view'

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
export interface ChannelItem extends AttachedDoc {
  attachedTo: Ref<Channel>
  attachedToClass: Ref<Class<Channel>>
  incoming: boolean
  sendOn: Timestamp
  attachments?: number
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
export type GetAvatarUrl = (uri: string, size: IconSize) => string[]

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
  statuses?: number
  position?: string | null
}

/**
 * @public
 */
export interface PersonAccount extends Account {
  person: Ref<Person>
}

/**
 * @public
 */
export interface ContactsTab extends Doc {
  label: IntlString
  component: AnyComponent
  index: number
}

/**
 * @public
 */
export const contactId = 'contact' as Plugin

/**
 * @public
 */
export const contactPlugin = plugin(contactId, {
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
    PersonAccount: '' as Ref<Class<PersonAccount>>,
    Status: '' as Ref<Class<Status>>,
    ContactsTab: '' as Ref<Class<ContactsTab>>
  },
  mixin: {
    Employee: '' as Ref<Class<Employee>>
  },
  component: {
    SocialEditor: '' as AnyComponent,
    CreateOrganization: '' as AnyComponent,
    CreatePerson: '' as AnyComponent,
    ChannelsPresenter: '' as AnyComponent,
    MembersPresenter: '' as AnyComponent,
    Avatar: '' as AnyComponent,
    UserBoxList: '' as AnyComponent,
    ChannelPresenter: '' as AnyComponent,
    SpaceMembers: '' as AnyComponent,
    DeleteConfirmationPopup: '' as AnyComponent
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
    Skype: '' as Ref<ChannelProvider>,
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
    Skype: '' as Asset,
    Youtube: '' as Asset,
    GitHub: '' as Asset,
    Edit: '' as Asset,
    Person: '' as Asset,
    Persona: '' as Asset,
    Company: '' as Asset,
    SocialEdit: '' as Asset,
    Homepage: '' as Asset,
    Whatsapp: '' as Asset,
    ComponentMembers: '' as Asset,
    Profile: '' as Asset,
    KickUser: '' as Asset
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
    UseColor: '' as IntlString,
    PersonFirstNamePlaceholder: '' as IntlString,
    PersonLastNamePlaceholder: '' as IntlString,
    NumberMembers: '' as IntlString,
    Position: '' as IntlString
  },
  viewlet: {
    TableMember: '' as Ref<Viewlet>,
    TablePerson: '' as Ref<Viewlet>,
    TableEmployee: '' as Ref<Viewlet>,
    TableOrganization: '' as Ref<Viewlet>
  },
  filter: {
    FilterChannelIn: '' as Ref<FilterMode>,
    FilterChannelNin: '' as Ref<FilterMode>,
    FilterChannelHasMessages: '' as Ref<FilterMode>,
    FilterChannelHasNewMessages: '' as Ref<FilterMode>
  },
  resolver: {
    Location: '' as Resource<(loc: Location) => Promise<ResolvedLocation | undefined>>
  },
  templateFieldCategory: {
    CurrentEmployee: '' as Ref<TemplateFieldCategory>,
    Contact: '' as Ref<TemplateFieldCategory>
  },
  templateField: {
    CurrentEmployeeName: '' as Ref<TemplateField>,
    CurrentEmployeePosition: '' as Ref<TemplateField>,
    CurrentEmployeeEmail: '' as Ref<TemplateField>,
    ContactName: '' as Ref<TemplateField>,
    ContactFirstName: '' as Ref<TemplateField>,
    ContactLastName: '' as Ref<TemplateField>
  }
})

export default contactPlugin
export * from './types'
export * from './utils'
