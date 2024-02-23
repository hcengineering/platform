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

import { type Attachment, type AttachmentMetadata } from '@hcengineering/attachment'
import {
  type Class,
  concatLink,
  type Data,
  type Doc,
  type Ref,
  type Space,
  type TxOperations as Client
} from '@hcengineering/core'
import presentation, { getFileUrl, getImageSize } from '@hcengineering/presentation'
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
        const metadata = await getAttachmentMetadata(file, uuid)

        await client.addCollection(attachmentClass, space, objectId, objectClass, 'attachments', {
          ...extraData,
          name: file.name,
          file: uuid,
          type: file.type,
          size: file.size,
          lastModified: file.lastModified,
          metadata
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

export async function getAttachmentMetadata (file: File, uuid: string): Promise<AttachmentMetadata | undefined> {
  const type = getType(file.type)

  if (type === 'video') {
    const size = await getVideoSize(uuid)

    if (size === undefined) {
      return undefined
    }

    return {
      originalHeight: size.height,
      originalWidth: size.width
    }
  }

  if (type === 'image') {
    const size = await getImageSize(file, getFileUrl(uuid, 'full'))

    return {
      originalHeight: size.height,
      originalWidth: size.width,
      pixelRatio: size.pixelRatio
    }
  }

  return undefined
}

async function getVideoSize (uuid: string): Promise<{ width: number, height: number } | undefined> {
  const promise = new Promise<{ width: number, height: number }>((resolve, reject) => {
    const element = document.createElement('video')

    element.onloadedmetadata = () => {
      const height = element.videoHeight
      const width = element.videoWidth

      resolve({ height, width })
    }

    element.onerror = reject
    element.src = getFileUrl(uuid, 'full')
  })

  return await promise
}
