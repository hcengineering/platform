//
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

import type { Employee, EmployeeAccount } from '@anticrm/contact'
import type { Arr, AttachedDoc, Class, Doc, Markup, Mixin, Ref, Space, Timestamp } from '@anticrm/core'
import type { Asset, IntlString, Plugin } from '@anticrm/platform'
import { plugin } from '@anticrm/platform'
import { Viewlet } from '@anticrm/view'

/**
 * @public
 */
export interface Department extends Space {
  space: Ref<Department>
  avatar?: string | null
  teamLead: Ref<Employee> | null
  attachments?: number
  comments?: number
  channels?: number
  members: Arr<Ref<DepartmentMember>>
}

/**
 * @public
 */
export interface DepartmentMember extends EmployeeAccount {}

/**
 * @public
 */
export interface Staff extends Employee {
  department: Ref<Department>
}

/**
 * @public
 */
export interface RequestType extends Doc {
  label: IntlString
  icon: Asset
  value: number
  color: number
}

/**
 * @public
 */
export interface Request extends AttachedDoc {
  attachedTo: Ref<Staff>

  attachedToClass: Ref<Class<Staff>>

  space: Ref<Department>

  type: Ref<RequestType>

  description: Markup
  comments?: number
  attachments?: number

  date: Timestamp

  dueDate: Timestamp
}

/**
 * @public
 */
export const hrId = 'hr' as Plugin

/**
 * @public
 */
const hr = plugin(hrId, {
  app: {
    HR: '' as Ref<Doc>
  },
  class: {
    Department: '' as Ref<Class<Department>>,
    DepartmentMember: '' as Ref<Class<DepartmentMember>>,
    Request: '' as Ref<Class<Request>>,
    RequestType: '' as Ref<Class<RequestType>>
  },
  mixin: {
    Staff: '' as Ref<Mixin<Staff>>
  },
  icon: {
    HR: '' as Asset,
    Department: '' as Asset,
    Structure: '' as Asset,
    Vacation: '' as Asset,
    Sick: '' as Asset,
    PTO: '' as Asset,
    Remote: '' as Asset,
    Overtime: '' as Asset
  },
  ids: {
    Head: '' as Ref<Department>,
    Vacation: '' as Ref<RequestType>,
    Leave: '' as Ref<RequestType>,
    Sick: '' as Ref<RequestType>,
    PTO: '' as Ref<RequestType>,
    PTO2: '' as Ref<RequestType>,
    Remote: '' as Ref<RequestType>,
    Overtime: '' as Ref<RequestType>,
    Overtime2: '' as Ref<RequestType>
  },
  viewlet: {
    TableMember: '' as Ref<Viewlet>
  }
})

/**
 * @public
 */
export default hr
