//
// Copyright © 2025 Hardcore Engineering Inc.
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

import core, { concatLink, WorkspaceUuid, Blob, Ref } from '@hcengineering/core'
import { Readable } from 'stream'
import { StorageClient } from './types'
import { loadServerConfig, ServerConfig } from '../config'
import { NetworkError, NotFoundError, StorageError } from './error'
import { AuthOptions } from '../types'
import { getWorkspaceToken } from '../utils'

interface ObjectMetadata {
  name: string
  etag: string
  size: number
  contentType: string
  lastModified: number
  cacheControl?: string
}

interface BlobUploadSuccess {
  key: string
  id: string
  metadata: ObjectMetadata
}

interface BlobUploadError {
  key: string
  error: string
}

type BlobUploadResult = BlobUploadSuccess | BlobUploadError

export class StorageClientImpl implements StorageClient {
  private readonly headers: Record<string, string>
  constructor (
    readonly filesUrl: string,
    readonly uploadUrl: string,
    token: string,
    readonly workspace: WorkspaceUuid
  ) {
    this.headers = {
      Authorization: 'Bearer ' + token
    }
  }

  getObjectUrl (objectName: string): string {
    return this.filesUrl.replace(':filename', objectName).replace(':blobId', objectName)
  }

  async stat (objectName: string): Promise<Blob | undefined> {
    const url = this.getObjectUrl(objectName)
    let response
    try {
      response = await wrappedFetch(url, { method: 'HEAD', headers: { ...this.headers } })
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        return
      }
      throw error
    }
    const headers = response.headers
    const lastModified = Date.parse(headers.get('Last-Modified') ?? '')
    const size = parseInt(headers.get('Content-Length') ?? '0', 10)
    return {
      provider: '',
      _class: core.class.Blob,
      _id: objectName as Ref<Blob>,
      contentType: headers.get('Content-Type') ?? '',
      size: isNaN(size) ? 0 : size ?? 0,
      etag: headers.get('ETag') ?? '',
      space: core.space.Configuration,
      modifiedBy: core.account.System,
      modifiedOn: isNaN(lastModified) ? 0 : lastModified,
      version: null
    }
  }

  async get (objectName: string): Promise<Readable> {
    const url = this.getObjectUrl(objectName)

    const response = await wrappedFetch(url, { headers: { ...this.headers } })

    if (response.body == null) {
      throw new StorageError('Missing response body')
    }
    return Readable.from(response.body)
  }

  async put (objectName: string, stream: Readable | Buffer | string, contentType: string, size?: number): Promise<Blob> {
    const buffer = await toBuffer(stream)
    const file = new File([buffer], objectName, { type: contentType })
    const formData = new FormData()
    formData.append('file', file)
    let response
    try {
      response = await fetch(this.uploadUrl, {
        method: 'POST',
        body: formData,
        headers: { ...this.headers }
      })
    } catch (error: any) {
      throw new NetworkError(`Network error ${error}`)
    }
    if (!response.ok) {
      throw new StorageError(await response.text())
    }
    const result = (await response.json()) as BlobUploadResult[]
    if (Object.hasOwn(result[0], 'id')) {
      const fileResult = result[0] as BlobUploadSuccess
      return {
        _class: core.class.Blob,
        _id: fileResult.id as Ref<Blob>,
        space: core.space.Configuration,
        modifiedOn: fileResult.metadata.lastModified,
        modifiedBy: core.account.System,
        provider: '',
        contentType: fileResult.metadata.contentType,
        etag: fileResult.metadata.etag,
        version: null,
        size: fileResult.metadata.size
      }
    } else {
      const error = (result[0] as BlobUploadError) ?? 'Unknown error'
      throw new StorageError(`Storage error ${error.error}`)
    }
  }

  async partial (objectName: string, offset: number, length?: number): Promise<Readable> {
    const url = this.getObjectUrl(objectName)

    const response = await wrappedFetch(url, {
      headers: {
        ...this.headers,
        Range: length !== undefined ? `bytes=${offset}-${offset + length - 1}` : `bytes=${offset}`
      }
    })

    if (response.body == null) {
      throw new StorageError('Missing response body')
    }
    return Readable.from(response.body)
  }

  async remove (objectName: string): Promise<void> {
    const url = this.getObjectUrl(objectName)
    await wrappedFetch(url, {
      method: 'DELETE',
      headers: { ...this.headers }
    })
  }
}

async function toBuffer (data: Buffer | string | Readable): Promise<Buffer> {
  if (Buffer.isBuffer(data)) {
    return data
  } else if (typeof data === 'string') {
    return Buffer.from(data)
  } else if (data instanceof Readable) {
    const chunks: Buffer[] = []
    for await (const chunk of data) {
      chunks.push(chunk)
    }
    return Buffer.concat(chunks as any)
  } else {
    throw new TypeError('Unsupported data type')
  }
}

async function wrappedFetch (url: string | URL, init?: RequestInit): Promise<Response> {
  let response: Response
  try {
    response = await fetch(url, init)
  } catch (error: any) {
    throw new NetworkError(`Network error ${error}`)
  }
  if (!response.ok) {
    const text = await response.text()
    if (response.status === 404) {
      throw new NotFoundError(text)
    } else {
      throw new StorageError(text)
    }
  }
  return response
}

export function createStorageClient (
  filesUrl: string,
  uploadUrl: string,
  token: string,
  workspace: WorkspaceUuid
): StorageClient {
  return new StorageClientImpl(filesUrl, uploadUrl, token, workspace)
}

export async function connectStorage (url: string, options: AuthOptions, config?: ServerConfig): Promise<StorageClient> {
  config ??= await loadServerConfig(url)
  const token = await getWorkspaceToken(url, options, config)
  const filesUrl = (config.FILES_URL.startsWith('/') ? concatLink(url, config.FILES_URL) : config.FILES_URL).replace(
    ':workspace',
    token.workspaceId
  )
  const uploadUrl = (
    config.UPLOAD_URL.startsWith('/') ? concatLink(url, config.UPLOAD_URL) : config.UPLOAD_URL
  ).replace(':workspace', token.workspaceId)
  return new StorageClientImpl(filesUrl, uploadUrl, token.token, token.workspaceId)
}
