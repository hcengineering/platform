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
