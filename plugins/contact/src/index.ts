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

import { plugin } from '@anticrm/platform'
import type { Plugin, Asset } from '@anticrm/platform'
import type { Doc, Ref, Class, UXObject, Space, Account } from '@anticrm/core'

/**
 * @public
 */
export interface ChannelProvider extends Doc, UXObject {
  placeholder: string
}

/**
 * @public
 */
export interface Channel {
  provider: Ref<ChannelProvider>
  value: string
}

/**
 * @public
 */
export interface Contact extends Doc {
  channels: Channel[]
}

/**
 * @public
 */
export interface Person extends Contact {
  name: string
  // email: string
  // phone: string
  city: string
}

/**
 * @public
 */
export interface Organization extends Contact {
  name: string
}

/**
 * @public
 */
export interface Employee extends Person {
}

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
  return name.substring(name.indexOf(SEP) + 1)
}

/**
 * @public
 */
export function getLastName (name: string): string {
  return name.substring(0, name.indexOf(SEP))
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
    Contact: '' as Ref<Class<Contact>>,
    Person: '' as Ref<Class<Person>>,
    Organization: '' as Ref<Class<Organization>>,
    Employee: '' as Ref<Class<Employee>>,
    EmployeeAccount: '' as Ref<Class<EmployeeAccount>>
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
    GitHub: '' as Asset
  },
  space: {
    Employee: '' as Ref<Space>
  }
})
