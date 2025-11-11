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

import { ApiError } from '../error'

describe('ApiError', () => {
  describe('badRequest', () => {
    it('should create an error with 400 status code', () => {
      const message = 'Invalid input'
      const error = ApiError.badRequest(message)

      expect(error).toBeInstanceOf(ApiError)
      expect(error).toBeInstanceOf(Error)
      expect(error.code).toBe(400)
      expect(error.message).toBe(`Bad Request: ${message}`)
    })

    it('should include the custom message in the error message', () => {
      const customMessage = 'Missing required field: userId'
      const error = ApiError.badRequest(customMessage)

      expect(error.message).toContain(customMessage)
      expect(error.message).toBe(`Bad Request: ${customMessage}`)
    })

    it('should have correct prototype chain', () => {
      const error = ApiError.badRequest('test')

      expect(Object.getPrototypeOf(error)).toBe(ApiError.prototype)
    })
  })

  describe('forbidden', () => {
    it('should create an error with 403 status code', () => {
      const message = 'Access denied'
      const error = ApiError.forbidden(message)

      expect(error).toBeInstanceOf(ApiError)
      expect(error).toBeInstanceOf(Error)
      expect(error.code).toBe(403)
      expect(error.message).toBe(`Forbidden: ${message}`)
    })

    it('should include the custom message in the error message', () => {
      const customMessage = 'Insufficient permissions'
      const error = ApiError.forbidden(customMessage)

      expect(error.message).toContain(customMessage)
      expect(error.message).toBe(`Forbidden: ${customMessage}`)
    })

    it('should have correct prototype chain', () => {
      const error = ApiError.forbidden('test')

      expect(Object.getPrototypeOf(error)).toBe(ApiError.prototype)
    })
  })

  describe('notFound', () => {
    it('should create an error with 404 status code', () => {
      const message = 'Resource not found'
      const error = ApiError.notFound(message)

      expect(error).toBeInstanceOf(ApiError)
      expect(error).toBeInstanceOf(Error)
      expect(error.code).toBe(404)
      expect(error.message).toBe(`Not Found: ${message}`)
    })

    it('should include the custom message in the error message', () => {
      const customMessage = 'User with id 123 not found'
      const error = ApiError.notFound(customMessage)

      expect(error.message).toContain(customMessage)
      expect(error.message).toBe(`Not Found: ${customMessage}`)
    })

    it('should have correct prototype chain', () => {
      const error = ApiError.notFound('test')

      expect(Object.getPrototypeOf(error)).toBe(ApiError.prototype)
    })
  })

  describe('toJSON', () => {
    it('should return object with code and message for badRequest', () => {
      const message = 'Invalid data'
      const error = ApiError.badRequest(message)
      const json = error.toJSON()

      expect(json).toEqual({
        code: 400,
        message: `Bad Request: ${message}`
      })
    })

    it('should return object with code and message for forbidden', () => {
      const message = 'Access denied'
      const error = ApiError.forbidden(message)
      const json = error.toJSON()

      expect(json).toEqual({
        code: 403,
        message: `Forbidden: ${message}`
      })
    })

    it('should return object with code and message for notFound', () => {
      const message = 'Resource missing'
      const error = ApiError.notFound(message)
      const json = error.toJSON()

      expect(json).toEqual({
        code: 404,
        message: `Not Found: ${message}`
      })
    })

    it('should return a plain object', () => {
      const error = ApiError.badRequest('test')
      const json = error.toJSON()

      expect(typeof json).toBe('object')
      expect(json.constructor).toBe(Object)
    })
  })

  describe('toString', () => {
    it('should return JSON string representation for badRequest', () => {
      const message = 'Invalid input'
      const error = ApiError.badRequest(message)
      const stringified = error.toString()

      expect(stringified).toBe(
        JSON.stringify({
          code: 400,
          message: `Bad Request: ${message}`
        })
      )
    })

    it('should return JSON string representation for forbidden', () => {
      const message = 'No access'
      const error = ApiError.forbidden(message)
      const stringified = error.toString()

      expect(stringified).toBe(
        JSON.stringify({
          code: 403,
          message: `Forbidden: ${message}`
        })
      )
    })

    it('should return JSON string representation for notFound', () => {
      const message = 'Page not found'
      const error = ApiError.notFound(message)
      const stringified = error.toString()

      expect(stringified).toBe(
        JSON.stringify({
          code: 404,
          message: `Not Found: ${message}`
        })
      )
    })

    it('should return valid JSON string', () => {
      const error = ApiError.badRequest('test')
      const stringified = error.toString()

      expect(() => JSON.parse(stringified)).not.toThrow()
      const parsed = JSON.parse(stringified)
      expect(parsed).toHaveProperty('code')
      expect(parsed).toHaveProperty('message')
    })
  })

  describe('Error behavior', () => {
    it('should be catchable as Error', () => {
      try {
        throw ApiError.badRequest('test error')
      } catch (err) {
        expect(err).toBeInstanceOf(Error)
        expect(err).toBeInstanceOf(ApiError)
      }
    })

    it('should preserve error message in stack trace', () => {
      const message = 'Test error message'
      const error = ApiError.badRequest(message)

      expect(error.stack).toBeDefined()
      expect(error.stack).toContain('Bad Request: Test error message')
    })

    it('should have name property inherited from Error', () => {
      const error = ApiError.badRequest('test')

      expect(error.name).toBe('Error')
    })

    it('should allow instanceof checks', () => {
      const badRequestError = ApiError.badRequest('test')
      const forbiddenError = ApiError.forbidden('test')
      const notFoundError = ApiError.notFound('test')

      expect(badRequestError instanceof ApiError).toBe(true)
      expect(forbiddenError instanceof ApiError).toBe(true)
      expect(notFoundError instanceof ApiError).toBe(true)
      expect(badRequestError instanceof Error).toBe(true)
      expect(forbiddenError instanceof Error).toBe(true)
      expect(notFoundError instanceof Error).toBe(true)
    })
  })

  describe('Edge cases', () => {
    it('should handle empty string message', () => {
      const error = ApiError.badRequest('')

      expect(error.message).toBe('Bad Request: ')
      expect(error.code).toBe(400)
    })

    it('should handle special characters in message', () => {
      const message = 'Error with "quotes" and \'apostrophes\' and \n newlines'
      const error = ApiError.notFound(message)

      expect(error.message).toContain(message)
    })

    it('should handle unicode characters in message', () => {
      const message = 'Ошибка с юникодом 🚀 и эмодзи'
      const error = ApiError.forbidden(message)

      expect(error.message).toContain(message)
      expect((error.toJSON() as any).message).toContain(message)
    })

    it('should handle very long messages', () => {
      const longMessage = 'A'.repeat(1000)
      const error = ApiError.badRequest(longMessage)

      expect(error.message).toContain(longMessage)
      expect(error.message.length).toBeGreaterThan(1000)
    })
  })

  describe('Serialization', () => {
    it('should be JSON.stringify compatible', () => {
      const error = ApiError.badRequest('test')

      expect(() => JSON.stringify(error)).not.toThrow()
    })

    it('should produce same result from toJSON and JSON.stringify', () => {
      const error = ApiError.forbidden('test')
      const jsonObject = error.toJSON()
      const stringified = JSON.stringify(jsonObject)

      expect(stringified).toBe(error.toString())
    })

    it('should maintain data integrity through serialization', () => {
      const message = 'Original message'
      const error = ApiError.notFound(message)
      const serialized = error.toString()
      const deserialized = JSON.parse(serialized)

      expect(deserialized.code).toBe(404)
      expect(deserialized.message).toBe(`Not Found: ${message}`)
    })
  })

  describe('Different error types comparison', () => {
    it('should create distinct errors with different codes', () => {
      const badRequest = ApiError.badRequest('test')
      const forbidden = ApiError.forbidden('test')
      const notFound = ApiError.notFound('test')

      expect(badRequest.code).not.toBe(forbidden.code)
      expect(badRequest.code).not.toBe(notFound.code)
      expect(forbidden.code).not.toBe(notFound.code)
    })

    it('should create distinct messages with different prefixes', () => {
      const message = 'same message'
      const badRequest = ApiError.badRequest(message)
      const forbidden = ApiError.forbidden(message)
      const notFound = ApiError.notFound(message)

      expect(badRequest.message).toContain('Bad Request')
      expect(forbidden.message).toContain('Forbidden')
      expect(notFound.message).toContain('Not Found')
    })
  })
})
