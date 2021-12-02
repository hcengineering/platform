//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import type { Class, Data, Doc, Ref, Space, State } from '@anticrm/core'
import login from '@anticrm/login'
import { getMetadata } from '@anticrm/platform'
import { Project } from '@anticrm/task'
import core from '@anticrm/core'
import view, { Kanban } from '@anticrm/view'

export async function uploadFile (space: Ref<Space>, file: File, attachedTo: Ref<Doc>): Promise<string> {
  console.log(file)
  const uploadUrl = getMetadata(login.metadata.UploadUrl)

  const data = new FormData()
  data.append('file', file)

  const url = `${uploadUrl as string}?space=${space}&name=${encodeURIComponent(file.name)}&attachedTo=${attachedTo}`
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + (getMetadata(login.metadata.LoginToken) as string)
    },
    body: data
  })
  if (resp.status !== 200) {
    throw new Error("Can't upload file.")
  }
  const uuid = await resp.text()
  console.log(uuid)
  return uuid
}

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
