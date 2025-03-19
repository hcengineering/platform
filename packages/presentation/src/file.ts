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

import { concatLink, type Blob as PlatformBlob, type Ref } from '@hcengineering/core'
import { PlatformError, Severity, Status, getMetadata } from '@hcengineering/platform'
import { v4 as uuid } from 'uuid'

import plugin from './plugin'

export type FileUploadMethod = 'form-data' | 'signed-url'

export interface UploadConfig {
  'form-data': {
    url: string
  }
  'signed-url'?: {
    url: string
    size: number
  }
}

export interface FileUploadParams {
  method: FileUploadMethod
  url: string
  headers: Record<string, string>
}

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

function parseInt (value: string, fallback: number): number {
  const number = Number.parseInt(value)
  return Number.isInteger(number) ? number : fallback
}

export function parseUploadConfig (config: string, uploadUrl: string): UploadConfig {
  const uploadConfig: UploadConfig = {
    'form-data': { url: uploadUrl },
    'signed-url': undefined
  }

  if (config !== undefined) {
    const configs = config.split(';')
    for (const c of configs) {
      if (c === '') {
        continue
      }

      const [key, size, url] = c.split('|')

      if (url === undefined || url === '') {
        throw new Error(`Bad upload config: ${c}`)
      }

      if (key === 'form-data') {
        uploadConfig['form-data'] = { url }
      } else if (key === 'signed-url') {
        uploadConfig['signed-url'] = {
          url,
          size: parseInt(size, 0) * 1024 * 1024
        }
      } else {
        throw new Error(`Unknown upload config key: ${key}`)
      }
    }
  }

  return uploadConfig
}

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

function getUploadConfig (): UploadConfig {
  return getMetadata<UploadConfig>(plugin.metadata.UploadConfig) ?? { 'form-data': { url: getUploadUrl() } }
}

function getFileUploadMethod (blob: Blob): { method: FileUploadMethod, url: string } {
  const config = getUploadConfig()

  const signedUrl = config['signed-url']
  if (signedUrl !== undefined && signedUrl.size < blob.size) {
    return { method: 'signed-url', url: signedUrl.url }
  }

  return { method: 'form-data', url: config['form-data'].url }
}

/**
 * @public
 */
export function getFileUploadParams (blobId: string, blob: Blob): FileUploadParams {
  const workspaceId = encodeURIComponent(getCurrentWorkspaceId())
  const fileId = encodeURIComponent(blobId)

  const { method, url: urlTemplate } = getFileUploadMethod(blob)

  const url = urlTemplate.replaceAll(':workspace', workspaceId).replaceAll(':blobId', fileId)

  const headers: Record<string, string> =
    method !== 'signed-url'
      ? {
          Authorization: 'Bearer ' + (getMetadata(plugin.metadata.Token) as string)
        }
      : {}

  return { method, url, headers }
}

/**
 * @public
 */
export function getBlobUrl (file: string): string {
  const fileUrl = getFileUrl(file)
  const u = new URL(fileUrl)
  if (u.searchParams.has('file')) {
    return u.toString()
  }
  return fileUrl.split('/').slice(0, -1).join('/')
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
export async function uploadFile (file: File, uuid?: Ref<PlatformBlob>): Promise<Ref<PlatformBlob>> {
  uuid ??= generateFileId() as Ref<PlatformBlob>

  const params = getFileUploadParams(uuid, file)

  if (params.method === 'signed-url') {
    await uploadFileWithSignedUrl(file, uuid, params.url)
  } else {
    await uploadFileWithFormData(file, uuid, params.url)
  }

  return uuid
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

  if (!resp.ok) {
    throw new Error('Failed to delete file')
  }
}

async function uploadFileWithFormData (file: File, uuid: string, uploadUrl: string): Promise<void> {
  const data = new FormData()
  data.append('file', file, uuid)

  const resp = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + (getMetadata(plugin.metadata.Token) as string)
    },
    body: data
  })

  if (!resp.ok) {
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
}

async function uploadFileWithSignedUrl (file: File, uuid: string, uploadUrl: string): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + (getMetadata(plugin.metadata.Token) as string)
    }
  })

  if (response.ok) {
    throw Error(`Failed to genearte signed upload URL: ${response.statusText}`)
  }

  const signedUrl = await response.text()
  if (signedUrl === undefined || signedUrl === '') {
    throw Error('Missing signed upload URL')
  }

  try {
    const response = await fetch(signedUrl, {
      body: file,
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
        'Content-Length': file.size.toString()
        // 'x-amz-meta-last-modified': file.lastModified.toString()
      }
    })

    if (!response.ok) {
      throw Error(`Failed to upload file: ${response.statusText}`)
    }

    // confirm we uploaded file
    await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        Authorization: 'Bearer ' + (getMetadata(plugin.metadata.Token) as string)
      }
    })
  } catch (err) {
    // abort the upload
    await fetch(uploadUrl, {
      method: 'DELETE',
      headers: {
        Authorization: 'Bearer ' + (getMetadata(plugin.metadata.Token) as string)
      }
    })
  }
}

export async function getJsonOrEmpty (file: string, name: string): Promise<any> {
  try {
    const fileUrl = getFileUrl(file, name)
    const resp = await fetch(fileUrl)
    return await resp.json()
  } catch {
    return {}
  }
}
