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

import { IntlString, plugin } from '@anticrm/platform'
import type { Plugin, Asset } from '@anticrm/platform'
import type { Doc, Ref, Class, UXObject, Space, Account, AttachedDoc } from '@anticrm/core'
import type { AnyComponent } from '@anticrm/ui'

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
  placeholder: IntlString
  presenter?: AnyComponent
  integrationType?: Ref<Doc>
}

/**
 * @public
 */
export interface Channel extends AttachedDoc {
  provider: Ref<ChannelProvider>
  value: string
}

/**
 * @public
 */
export interface Contact extends Doc {
  name: string
  avatar?: string
  attachments?: number
  comments?: number
  channels?: number
  city: string
}

/**
 * @public
 */
export interface Person extends Contact {
}

/**
 * @public
 */
export interface Organization extends Contact {

}

/**
 * @public
 */
export interface Employee extends Person {}

/**
 * @public
 */
export interface EmployeeAccount extends Account {
  employee: Ref<Employee>
  name: string
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
  return getFirstName(name) + ' ' + getLastName(name)
}

/**
 * @public
 */
export const contactId = 'contact' as Plugin

export default plugin(contactId, {
  class: {
    ChannelProvider: '' as Ref<Class<ChannelProvider>>,
    Channel: '' as Ref<Class<Channel>>,
    Contact: '' as Ref<Class<Contact>>,
    Person: '' as Ref<Class<Person>>,
    Persons: '' as Ref<Class<Persons>>,
    Organization: '' as Ref<Class<Organization>>,
    Organizations: '' as Ref<Class<Organizations>>,
    Employee: '' as Ref<Class<Employee>>,
    EmployeeAccount: '' as Ref<Class<EmployeeAccount>>
  },
  component: {
    SocialEditor: '' as AnyComponent
  },
  channelProvider: {
    Email: '' as Ref<ChannelProvider>,
    Phone: '' as Ref<ChannelProvider>,
    LinkedIn: '' as Ref<ChannelProvider>,
    Twitter: '' as Ref<ChannelProvider>,
    Telegram: '' as Ref<ChannelProvider>,
    GitHub: '' as Ref<ChannelProvider>
  },
  icon: {
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
    Company: '' as Asset
  },
  space: {
    Employee: '' as Ref<Space>,
    Contacts: '' as Ref<Space>
  }
})
