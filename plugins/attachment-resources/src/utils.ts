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

import { Attachment } from '@hcengineering/attachment'
import { Class, concatLink, Data, Doc, Ref, Space, TxOperations as Client } from '@hcengineering/core'
import presentation from '@hcengineering/presentation'
import { PlatformError, Severity, Status, getMetadata, setPlatformStatus, unknownError } from '@hcengineering/platform'

import attachment from './plugin'

export async function uploadFile (file: File): Promise<string> {
  const uploadUrl = getMetadata(presentation.metadata.UploadURL)

  if (uploadUrl === undefined) {
    throw Error('UploadURL is not defined')
  }

  const data = new FormData()
  data.append('file', file)

  const resp = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + (getMetadata(presentation.metadata.Token) as string)
    },
    body: data
  })

  if (resp.status !== 200) {
    if (resp.status === 413) {
      throw new PlatformError(new Status(Severity.ERROR, attachment.status.FileTooLarge, {}))
    } else {
      throw Error(`Failed to upload file: ${resp.statusText}`)
    }
  }

  return await resp.text()
}

export async function deleteFile (id: string): Promise<void> {
  const uploadUrl = getMetadata(presentation.metadata.UploadURL) ?? ''

  const url = concatLink(uploadUrl, `?file=${id}`)
  const resp = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: 'Bearer ' + (getMetadata(presentation.metadata.Token) as string)
    }
  })

  if (resp.status !== 200) {
    throw new Error('Failed to delete file')
  }
}

export async function createAttachments (
  client: Client,
  list: FileList,
  attachTo: { objectClass: Ref<Class<Doc>>, space: Ref<Space>, objectId: Ref<Doc> },
  attachmentClass: Ref<Class<Attachment>> = attachment.class.Attachment,
  extraData: Partial<Data<Attachment>> = {}
): Promise<void> {
  const { objectClass, objectId, space } = attachTo
  try {
    for (let index = 0; index < list.length; index++) {
      const file = list.item(index)
      if (file !== null) {
        const uuid = await uploadFile(file)
        await client.addCollection(attachmentClass, space, objectId, objectClass, 'attachments', {
          ...extraData,
          name: file.name,
          file: uuid,
          type: file.type,
          size: file.size,
          lastModified: file.lastModified
        })
      }
    }
  } catch (err: any) {
    await setPlatformStatus(unknownError(err))
  }
}

export function getType (type: string): 'image' | 'video' | 'audio' | 'pdf' | 'other' {
  if (type.startsWith('image/')) {
    return 'image'
  }
  if (type.startsWith('audio/')) {
    return 'audio'
  }
  if (type.startsWith('video/')) {
    return 'video'
  }
  if (type.includes('application/pdf')) {
    return 'pdf'
  }

  return 'other'
}
