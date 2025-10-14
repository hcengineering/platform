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

import { type WorkspaceUuid, concatLink } from '@hcengineering/core'
import { getMetadata } from '@hcengineering/platform'
import presentation from './plugin'
import { type FileStorage, type FileStorageUploadOptions } from './types'

function getWorkspace (): WorkspaceUuid {
  const workspaceUuid = getMetadata(presentation.metadata.WorkspaceUuid) ?? ''
  return workspaceUuid as WorkspaceUuid
}

function getToken (): string {
  return getMetadata(presentation.metadata.Token) ?? ''
}

export function createFileStorage (uploadUrl: string, datalakeUrl?: string, hulylakeUrl?: string): FileStorage {
  if (datalakeUrl !== undefined && datalakeUrl !== '') {
    console.debug('Using Datalake storage')
    return new DatalakeStorage(datalakeUrl)
  }

  if (hulylakeUrl !== undefined && hulylakeUrl !== '') {
    console.debug('Using Hulylake storage')
    return new HulylakeStorage(hulylakeUrl)
  }

  console.debug('Using Front storage')
  return new FrontStorage(uploadUrl)
}

class FrontStorage implements FileStorage {
  constructor (private readonly baseUrl: string) {}

  getFileUrl (file: string, filename?: string): string {
    const workspace = getWorkspace()
    const path = `/${workspace}/${filename ?? file}?file=${file}&workspace=${workspace}`
    return concatLink(this.baseUrl, path)
  }

  async getFileMeta (file: string): Promise<Record<string, any>> {
    return {}
  }

  async deleteFile (file: string): Promise<void> {
    const token = getToken()
    const url = this.getFileUrl(file)

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to delete file')
    }
  }

  async uploadFile (uuid: string, file: File, options?: FileStorageUploadOptions): Promise<void> {
    const token = getToken()
    const workspace = getWorkspace()

    const formData = new FormData()
    formData.append('file', file)
    formData.append('uuid', uuid)

    await uploadXhr(
      {
        url: concatLink(this.baseUrl, `/${workspace}`),
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      },
      options
    )
  }
}

class DatalakeStorage implements FileStorage {
  constructor (private readonly baseUrl: string) {}

  getFileUrl (file: string, filename?: string): string {
    const workspace = getWorkspace()
    const path = `/blob/${workspace}/${file}/${filename}`
    return concatLink(this.baseUrl, path)
  }

  async getFileMeta (file: string): Promise<Record<string, any>> {
    const workspace = getWorkspace()
    const token = getToken()

    const url = concatLink(this.baseUrl, `/meta/${encodeURIComponent(workspace)}/${encodeURIComponent(file)}`)
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      if (response.ok) {
        return await response.json()
      }
    } catch (err: any) {}
    return {}
  }

  async deleteFile (file: string): Promise<void> {
    const token = getToken()
    const url = this.getFileUrl(file)

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to delete file')
    }
  }

  async uploadFile (uuid: string, file: File, options?: FileStorageUploadOptions): Promise<void> {
    const workspace = getWorkspace()
    const token = getToken()

    if (file.size <= 10 * 1024 * 1024) {
      const formData = new FormData()
      formData.append('file', file, uuid)

      await uploadXhr(
        {
          url: concatLink(this.baseUrl, `/upload/form-data/${encodeURIComponent(workspace)}`),
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        },
        options
      )
    } else {
      const url = concatLink(
        this.baseUrl,
        `/upload/multipart/${encodeURIComponent(workspace)}/${encodeURIComponent(uuid)}`
      )
      const headers = { Authorization: `Bearer ${token}` }
      await uploadMultipart({ url, headers, body: file }, options)
    }
  }
}

class HulylakeStorage implements FileStorage {
  constructor (private readonly baseUrl: string) {}

  getFileUrl (file: string, filename?: string): string {
    const workspace = getWorkspace()
    const path = `/api/${workspace}/${file}`
    return concatLink(this.baseUrl, path)
  }

  async getFileMeta (file: string): Promise<Record<string, any>> {
    return {}
  }

  async deleteFile (file: string): Promise<void> {
    const token = getToken()
    const url = this.getFileUrl(file)

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to delete file')
    }
  }

  async uploadFile (uuid: string, file: File, options?: FileStorageUploadOptions): Promise<void> {
    const token = getToken()
    const url = this.getFileUrl(uuid)

    await uploadXhr(
      {
        url,
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: file
      },
      options
    )
  }
}

interface XHRUpload {
  url: string
  method: 'POST' | 'PUT'
  headers: Record<string, string>
  body: XMLHttpRequestBodyInit
}

interface XHRUploadResult {
  status: number
}

