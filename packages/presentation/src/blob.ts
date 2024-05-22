//
// Copyright © 2024 Hardcore Engineering Inc.
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

import { type Blob, type Ref, concatLink } from '@hcengineering/core'
import { PlatformError, Severity, Status, getMetadata, getResource } from '@hcengineering/platform'
import { type PopupAlignment } from '@hcengineering/ui'
import { writable } from 'svelte/store'

import { type BlobMetadata, type BlobContentTypeExtension } from './types'
import { createQuery } from './utils'
import plugin from './plugin'

/**
 * @public
 */
export async function uploadFile (file: File): Promise<Ref<Blob>> {
  const uploadUrl = getMetadata(plugin.metadata.UploadURL)

  if (uploadUrl === undefined) {
    throw Error('UploadURL is not defined')
  }

  const data = new FormData()
  data.append('file', file)

  const resp = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + (getMetadata(plugin.metadata.Token) as string)
    },
    body: data
  })

  if (resp.status !== 200) {
    if (resp.status === 413) {
      throw new PlatformError(new Status(Severity.ERROR, plugin.status.FileTooLarge, {}))
    } else {
      throw Error(`Failed to upload file: ${resp.statusText}`)
    }
  }

  return (await resp.text()) as Ref<Blob>
}

/**
 * @public
 */
export async function deleteFile (id: string): Promise<void> {
  const uploadUrl = getMetadata(plugin.metadata.UploadURL) ?? ''

  const url = concatLink(uploadUrl, `?file=${id}`)
  const resp = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: 'Bearer ' + (getMetadata(plugin.metadata.Token) as string)
    }
  })

  if (resp.status !== 200) {
    throw new Error('Failed to delete file')
  }
}

/**
 * @public
 */
export async function getFileMetadata (file: File, uuid: Ref<Blob>): Promise<BlobMetadata | undefined> {
  const previewType = await getPreviewType(file.type, $previewTypes)
  if (previewType?.metadataProvider === undefined) {
    return undefined
  }

  const metadataProvider = await getResource(previewType.metadataProvider)
  if (metadataProvider === undefined) {
    return undefined
  }

  return await metadataProvider(file, uuid)
}

/**
 * @public
 */
export const previewTypes = writable<BlobContentTypeExtension[]>([])
const previewTypesQuery = createQuery(true)
previewTypesQuery.query(plugin.class.BlobContentTypeExtension, {}, (result) => {
  previewTypes.set(result)
})

let $previewTypes: BlobContentTypeExtension[] = []
previewTypes.subscribe((it) => {
  $previewTypes = it
})

/**
 * @public
 */
export async function canPreviewFile (contentType: string, _previewTypes: BlobContentTypeExtension[]): Promise<boolean> {
  for (const previewType of _previewTypes) {
    if (await isApplicableType(previewType, contentType)) {
      return true
    }
  }

  return false
}

/**
 * @public
 */
export async function getPreviewType (
  contentType: string,
  _previewTypes: BlobContentTypeExtension[]
): Promise<BlobContentTypeExtension | undefined> {
  const applicableTypes: BlobContentTypeExtension[] = []
  for (const previewType of _previewTypes) {
    if (await isApplicableType(previewType, contentType)) {
      applicableTypes.push(previewType)
    }
  }

  return applicableTypes.sort(comparePreviewTypes)[0]
}

/**
 * @public
 */
export function getPreviewAlignment (contentType: string): PopupAlignment {
  if (contentType.startsWith('image/')) {
    return 'centered'
  } else if (contentType.startsWith('video/')) {
    return 'centered'
  } else {
    return 'float'
  }
}

function getPreviewTypeRegExp (type: string): RegExp {
  return new RegExp(`^${type.replaceAll('/', '\\/').replaceAll('*', '.*')}$`)
}

async function isApplicableType (
  { contentType, availabilityChecker }: BlobContentTypeExtension,
  _contentType: string
): Promise<boolean> {
  const checkAvailability = availabilityChecker !== undefined ? await getResource(availabilityChecker) : undefined
  const isAvailable: boolean = checkAvailability === undefined || (await checkAvailability())

  return (
    isAvailable &&
    (Array.isArray(contentType) ? contentType : [contentType]).some((type) =>
      getPreviewTypeRegExp(type).test(_contentType)
    )
  )
}

function comparePreviewTypes (a: BlobContentTypeExtension, b: BlobContentTypeExtension): number {
  if (a.order === undefined && b.order === undefined) {
    return 0
  } else if (a.order === undefined) {
    return -1
  } else if (b.order === undefined) {
    return 1
  } else {
    return a.order - b.order
  }
}
