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

import { concatLink } from '@hcengineering/core'
import platform, { PlatformError, Status, Severity } from '@hcengineering/platform'

/**
 * Options for making HTTP requests to integration service APIs.
 */
export interface RequestOptions {
  /** The base URL of the API endpoint */
  baseUrl: string
  /** HTTP method to use */
  method: 'GET' | 'POST' | 'DELETE'
  /** Optional path to append to the base URL */
  path?: string
  /** Optional Bearer token for authorization */
  token?: string
  /** Optional request body (will be JSON stringified) */
  body?: any
}

/**
 * Makes HTTP requests to integration service APIs with proper error handling.
 *
 * @param options - Request configuration options
 * @returns Promise that resolves to the parsed JSON response, or undefined for empty responses
 * @throws {PlatformError} When network errors occur or HTTP status indicates failure
 */
export async function request (options: RequestOptions): Promise<any> {
  const { baseUrl, method, path, token, body } = options
  let response: Response
  try {
    response = await fetch(concatLink(baseUrl, path ?? ''), {
      method,
      headers: {
        ...(token !== undefined ? { Authorization: 'Bearer ' + token } : {}),
        'Content-Type': 'application/json'
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {})
    })
  } catch (err) {
    throw new PlatformError(
      new Status(Severity.ERROR, platform.status.ConnectionClosed, {
        message: 'Network error occurred'
      })
    )
  }

  if (response.status === 200) {
    const contentLength = response.headers.get('content-length')
    const contentType = response.headers.get('content-type') ?? ''

    if (contentLength === '0' || (!contentType.includes('application/json') && !contentType.includes('text/json'))) {
      return undefined
    }

    const text = await response.text()
    if (text.trim() === '') {
      return undefined
    }

    try {
      return JSON.parse(text)
    } catch (error) {
      console.warn('Failed to parse JSON response:', text, error)
      return undefined
    }
  } else if (response.status === 202) {
    return undefined
  } else if (response.status === 401) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Unauthorized, {}))
  } else if (response.status === 403) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
  } else if (response.status === 404) {
    throw new PlatformError(
      new Status(Severity.ERROR, platform.status.ResourceNotFound, { resource: options.path ?? '' })
    )
  } else if (response.status >= 500) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.InternalServerError, {}))
  } else {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, { status: response.status }))
  }
}
