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

import type { Doc, Ref, Space } from '@anticrm/core'
import login from '@anticrm/login'
import { getMetadata } from '@anticrm/platform'

export async function uploadFile (file: File, space?: Ref<Space>, attachedTo?: Ref<Doc>): Promise<string> {
  console.log(file)
  const uploadUrl = getMetadata(login.metadata.UploadUrl)

  const data = new FormData()
  data.append('file', file)

  const params = [['space', space], ['attachedTo', attachedTo]]
    .filter((x): x is [string, Ref<any>] => x[1] !== undefined)
    .map(([name, value]) => `${name}=${value}`)
    .join('&')

  const url = `${uploadUrl as string}?name=${encodeURIComponent(file.name)}&${params}`
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
