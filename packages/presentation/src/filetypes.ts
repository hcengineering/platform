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

import { Analytics } from '@hcengineering/analytics'
import { type Blob, type Ref } from '@hcengineering/core'
import { getResource } from '@hcengineering/platform'
import { type PopupAlignment } from '@hcengineering/ui'
import { writable } from 'svelte/store'

import plugin from './plugin'
import type { BlobMetadata, FileOrBlob, FilePreviewExtension } from './types'
import { createQuery } from './utils'

/**
 * @public
 */
export async function getFileMetadata (file: FileOrBlob, uuid: Ref<Blob>): Promise<BlobMetadata | undefined> {
  const previewType = await getPreviewType(file.type, $previewTypes)
  if (previewType?.metadataProvider === undefined) {
    return undefined
  }

  const metadataProvider = await getResource(previewType.metadataProvider)
  if (metadataProvider === undefined) {
    return undefined
  }

  try {
    return await metadataProvider(file, uuid)
  } catch (err) {
    console.error(err)
    Analytics.handleError(err as Error)
    return undefined
  }
}

/**
 * @public
 */
export const previewTypes = writable<FilePreviewExtension[]>([])
const previewTypesQuery = createQuery(true)
previewTypesQuery.query(plugin.class.FilePreviewExtension, {}, (result) => {
  previewTypes.set(result)
})

let $previewTypes: FilePreviewExtension[] = []
previewTypes.subscribe((it) => {
  $previewTypes = it
})

/**
 * @public
 */
export async function canPreviewFile (contentType: string, _previewTypes: FilePreviewExtension[]): Promise<boolean> {
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
  _previewTypes: FilePreviewExtension[]
): Promise<FilePreviewExtension | undefined> {
  const applicableTypes: FilePreviewExtension[] = []
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
  { contentType, availabilityChecker }: FilePreviewExtension,
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

function comparePreviewTypes (a: FilePreviewExtension, b: FilePreviewExtension): number {
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
