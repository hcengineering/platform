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

import type { LoginInfoByToken, LoginInfoRequest, WorkspaceLoginInfo } from './types'

export function isWorkspaceLoginInfo (loginInfo: LoginInfoByToken): loginInfo is WorkspaceLoginInfo {
  return !isLoginInfoRequest(loginInfo) && (loginInfo as WorkspaceLoginInfo)?.workspace != null
}

export function isLoginInfoRequest (info: LoginInfoByToken): info is LoginInfoRequest {
  return (info as LoginInfoRequest)?.request
}

export function getClientTimezone (): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch (err: any) {
    console.error('Failed to get client timezone', err)
    return undefined
  }
}

const connectionErrorCodes = ['ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND']
const networkErrorNames = ['NetworkError', 'TypeError', 'FetchError']
const browserFetchErrorMessages = ['failed to fetch', 'networkerror', 'network request failed']
const networkMessageKeywords = ['fetch', 'network', 'connection']

/**
 * Check if a message contains network-related keywords
 */
function hasNetworkMessage (message: string): boolean {
  const lowerMessage = message.toLowerCase()
  return networkMessageKeywords.some((keyword) => lowerMessage.includes(keyword))
}

/**
 * Check if an error is a network/connection error that should be retried
 */
export function isNetworkError (err: unknown): boolean {
  if (err == null) {
    return false
  }

  // Check Node.js-style connection error codes
  if (typeof err === 'object' && 'cause' in err) {
    const cause = (err as { cause?: unknown }).cause
    if (cause != null && typeof cause === 'object' && 'code' in cause) {
      const code = (cause as { code?: unknown }).code
      if (typeof code === 'string' && connectionErrorCodes.includes(code)) {
        return true
      }
    }
  }

  // Get error name and message (handles both Error instances and plain objects)
  let errorName: string | undefined
  let message: string | undefined

  if (err instanceof TypeError) {
    errorName = 'TypeError'
    message = err.message
  } else if (typeof err === 'object' && 'name' in err && 'message' in err) {
    const name = (err as { name?: unknown }).name
    const msg = (err as { message?: unknown }).message
    if (typeof name === 'string') {
      errorName = name
    }
    if (typeof msg === 'string') {
      message = msg
    }
  }

  // Check if error name matches network error types
  if (errorName != null && networkErrorNames.includes(errorName) && message != null) {
    const lowerMessage = message.toLowerCase()
    // Check for specific browser fetch error messages
    if (browserFetchErrorMessages.some((pattern) => lowerMessage.includes(pattern))) {
      return true
    }
    // Check for general network-related keywords
    if (hasNetworkMessage(message)) {
      return true
    }
  }

  return false
}
