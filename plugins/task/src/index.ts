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
import type { Space, Doc, Ref, Class } from '@anticrm/core'
import type { Employee } from '@anticrm/contact'

/**
 * @public
 */
export interface Project extends Space {}

/**
 * @public
 */
export interface Task extends Doc {
  title: string
  description: string
  assignee: Ref<Employee>
}

/**
 * @public
 */
export const taskId = 'task' as Plugin

export default plugin(taskId, {
  class: {
    Task: '' as Ref<Class<Task>>
  },
  icon: {
    Task: '' as Asset
  }
})
