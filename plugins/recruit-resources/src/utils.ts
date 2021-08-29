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

import type { Ref, Doc } from '@anticrm/core'
import { getMetadata } from '@anticrm/platform'

import login from '@anticrm/login'

export async function uploadFile(id: Ref<Doc>, file: File): Promise<string> {
  console.log(file)
  const uploadUrl = getMetadata(login.metadata.UploadUrl)
  
  const data = new FormData()
  data.append('file', file)

  const url = `${uploadUrl}?id=${id}&space=space`
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + getMetadata(login.metadata.LoginToken)
    },
    body: data
  })
  const uuid = await resp.text()
  console.log(uuid)
  return uuid
}
