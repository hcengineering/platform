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

import type { Employee } from '@anticrm/contact'
import type { Class, Data, Doc, Ref, Space, State } from '@anticrm/core'
import type { Asset, Plugin } from '@anticrm/platform'
import { plugin } from '@anticrm/platform'
import core from '@anticrm/core'
import view, { Kanban } from '@anticrm/view'

/**
 * @public
 */
export interface Project extends Space {}

/**
 * @public
 */
export interface Task extends Doc {
  number: number // Sequence number

  name: string
  description: string
  assignee: Ref<Employee> | null

  comments?: number
  attachments?: number
  labels?: string
}

/**
 * @public
 */
export const taskId = 'task' as Plugin

export default plugin(taskId, {
  class: {
    Task: '' as Ref<Class<Task>>,
    Project: '' as Ref<Class<Project>>
  },
  icon: {
    Task: '' as Asset
  }
})

/**
 * @public
 */
export async function createProjectKanban (
  projectId: Ref<Project>,
  factory: <T extends Doc>(_class: Ref<Class<T>>, space: Ref<Space>, data: Data<T>, id: Ref<T>) => Promise<void>
): Promise<void> {
  const states = [
    { color: '#7C6FCD', name: 'Open' },
    { color: '#6F7BC5', name: 'In Progress' },
    { color: '#77C07B', name: 'Under review' },
    { color: '#A5D179', name: 'Done' },
    { color: '#F28469', name: 'Invalid' }
  ]
  const ids: Array<Ref<State>> = []
  for (const st of states) {
    const sid = (projectId + '.state.' + st.name.toLowerCase().replace(' ', '_')) as Ref<State>
    await factory(
      core.class.State,
      projectId,
      {
        title: st.name,
        color: st.color
      },
      sid
    )
    ids.push(sid)
  }

  await factory(
    view.class.Kanban,
    projectId,
    {
      attachedTo: projectId,
      states: ids,
      order: []
    },
    (projectId + '.kanban.') as Ref<Kanban>
  )
}
