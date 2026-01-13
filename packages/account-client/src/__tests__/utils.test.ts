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

import { isNetworkError } from '../utils'

describe('isNetworkError', () => {
  describe('Node.js-style connection errors', () => {
    it('should return true for ECONNRESET error', () => {
      const error = {
        cause: {
          code: 'ECONNRESET'
        }
      }
      expect(isNetworkError(error)).toBe(true)
    })

    it('should return true for ECONNREFUSED error', () => {
      const error = {
        cause: {
          code: 'ECONNREFUSED'
        }
      }
      expect(isNetworkError(error)).toBe(true)
    })

    it('should return true for ENOTFOUND error', () => {
      const error = {
        cause: {
          code: 'ENOTFOUND'
        }
      }
      expect(isNetworkError(error)).toBe(true)
    })

    it('should return false for other error codes', () => {
      const error = {
        cause: {
          code: 'EACCES'
        }
      }
      expect(isNetworkError(error)).toBe(false)
    })

    it('should return false when cause.code is not a string', () => {
      const error = {
        cause: {
          code: 123
        }
      }
      expect(isNetworkError(error)).toBe(false)
    })

    it('should return false when cause is not an object', () => {
      const error = {
        cause: 'not an object'
      }
      expect(isNetworkError(error)).toBe(false)
    })
  })

  describe('Browser "Failed to fetch" errors', () => {
    it('should return true for TypeError with "Failed to fetch" message', () => {
      const error = new TypeError('Failed to fetch')
      expect(isNetworkError(error)).toBe(true)
    })

    it('should return true for TypeError with "failed to fetch" (lowercase) message', () => {
      const error = new TypeError('failed to fetch')
      expect(isNetworkError(error)).toBe(true)
    })

    it('should return true for TypeError with "NetworkError" message', () => {
      const error = new TypeError('NetworkError')
      expect(isNetworkError(error)).toBe(true)
    })

    it('should return true for TypeError with "networkerror" (lowercase) message', () => {
      const error = new TypeError('networkerror')
      expect(isNetworkError(error)).toBe(true)
    })

    it('should return true for TypeError with "Network request failed" message', () => {
      const error = new TypeError('Network request failed')
      expect(isNetworkError(error)).toBe(true)
    })

    it('should return false for TypeError with non-network message', () => {
      const error = new TypeError('Something went wrong')
      expect(isNetworkError(error)).toBe(false)
    })

    it('should return false for TypeError with empty message', () => {
      const error = new TypeError('')
      expect(isNetworkError(error)).toBe(false)
    })

    it('should handle TypeError with undefined message', () => {
      const error = new TypeError()
      // TypeError constructor may set message to empty string or undefined
      // The function should handle this gracefully
      expect(typeof isNetworkError(error)).toBe('boolean')
    })
  })

  describe('Error name-based detection', () => {
    it('should return true for NetworkError with network-related message', () => {
      const error = {
        name: 'NetworkError',
        message: 'Network connection failed'
      }
      expect(isNetworkError(error)).toBe(true)
    })

    it('should return true for TypeError (by name) with fetch-related message', () => {
      const error = {
        name: 'TypeError',
        message: 'fetch error occurred'
      }
      expect(isNetworkError(error)).toBe(true)
    })

    it('should return true for FetchError with connection-related message', () => {
      const error = {
        name: 'FetchError',
        message: 'connection timeout'
      }
      expect(isNetworkError(error)).toBe(true)
    })

    it('should return true for NetworkError with connection message', () => {
      const error = {
        name: 'NetworkError',
        message: 'connection refused'
      }
      expect(isNetworkError(error)).toBe(true)
    })

    it('should return false for NetworkError with non-network message', () => {
      const error = {
        name: 'NetworkError',
        message: 'Invalid argument'
      }
      expect(isNetworkError(error)).toBe(false)
    })

    it('should return false for TypeError (by name) with non-network message', () => {
      const error = {
        name: 'TypeError',
        message: 'Cannot read property of undefined'
      }
      expect(isNetworkError(error)).toBe(false)
    })

    it('should return false for other error names', () => {
      const error = {
        name: 'ReferenceError',
        message: 'fetch is not defined'
      }
      expect(isNetworkError(error)).toBe(false)
    })

    it('should handle case-insensitive message matching', () => {
      const error = {
        name: 'NetworkError',
        message: 'FETCH ERROR'
      }
      expect(isNetworkError(error)).toBe(true)
    })

    it('should return false when message is not a string', () => {
      const error = {
        name: 'NetworkError',
        message: 123
      }
      expect(isNetworkError(error)).toBe(false)
    })

    it('should return false when name is not a string', () => {
      const error = {
        name: 123,
        message: 'fetch error'
      }
      expect(isNetworkError(error)).toBe(false)
    })
  })

  describe('Edge cases', () => {
    it('should return false for null', () => {
      expect(isNetworkError(null)).toBe(false)
    })

    it('should return false for undefined', () => {
      expect(isNetworkError(undefined)).toBe(false)
    })

    it('should return false for primitive values', () => {
      expect(isNetworkError(123)).toBe(false)
      expect(isNetworkError('string')).toBe(false)
      expect(isNetworkError(true)).toBe(false)
    })

    it('should return false for empty object', () => {
      expect(isNetworkError({})).toBe(false)
    })

    it('should return false for object without name or message', () => {
      const error = {
        someProperty: 'value'
      }
      expect(isNetworkError(error)).toBe(false)
    })

    it('should return false for regular Error without network indicators', () => {
      const error = new Error('Something went wrong')
      expect(isNetworkError(error)).toBe(false)
    })

    it('should return false for Error with cause but wrong code', () => {
      const error = {
        cause: {
          code: 'SOME_OTHER_CODE'
        }
      }
      expect(isNetworkError(error)).toBe(false)
    })

    it('should return false when cause exists but code is missing', () => {
      const error = {
        cause: {}
      }
      expect(isNetworkError(error)).toBe(false)
    })
  })

  describe('Real-world error scenarios', () => {
    it('should handle fetch API network error', () => {
      // Simulating a real browser fetch error
      const error = new TypeError('Failed to fetch')
      expect(isNetworkError(error)).toBe(true)
    })

    it('should handle Node.js connection refused error', () => {
      // Simulating a real Node.js connection error
      const error = {
        cause: {
          code: 'ECONNREFUSED',
          errno: -61,
          syscall: 'connect',
          address: '127.0.0.1',
          port: 3000
        }
      }
      expect(isNetworkError(error)).toBe(true)
    })

    it('should handle DNS resolution failure', () => {
      const error = {
        cause: {
          code: 'ENOTFOUND',
          errno: -3008,
          syscall: 'getaddrinfo',
          hostname: 'nonexistent.example.com'
        }
      }
      expect(isNetworkError(error)).toBe(true)
    })

    it('should handle connection reset error', () => {
      const error = {
        cause: {
          code: 'ECONNRESET',
          errno: -54,
          syscall: 'read'
        }
      }
      expect(isNetworkError(error)).toBe(true)
    })

    it('should not treat application errors as network errors', () => {
      const error = new Error('Invalid email format')
      expect(isNetworkError(error)).toBe(false)
    })

    it('should not treat authentication errors as network errors', () => {
      const error = {
        name: 'AuthenticationError',
        message: 'Invalid credentials'
      }
      expect(isNetworkError(error)).toBe(false)
    })
  })
})
