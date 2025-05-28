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

export type IsRetryable = (error: Error | unknown) => boolean

export const retryAllErrors: IsRetryable = (_error: Error | unknown): boolean => {
  return true
}

const NETWORK_ERROR_NAMES = new Set([
  'NetworkError',
  'FetchError',
  'AbortError',
  'TimeoutError',
  'ConnectionError',
  'ConnectionRefusedError',
  'ETIMEDOUT',
  'ECONNREFUSED',
  'ECONNRESET',
  'ENOTFOUND',
  'EAI_AGAIN'
])

/**
 * Patterns in error messages that suggest network issues
 */
const NETWORK_ERROR_PATTERNS = [
  /network/i,
  /connection/i,
  /timeout/i,
  /unreachable/i,
  /refused/i,
  /reset/i,
  /socket/i,
  /DNS/i,
  /ENOTFOUND/,
  /ECONNREFUSED/,
  /ECONNRESET/,
  /ETIMEDOUT/,
  /EAI_AGAIN/
]

/**
 * Determine if an error is related to network issues
 */
export const retryNetworkErrors: IsRetryable = (error: Error | unknown): boolean => {
  if (error == null) {
    return false
  }

  // Check for error name
  if (error instanceof Error) {
    // Check if the error name is in our set of network errors
    if (NETWORK_ERROR_NAMES.has(error.name)) {
      return true
    }

    // Check if the error message matches our network error patterns
    for (const pattern of NETWORK_ERROR_PATTERNS) {
      if (pattern.test(error.message)) {
        return true
      }
    }

    // Check for status codes in response errors
    if ('status' in error && typeof (error as any).status === 'number') {
      const status = (error as any).status
      // Retry server errors (5xx) and some specific client errors
      return (
        (status >= 500 && status < 600) || // Server errors
        status === 429 || // Too Many Requests
        status === 408 || // Request Timeout
        status === 423 || // Locked
        status === 425 || // Too Early
        status === 449 || // Retry With
        status === 503 || // Service Unavailable
        status === 504 // Gateway Timeout
      )
    }
  }

  // If we couldn't identify it as a network error, don't retry
  return false
}
