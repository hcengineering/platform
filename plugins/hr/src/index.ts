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
import type { Asset, Plugin } from '@anticrm/platform'
import { plugin } from '@anticrm/platform'

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
export interface Request extends AttachedDoc {
  attachedTo: Ref<Staff>

  attachedToClass: Ref<Class<Staff>>

  space: Ref<Department>

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
    Vacation: '' as Ref<Class<Request>>,
    Leave: '' as Ref<Class<Request>>,
    Sick: '' as Ref<Class<Request>>,
    PTO: '' as Ref<Class<Request>>,
    PTO2: '' as Ref<Class<Request>>,
    Remote: '' as Ref<Class<Request>>,
    Overtime: '' as Ref<Class<Request>>,
    Overtime2: '' as Ref<Class<Request>>
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
    Head: '' as Ref<Department>
  }
})

/**
 * @public
 */
export default hr
