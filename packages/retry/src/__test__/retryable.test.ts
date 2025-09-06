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

import { retryAllErrors, retryNetworkErrors } from '../retryable'

describe('retryAllErrors', () => {
  it('should return true for any error', () => {
    expect(retryAllErrors(new Error('any error'))).toBe(true)
    expect(retryAllErrors(new TypeError('type error'))).toBe(true)
    expect(retryAllErrors(null)).toBe(true)
    expect(retryAllErrors(undefined)).toBe(true)
    expect(retryAllErrors({ custom: 'error object' })).toBe(true)
    expect(retryAllErrors('error string')).toBe(true)
  })
})

describe('retryNetworkErrors', () => {
  it('should return false for null or undefined', () => {
    expect(retryNetworkErrors(null)).toBe(false)
    expect(retryNetworkErrors(undefined)).toBe(false)
  })

  it('should return true for errors with network-related names', () => {
    const networkErrorNames = [
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
    ]

    networkErrorNames.forEach((name) => {
      // Create an error with the specified name
      const error = new Error('Test error')
      error.name = name
      expect(retryNetworkErrors(error)).toBe(true)
    })
  })

  it('should return true for errors with network-related message patterns', () => {
    const networkErrorMessages = [
      'Network error occurred',
      'Connection timed out',
      'Connection refused',
      'Connection reset',
      'Socket hang up',
      'DNS lookup failed',
      'getaddrinfo ENOTFOUND api.example.com',
      'connect ECONNREFUSED 127.0.0.1:8080',
      'read ECONNRESET',
      'connect ETIMEDOUT 192.168.1.1:443',
      'getaddrinfo EAI_AGAIN myserver.local'
    ]

    networkErrorMessages.forEach((message) => {
      expect(retryNetworkErrors(new Error(message))).toBe(true)
    })
  })

  it('should return false for non-network related errors', () => {
    const nonNetworkErrors = [
      new Error('Invalid input'),
      new TypeError('Cannot read property of undefined'),
      new RangeError('Value out of range'),
      new SyntaxError('Unexpected token'),
      new Error('File not found'),
      new Error('Permission denied'),
      new Error('Invalid state')
    ]

    nonNetworkErrors.forEach((error) => {
      expect(retryNetworkErrors(error)).toBe(false)
    })
  })

  it('should return true for errors with server error status codes (5xx)', () => {
    const serverErrors = [
      createErrorWithStatus(500),
      createErrorWithStatus(501),
      createErrorWithStatus(502),
      createErrorWithStatus(503),
      createErrorWithStatus(504),
      createErrorWithStatus(599)
    ]

    serverErrors.forEach((error) => {
      expect(retryNetworkErrors(error)).toBe(true)
    })
  })

  it('should return true for specific client error status codes', () => {
    const retriableClientErrors = [
      createErrorWithStatus(408), // Request Timeout
      createErrorWithStatus(423), // Locked
      createErrorWithStatus(425), // Too Early
      createErrorWithStatus(429), // Too Many Requests
      createErrorWithStatus(449) // Retry With
    ]

    retriableClientErrors.forEach((error) => {
      expect(retryNetworkErrors(error)).toBe(true)
    })
  })

  it('should return false for non-retriable client error status codes', () => {
    const nonRetriableClientErrors = [
      createErrorWithStatus(400), // Bad Request
      createErrorWithStatus(401), // Unauthorized
      createErrorWithStatus(403), // Forbidden
      createErrorWithStatus(404), // Not Found
      createErrorWithStatus(422) // Unprocessable Entity
    ]

    nonRetriableClientErrors.forEach((error) => {
      expect(retryNetworkErrors(error)).toBe(false)
    })
  })

  it('should return false for non-Error objects without network-related properties', () => {
    const nonNetworkErrorObjects = [
      { code: 'INVALID_INPUT' },
      { code: 'AUTH_FAILED' },
      { message: 'Invalid credentials' },
      { error: 'Not found' }
    ]

    nonNetworkErrorObjects.forEach((errorObj) => {
      expect(retryNetworkErrors(errorObj)).toBe(false)
    })
  })
})

/**
 * Helper function to create an Error object with a status property
 */
function createErrorWithStatus (status: number): Error {
  const error: any = new Error(`HTTP Error ${status}`)
  error.status = status
  return error
}
