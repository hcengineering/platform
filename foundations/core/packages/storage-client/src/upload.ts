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

import { concatLink } from '@hcengineering/core'
import { FileStorageUploadOptions } from './types'

/** @public */
export interface XHRUpload {
  url: string
  method: 'POST' | 'PUT'
  headers: Record<string, string>
  body: XMLHttpRequestBodyInit
}

/** @public */
export interface XHRUploadResult {
  status: number
  responseText: string
}

/** @public */
export async function uploadXhr (upload: XHRUpload, options?: FileStorageUploadOptions): Promise<XHRUploadResult> {
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
            status: xhr.status,
            responseText: xhr.responseText
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

/** @public */
export interface MultipartUpload {
  url: string
  headers: Record<string, string>
  body: File | Blob
}

/** @public */
export async function uploadMultipart (upload: MultipartUpload, options?: FileStorageUploadOptions): Promise<void> {
  const CHUNK_SIZE = 5 * 1024 * 1024 // 5MB chunks
  const { url, headers, body } = upload
  const signal = options?.signal
  const onProgress = options?.onProgress

  let uploadId: string | undefined

  try {
    const { uploadId } = await multipartUploadCreate(url, { ...headers, 'Content-Type': body.type }, signal)

    const parts: Array<{ partNumber: number, etag: string }> = []
    const totalParts = Math.ceil(body.size / CHUNK_SIZE)
    let uploaded = 0

    for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
      const start = (partNumber - 1) * CHUNK_SIZE
      const end = Math.min(start + CHUNK_SIZE, body.size)
      const chunk = body.slice(start, end)

      throwIfAborted(signal)

      const partOptions: FileStorageUploadOptions = {
        signal,
        onProgress:
          onProgress !== undefined
            ? (progress) => {
                const loaded = uploaded + progress.loaded
                onProgress({
                  loaded,
                  total: body.size,
                  percentage: Math.round((loaded * 100) / body.size)
                })
              }
            : undefined
      }

      const { etag } = await multipartUploadPart(url, headers, uploadId, partNumber, chunk, partOptions)
      parts.push({ partNumber, etag })

      uploaded += chunk.size
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
  options?: FileStorageUploadOptions
): Promise<{ etag: string }> {
  const url = new URL(concatLink(baseUrl, '/part'))
  url.searchParams.set('uploadId', uploadId)
  url.searchParams.set('partNumber', `${partNumber}`)

  const result = await uploadXhr(
    {
      url: url.toString(),
      method: 'PUT',
      headers,
      body: blob
    },
    options
  )

  try {
    const response = JSON.parse(result.responseText)
    return { etag: response.etag }
  } catch (err) {
    throw new Error(`Failed to parse response for part ${partNumber}`)
  }
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
