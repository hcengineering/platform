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

import {
  AttachedDoc,
  Class,
  Collection,
  Doc,
  PersonId,
  Ref,
  SocialKey,
  Space,
  Timestamp,
  UXObject,
  type BasePerson,
  type Blob,
  type MarkupBlobRef,
  type Data,
  type WithLookup,
  AccountUuid
} from '@hcengineering/core'
import type { Asset, Metadata, Plugin, Resource } from '@hcengineering/platform'
import { IntlString, plugin } from '@hcengineering/platform'
import { TemplateField, TemplateFieldCategory } from '@hcengineering/templates'
import type { AnyComponent, ColorDefinition, ResolvedLocation, Location, ComponentExtensionId } from '@hcengineering/ui'
import { Action, FilterMode, Viewlet } from '@hcengineering/view'
import type { Readable } from 'svelte/store'
import { PermissionsStore } from './types'

/**
 * @public
 */
export interface ChannelProvider extends Doc, UXObject {
  // Placeholder
  placeholder: IntlString

  // Presenter will be shown on click for channel
  presenter?: AnyComponent

  // Action to be performed if there is no presenter defined.
  action?: Ref<Action>

  // Integration type
  integrationType?: Ref<Doc>
}

export interface SocialIdentity extends SocialKey, AttachedDoc {
  attachedTo: Ref<Person>
  attachedToClass: Ref<Class<Person>>

  key: PersonId
  confirmed: boolean
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
  GRAVATAR = 'gravatar',

  EXTERNAL = 'external'
}

/**
 * @public
 */
export type GetAvatarUrl = (
  uri: Data<WithLookup<AvatarInfo>>,
  name: string,
  width?: number
) => Promise<{ url?: string, srcSet?: string, color: ColorDefinition }>

/**
 * @public
 */
export interface AvatarProvider extends Doc {
  type: AvatarType
  getUrl: Resource<GetAvatarUrl>
}

export interface AvatarInfo extends Doc {
  avatarType: AvatarType
  avatar?: Ref<Blob> | null
  avatarProps?: {
    color?: string
    url?: string
  }
}

/**
 * @public
 */
export interface Contact extends Doc, AvatarInfo {
  name: string
  attachments?: number
  comments?: number
  channels?: number
  city?: string
}

/**
 * @public
 */
export interface Person extends Contact, BasePerson {
  birthday?: Timestamp | null
  socialIds?: Collection<SocialIdentity>
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
  description: MarkupBlobRef | null
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
  personUuid?: AccountUuid
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

export interface PersonSpace extends Space {
  person: Ref<Person>
}

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
    Member: '' as Ref<Class<Member>>,
    Organization: '' as Ref<Class<Organization>>,
    Status: '' as Ref<Class<Status>>,
    ContactsTab: '' as Ref<Class<ContactsTab>>,
    PersonSpace: '' as Ref<Class<PersonSpace>>,
    SocialIdentity: '' as Ref<Class<SocialIdentity>>
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
    AvatarRef: '' as AnyComponent,
    UserBoxList: '' as AnyComponent,
    ChannelPresenter: '' as AnyComponent,
    SpaceMembers: '' as AnyComponent,
    DeleteConfirmationPopup: '' as AnyComponent,
    PersonIdArrayEditor: '' as AnyComponent,
    AccountArrayEditor: '' as AnyComponent,
    PersonIcon: '' as AnyComponent,
    EditOrganizationPanel: '' as AnyComponent,
    CollaborationUserAvatar: '' as AnyComponent,
    CreateGuest: '' as AnyComponent,
    SpaceMembersEditor: '' as AnyComponent,
    ContactNamePresenter: '' as AnyComponent,
    PersonFilterValuePresenter: '' as AnyComponent
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
    Profile: '' as Ref<ChannelProvider>,
    Viber: '' as Ref<ChannelProvider>
  },
  avatarProvider: {
    Color: '' as Ref<AvatarProvider>,
    Image: '' as Ref<AvatarProvider>,
    Gravatar: '' as Ref<AvatarProvider>
  },
  function: {
    GetColorUrl: '' as Resource<GetAvatarUrl>,
    GetFileUrl: '' as Resource<GetAvatarUrl>,
    GetGravatarUrl: '' as Resource<GetAvatarUrl>,
    GetExternalUrl: '' as Resource<GetAvatarUrl>
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
    KickUser: '' as Asset,
    Contacts: '' as Asset,
    Viber: '' as Asset
  },
  space: {
    Contacts: '' as Ref<Space>
  },
  app: {
    Contacts: '' as Ref<Doc>
  },
  metadata: {
    LastNameFirst: '' as Metadata<boolean>
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
    Position: '' as IntlString,
    For: '' as IntlString,
    SelectUsers: '' as IntlString,
    AddGuest: '' as IntlString,
    Members: '' as IntlString,
    Contacts: '' as IntlString,
    Employees: '' as IntlString,
    Persons: '' as IntlString,
    ViewProfile: '' as IntlString,
    SocialId: '' as IntlString,
    SocialIds: '' as IntlString,
    Type: '' as IntlString,
    Confirmed: '' as IntlString
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
  },
  ids: {
    MentionCommonNotificationType: '' as Ref<Doc>
  },
  extension: {
    EmployeePopupActions: '' as ComponentExtensionId
  },
  store: {
    Permissions: '' as Resource<Readable<PermissionsStore>>
  }
})

export default contactPlugin
export * from './types'
export * from './utils'
export * from './analytics'
