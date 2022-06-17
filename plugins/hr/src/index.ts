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

import type { Employee } from '@anticrm/contact'
import type { Class, Doc, Mixin, Ref, Space } from '@anticrm/core'
import type { Asset, Plugin } from '@anticrm/platform'
import { plugin } from '@anticrm/platform'

/**
 * @public
 */
export interface Department extends Space {
  space: Ref<Department>
  avatar?: string | null
  teamLead: Ref<Employee> | null
}

/**
 * @public
 */
export interface Staff extends Employee {
  department: Ref<Department>
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
    Department: '' as Ref<Class<Department>>
  },
  mixin: {
    Staff: '' as Ref<Mixin<Staff>>
  },
  icon: {
    HR: '' as Asset,
    Department: '' as Asset,
    Structure: '' as Asset
  },
  ids: {
    Head: '' as Ref<Department>
  }
})

/**
 * @public
 */
export default hr
