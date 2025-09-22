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

import { RetryOptions, withRetry } from '@hcengineering/retry'
import { HulylakeError, NetworkError, NotFoundError } from './error'

async function innerFetchSafe (url: string | URL, init?: RequestInit): Promise<Response> {
  let response
  try {
    response = await fetch(url, init)
  } catch (err: any) {
    console.error('network error', { err })
    throw new NetworkError(`Network error ${err}`)
  }

  if (response.ok) {
    return response
  }

  const text = await response.text()
  if (response.status === 404) {
    throw new NotFoundError(text)
  } else {
    throw new HulylakeError(text)
  }
}

export async function fetchSafe (url: string | URL, init?: RequestInit, retryOptions?: RetryOptions): Promise<Response> {
  if (retryOptions != null) {
    return await withRetry(async () => await innerFetchSafe(url, init), retryOptions)
  }
  return await innerFetchSafe(url, init)
}

export function unwrapEtag (etag: string | null | undefined): string | undefined {
  if (etag == null) {
    return undefined
  }

  if (etag.startsWith('W/')) {
    etag = etag.substring(2)
  }

  if (etag.startsWith('"') && etag.endsWith('"')) {
    etag = etag.slice(1, -1)
  }

  return etag
}

export function unwrapContentLength (length: string | null | undefined): number | undefined {
  if (length == null) {
    return undefined
  }
  return parseInt(length, 10)
}

export function unwrapLastModified (lastModified: string | null | undefined): number | undefined {
  if (lastModified == null) {
    return undefined
  }
  return Date.parse(lastModified)
}