async function uploadXhr (upload: XHRUpload, options?: FileStorageUploadOptions): Promise<XHRUploadResult> {
  const signal = options?.signal
  const onProgress = options?.onProgress

  // Check if already aborted before starting
  if (signal?.aborted === true) {
    throw new Error('Upload aborted')
  }

  const xhr = new XMLHttpRequest()

  const abortHandler = (): void => {
    xhr.abort()
  }

  if (signal !== undefined) {
    signal.addEventListener('abort', abortHandler)
  }

  try {
    return await new Promise<XHRUploadResult>((resolve, reject) => {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress?.({
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((100 * event.loaded) / event.total)
          })
        }
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({
            status: xhr.status
          })
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`))
        }
      }

      xhr.onerror = () => {
        reject(new Error('Network error'))
      }

      xhr.onabort = () => {
        reject(new Error('Upload aborted'))
      }

      xhr.ontimeout = () => {
        reject(new Error('Upload timeout'))
      }

      xhr.open(upload.method, upload.url, true)

      for (const key in upload.headers) {
        xhr.setRequestHeader(key, upload.headers[key])
      }

      xhr.send(upload.body)
    })
  } finally {
    if (signal !== undefined) {
      signal.removeEventListener('abort', abortHandler)
    }
  }
}

interface MultipartUpload {
  url: string
  headers: Record<string, string>
  body: File | Blob
}

async function uploadMultipart (upload: MultipartUpload, options?: FileStorageUploadOptions): Promise<void> {
  const CHUNK_SIZE = 5 * 1024 * 1024 // 5MB chunks
  const { url, headers, body } = upload
  const signal = options?.signal
  const onProgress = options?.onProgress

  let uploadId: string | undefined

  try {
    const { uploadId } = await multipartUploadCreate(url, headers, signal)

    const parts: Array<{ partNumber: number, etag: string }> = []
    const totalParts = Math.ceil(body.size / CHUNK_SIZE)
    let uploadedSize = 0

    for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
      const start = (partNumber - 1) * CHUNK_SIZE
      const end = Math.min(start + CHUNK_SIZE, body.size)
      const chunk = body.slice(start, end)

      throwIfAborted(signal)

      const { etag } = await multipartUploadPart(url, headers, uploadId, partNumber, chunk, signal)
      parts.push({ partNumber, etag })

      uploadedSize += chunk.size
      onProgress?.({
        loaded: uploadedSize,
        total: body.size,
        percentage: Math.round((uploadedSize * 100) / body.size)
      })
    }

    throwIfAborted(signal)

    await multipartUploadComplete(url, headers, uploadId, parts, signal)
  } catch (err) {
    if (uploadId !== undefined) {
      await multipartUploadAbort(url, headers, uploadId)
    }

    throw err instanceof Error ? err : new Error(String(err))
  }
}

function throwIfAborted (signal?: AbortSignal): void {
  if (signal?.aborted === true) {
    throw new Error('Upload aborted')
  }
}

async function multipartUploadCreate (
  baseUrl: string,
  headers: Record<string, string>,
  signal?: AbortSignal
): Promise<{ uuid: string, uploadId: string }> {
  const response = await fetch(baseUrl, {
    signal,
    method: 'POST',
    headers
  })

  if (!response.ok) {
    throw new Error('Failed to initialize multipart upload')
  }

  const { uuid, uploadId } = await response.json()
  return { uuid, uploadId }
}

async function multipartUploadComplete (
  baseUrl: string,
  headers: Record<string, string>,
  uploadId: string,
  parts: Array<{ partNumber: number, etag: string }>,
  signal?: AbortSignal
): Promise<void> {
  const url = new URL(concatLink(baseUrl, '/complete'))
  url.searchParams.set('uploadId', uploadId)

  const response = await fetch(url, {
    signal,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: JSON.stringify({ parts })
  })

  if (!response.ok) {
    throw new Error('Failed to complete multipart upload')
  }
}

async function multipartUploadPart (
  baseUrl: string,
  headers: Record<string, string>,
  uploadId: string,
  partNumber: number,
  blob: Blob,
  signal?: AbortSignal
): Promise<{ etag: string }> {
  const url = new URL(concatLink(baseUrl, '/part'))
  url.searchParams.set('uploadId', uploadId)
  url.searchParams.set('partNumber', `${partNumber}`)

  const response = await fetch(url, {
    signal,
    method: 'PUT',
    headers,
    body: blob
  })

  if (!response.ok) {
    throw new Error(`Failed to upload part ${partNumber}`)
  }

  const { etag } = await response.json()
  return { etag }
}

async function multipartUploadAbort (baseUrl: string, headers: Record<string, string>, uploadId: string): Promise<void> {
  const url = new URL(concatLink(baseUrl, '/abort'))
  url.searchParams.set('uploadId', uploadId)

  const response = await fetch(url, {
    method: 'POST',
    headers
  })

  if (!response.ok) {
    throw new Error('Failed to reject multipart upload')
  }
}
