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

import { concatLink, type Blob, type Ref } from '@hcengineering/core'
import { PlatformError, Severity, Status, getMetadata } from '@hcengineering/platform'
import { v4 as uuid } from 'uuid'

import plugin from './plugin'

interface FileUploadError {
  key: string
  error: string
}

interface FileUploadSuccess {
  key: string
  id: string
}

type FileUploadResult = FileUploadSuccess | FileUploadError

const defaultUploadUrl = '/files'
const defaultFilesUrl = '/files/:workspace/:filename?file=:blobId&workspace=:workspace'

function getFilesUrl (): string {
  const filesUrl = getMetadata(plugin.metadata.FilesURL) ?? defaultFilesUrl
  const frontUrl = getMetadata(plugin.metadata.FrontUrl) ?? window.location.origin

  return filesUrl.includes('://') ? filesUrl : concatLink(frontUrl, filesUrl)
}

export function getCurrentWorkspaceId (): string {
  return getMetadata(plugin.metadata.WorkspaceId) ?? ''
}

/**
 * @public
 */
export function generateFileId (): string {
  return uuid()
}

/**
 * @public
 */
export function getUploadUrl (): string {
  const template = getMetadata(plugin.metadata.UploadURL) ?? defaultUploadUrl

  return template.replaceAll(':workspace', encodeURIComponent(getCurrentWorkspaceId()))
}

/**
 * @public
 */
export function getFileUrl (file: string, filename?: string): string {
  if (file.includes('://')) {
    return file
  }

  const template = getFilesUrl()
  return template
    .replaceAll(':filename', encodeURIComponent(filename ?? file))
    .replaceAll(':workspace', encodeURIComponent(getCurrentWorkspaceId()))
    .replaceAll(':blobId', encodeURIComponent(file))
}

/**
 * @public
 */
export async function uploadFile (file: File): Promise<Ref<Blob>> {
  const uploadUrl = getUploadUrl()

  const id = generateFileId()
  const data = new FormData()
  data.append('file', file, id)

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

  const result = (await resp.json()) as FileUploadResult[]
  if (result.length !== 1) {
    throw Error('Bad upload response')
  }

  if ('error' in result[0]) {
    throw Error(`Failed to upload file: ${result[0].error}`)
  }

  return id as Ref<Blob>
}

/**
 * @public
 */
export async function deleteFile (id: string): Promise<void> {
  const fileUrl = getFileUrl(id)

  const resp = await fetch(fileUrl, {
    method: 'DELETE',
    headers: {
      Authorization: 'Bearer ' + (getMetadata(plugin.metadata.Token) as string)
    }
  })

  if (resp.status !== 200) {
    throw new Error('Failed to delete file')
  }
}
