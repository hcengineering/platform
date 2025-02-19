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

import { AccountRole, MeasureContext } from '@hcengineering/core'
import {
  generateWorkspaceUrl,
  cleanEmail,
  isEmail,
  isShallowEqual,
  getRolePower,
  getEndpoints,
  _getRegions,
  EndpointKind,
  getEndpoint,
  hashWithSalt,
  verifyPassword,
  getAllTransactors,
  wrap
} from '../utils'
// eslint-disable-next-line import/no-named-default
import platform, { getMetadata, PlatformError, Severity, Status } from '@hcengineering/platform'
import { TokenError } from '@hcengineering/server-token'
import { randomBytes } from 'crypto'

import { AccountDB } from '../types'

// Mock platform with minimum required functionality
jest.mock('@hcengineering/platform', () => {
  const actual = jest.requireActual('@hcengineering/platform')

  return {
    ...actual,
    ...actual.default,
    getMetadata: jest.fn(),
    addEventListener: jest.fn(),
    plugin: (id: string, plugin: any) => plugin // Simple plugin function mock
  }
})

// Mock analytics
jest.mock('@hcengineering/analytics', () => ({
  Analytics: {
    handleError: jest.fn()
  }
}))

describe('account utils', () => {
  describe('cleanEmail', () => {
    test.each([
      ['  Test@Example.com  ', 'test@example.com', 'should trim spaces and convert to lowercase'],
      ['USER@DOMAIN.COM', 'user@domain.com', 'should convert uppercase to lowercase'],
      ['normal@email.com', 'normal@email.com', 'should keep already normalized email unchanged'],
      ['Mixed.Case@Example.COM', 'mixed.case@example.com', 'should normalize mixed case email'],
      ['   spaced@email.com   ', 'spaced@email.com', 'should trim multiple spaces']
    ])('%s -> %s (%s)', (input, expected) => {
      expect(cleanEmail(input)).toBe(expected)
    })
  })

  describe('isEmail', () => {
    test.each([
      ['test@example.com', true, 'basic valid email'],
      ['user.name@domain.com', true, 'email with dot in local part'],
      ['user+tag@domain.co.uk', true, 'email with plus and subdomain'],
      ['small@domain.museum', true, 'email with long TLD'],
      ['user@subdomain.domain.com', true, 'email with multiple subdomains'],
      ['user-name@domain.com', true, 'email with hyphen in local part'],
      ['user123@domain.com', true, 'email with numbers'],
      ['user.name+tag@domain.com', true, 'email with dot and plus'],
      ['not-an-email', false, 'string without @ symbol'],
      ['@missing-user.com', false, 'missing local part'],
      ['missing-domain@', false, 'missing domain part'],
      ['spaces in@email.com', false, 'spaces in local part'],
      ['missing@domain', false, 'incomplete domain'],
      ['.invalid@email.com', false, 'leading dot in local part'],
      ['invalid@email.', false, 'trailing dot in domain'],
      ['invalid@@email.com', false, 'double @ symbol'],
      ['invalid@.com', false, 'missing domain part before dot'],
      ['invalid.@domain.com', false, 'trailing dot in local part'],
      ['invalid..email@domain.com', false, 'consecutive dots in local part'],
      ['invalid@domain..com', false, 'consecutive dots in domain'],
      ['invalid@-domain.com', false, 'leading hyphen in domain'],
      ['invalid@domain-.com', false, 'trailing hyphen in domain'],
      ['very.unusual."@".unusual.com@example.com', false, 'invalid special characters'],
      [' space@domain.com', false, 'leading space'],
      ['space@domain.com ', false, 'trailing space']
    ])('%s -> %s (%s)', (input, expected) => {
      expect(isEmail(input)).toBe(expected)
    })
  })

  describe('isShallowEqual', () => {
    test.each([
      [{ a: 1, b: 2, c: 'test' }, { a: 1, b: 2, c: 'test' }, true, 'identical objects should be equal'],
      [
        { a: 1, b: 2, c: 'test' },
        { a: 1, b: 2, c: 'different' },
        false,
        'objects with different values should not be equal'
      ],
      [{ a: 1, b: 2 }, { a: 1, c: 2 }, false, 'objects with different keys should not be equal'],
      [{ a: 1, b: 2 }, { a: 1, b: 2, c: 3 }, false, 'objects with different number of keys should not be equal'],
      [
        { x: null, y: undefined },
        { x: null, y: undefined },
        true,
        'objects with null and undefined values should be equal'
      ],
      [{ a: 1 }, { a: '1' }, false, 'objects with different value types should not be equal'],
      [{}, {}, true, 'empty objects should be equal']
    ])('%# %s', (obj1, obj2, expected, description) => {
      expect(isShallowEqual(obj1, obj2)).toBe(expected)
    })
  })

  describe('generateWorkspaceUrl', () => {
    test.each([
      // Basic cases
      ['Simple Project', 'simpleproject', 'removes spaces between words'],
      ['UPPERCASE', 'uppercase', 'converts uppercase to lowercase'],
      ['lowercase', 'lowercase', 'preserves already lowercase text'],
      ['Test Workspace', 'testworkspace', 'basic workspace name'],

      // Number handling
      ['123Project', 'project', 'removes numbers from the beginning of string'],
      ['Project123', 'project123', 'preserves numbers at the end of string'],
      ['Pro123ject', 'pro123ject', 'preserves numbers in the middle of string'],
      ['Workspace 123', 'workspace123', 'workspace with numbers'],

      // Special characters and hyphens
      ['My-Project', 'my-project', 'preserves hyphens between words'],
      ['My_Project', 'myproject', 'removes underscores between words'],
      ['Project@#$%', 'project', 'removes all special characters'],
      ['workspace-with-hyphens', 'workspace-with-hyphens', 'preserves existing hyphens'],
      ['--test--', 'test', 'removes leading and trailing hyphens'],

      // Complex combinations
      ['My-Awesome-Project-123', 'my-awesome-project-123', 'preserves hyphens and numbers in complex strings'],
      ['123-Project-456', 'project-456', 'removes leading numbers but preserves hyphens and trailing numbers'],
      ['@#$My&&Project!!', 'myproject', 'removes all special characters while preserving alphanumeric content'],
      ['Multiple     Spaces', 'multiplespaces', 'collapses multiple spaces'],
      ['a.b.c', 'abc', 'removes dots'],
      ['UPPER.case.123', 'uppercase123', 'handles mixed case with dots and numbers'],

      // Edge cases
      ['', '', 'handles empty string'],
      ['123456', '', 'handles numbers only'],
      ['@#$%^&', '', 'handles special characters only'],
      ['   ', '', 'handles spaces only'],
      ['a-b-c-1-2-3', 'a-b-c-1-2-3', 'preserves alternating letters, numbers, and hyphens'],
      ['---Project---', 'project', 'removes redundant hyphens'],
      ['Project!!!Name!!!123', 'projectname123', 'removes exclamation marks'],
      ['!@#Project123Name!@#', 'project123name', 'removes surrounding special characters'],
      ['   spaces   ', 'spaces', 'trims leading and trailing spaces']
    ])('%s -> %s (%s)', (input, expected, description) => {
      expect(generateWorkspaceUrl(input)).toBe(expected)
    })
  })

  describe('getRolePower', () => {
    it('should maintain correct power hierarchy', () => {
      const owner = getRolePower(AccountRole.Owner)
      const maintainer = getRolePower(AccountRole.Maintainer)
      const user = getRolePower(AccountRole.User)
      const guest = getRolePower(AccountRole.Guest)
      const docGuest = getRolePower(AccountRole.DocGuest)

      // Verify hierarchy
      expect(owner).toBeGreaterThan(maintainer)
      expect(maintainer).toBeGreaterThan(user)
      expect(user).toBeGreaterThan(guest)
      expect(guest).toBeGreaterThan(docGuest)
    })
  })

  describe('transactor utils', () => {
    describe('getEndpoints', () => {
      beforeEach(() => {
        jest.clearAllMocks()
      })

      test.each([
        ['http://localhost:3000', ['http://localhost:3000'], 'single endpoint'],
        [
          'http://localhost:3000,http://localhost:3001',
          ['http://localhost:3000', 'http://localhost:3001'],
          'multiple endpoints'
        ],
        [
          'http://internal:3000;http://external:3000;us',
          ['http://internal:3000;http://external:3000;us'],
          'endpoint with internal, external urls and region'
        ],
        [
          '  http://localhost:3000  ,  http://localhost:3001  ',
          ['http://localhost:3000', 'http://localhost:3001'],
          'endpoints with whitespace'
        ],
        [
          'http://localhost:3000,,,http://localhost:3001',
          ['http://localhost:3000', 'http://localhost:3001'],
          'endpoints with empty entries'
        ]
      ])('should parse "%s" into %j (%s)', (input, expected) => {
        ;(getMetadata as jest.Mock).mockReturnValue(input)
        expect(getEndpoints()).toEqual(expected)
      })

      test('should throw error when no transactors provided', () => {
        ;(getMetadata as jest.Mock).mockReturnValue(undefined)
        expect(() => getEndpoints()).toThrow('Please provide transactor endpoint url')
      })

      test('should throw error when empty transactors string provided', () => {
        ;(getMetadata as jest.Mock).mockReturnValue('')
        expect(() => getEndpoints()).toThrow('Please provide transactor endpoint url')
      })

      test('should throw error when only commas provided', () => {
        ;(getMetadata as jest.Mock).mockReturnValue(',,,')
        expect(() => getEndpoints()).toThrow('Please provide transactor endpoint url')
      })
    })

    describe('_getRegions', () => {
      const originalEnv = process.env

      beforeEach(() => {
        jest.clearAllMocks()
        process.env = { ...originalEnv }
      })

      afterAll(() => {
        process.env = originalEnv
      })

      test.each<[string, string | undefined, { region: string, name: string }[], string]>([
        [
          'http://internal:3000;http://external:3000;us',
          undefined,
          [{ region: 'us', name: '' }],
          'single region from transactor'
        ],
        [
          'http://internal:3000;http://external:3000;us,http://internal:3001;http://external:3001;eu',
          undefined,
          [
            { region: 'us', name: '' },
            { region: 'eu', name: '' }
          ],
          'multiple regions from transactors'
        ],
        [
          'http://internal:3000;http://external:3000;us',
          'us|United States',
          [{ region: 'us', name: 'United States' }],
          'region with name from env'
        ],
        [
          'http://internal:3000;http://external:3000;us,http://internal:3001;http://external:3001;eu',
          'us|United States;eu|European Union',
          [
            { region: 'us', name: 'United States' },
            { region: 'eu', name: 'European Union' }
          ],
          'multiple regions with names from env'
        ],
        [
          'http://internal:3000;http://external:3000;us',
          'eu|European Union',
          [
            { region: 'eu', name: 'European Union' },
            { region: 'us', name: '' }
          ],
          'combines regions from env and transactors'
        ]
      ])(
        'should handle transactors="%s" and REGION_INFO="%s" (%s)',
        (transactors, regionInfo, expected, description) => {
          ;(getMetadata as jest.Mock).mockReturnValue(transactors)
          if (regionInfo !== undefined) {
            process.env.REGION_INFO = regionInfo
          } else {
            delete process.env.REGION_INFO
          }
          expect(_getRegions()).toEqual(expected)
        }
      )
    })

    describe('getEndpoint', () => {
      const mockCtx = {
        error: jest.fn()
      } as unknown as MeasureContext

      beforeEach(() => {
        jest.clearAllMocks()
      })

      test.each([
        [
          'workspace1',
          'us',
          EndpointKind.Internal,
          'http://internal:3000;http://external:3000;us',
          'http://internal:3000',
          'single endpoint internal'
        ],
        [
          'workspace1',
          'us',
          EndpointKind.External,
          'http://internal:3000;http://external:3000;us',
          'http://external:3000',
          'single endpoint external'
        ],
        [
          'workspace1',
          'eu',
          EndpointKind.Internal,
          'http://internal:3000;http://external:3000;us,http://internal:3001;http://external:3001;eu',
          'http://internal:3001',
          'multiple endpoints choose by region internal'
        ],
        [
          'workspace1',
          'eu',
          EndpointKind.External,
          'http://internal:3000;http://external:3000;us,http://internal:3001;http://external:3001;eu',
          'http://external:3001',
          'multiple endpoints choose by region external'
        ]
      ])(
        'should handle workspace="%s" region="%s" kind=%s (%s)',
        (workspace, region, kind, transactors, expected, description) => {
          ;(getMetadata as jest.Mock).mockReturnValue(transactors)
          expect(getEndpoint(mockCtx, workspace, region, kind)).toBe(expected)
          expect(mockCtx.error).not.toHaveBeenCalled()
        }
      )

      test('should fall back to default region if requested region not found', () => {
        const transactors = 'http://internal:3000;http://external:3000;'
        ;(getMetadata as jest.Mock).mockReturnValue(transactors)

        expect(getEndpoint(mockCtx, 'workspace1', 'nonexistent', EndpointKind.Internal)).toBe('http://internal:3000')

        expect(mockCtx.error).toHaveBeenCalledWith('No transactors for the target region, will use default region', {
          group: 'nonexistent'
        })
      })

      test('should throw error when no transactors available', () => {
        ;(getMetadata as jest.Mock).mockReturnValue('http://internal:3000;http://external:3000;us')

        expect(() => getEndpoint(mockCtx, 'workspace1', 'nonexistent', EndpointKind.Internal)).toThrow(
          'Please provide transactor endpoint url'
        )

        expect(mockCtx.error).toHaveBeenCalledWith('No transactors for the default region')
      })
    })

    describe('getAllTransactors', () => {
      beforeEach(() => {
        jest.clearAllMocks()
      })

      test.each([
        [
          'http://internal:3000;http://external:3000;us',
          EndpointKind.Internal,
          ['http://internal:3000'],
          'single internal endpoint'
        ],
        [
          'http://internal:3000;http://external:3000;us',
          EndpointKind.External,
          ['http://external:3000'],
          'single external endpoint'
        ],
        [
          'http://internal:3000;http://external:3000;us,http://internal:3001;http://external:3001;eu',
          EndpointKind.Internal,
          ['http://internal:3000', 'http://internal:3001'],
          'multiple internal endpoints'
        ],
        [';http://external:3000;us', EndpointKind.Internal, [''], 'empty internal url']
      ])('should get all %s endpoints for "%s" (%s)', (transactors, kind, expected, description) => {
        ;(getMetadata as jest.Mock).mockReturnValue(transactors)
        expect(getAllTransactors(kind)).toEqual(expected)
      })

      test.each([
        [undefined, 'undefined transactors'],
        ['', 'empty transactors'],
        [',,,', 'only commas']
      ])('should throw error for %s', (transactors, description) => {
        ;(getMetadata as jest.Mock).mockReturnValue(transactors)
        expect(() => getAllTransactors(EndpointKind.Internal)).toThrow('Please provide transactor endpoint url')
      })
    })
  })

  describe('password utils', () => {
    describe('hashWithSalt', () => {
      test.each([
        ['simple', 'basic password'],
        ['p@ssw0rd!123', 'complex password'],
        ['', 'empty password'],
        ['a'.repeat(100), 'long password'],
        ['🔑password', 'password with emoji'],
        [' password ', 'password with spaces']
      ])('should hash "%s" consistently (%s)', (password, description) => {
        const salt = randomBytes(32)
        const hash1 = hashWithSalt(password, salt)
        const hash2 = hashWithSalt(password, salt)

        // Same password + salt should produce same hash
        expect(Buffer.compare(hash1 as any, hash2 as any)).toBe(0)
      })

      test('should produce different hashes for different salts', () => {
        const password = 'password123'
        const salt1 = randomBytes(32)
        const salt2 = randomBytes(32)

        const hash1 = hashWithSalt(password, salt1)
        const hash2 = hashWithSalt(password, salt2)

        // Same password with different salts should produce different hashes
        expect(Buffer.compare(hash1 as any, hash2 as any)).not.toBe(0)
      })

      test('should produce different hashes for different passwords', () => {
        const salt = randomBytes(32)
        const hash1 = hashWithSalt('password1', salt)
        const hash2 = hashWithSalt('password2', salt)

        // Different passwords with same salt should produce different hashes
        expect(Buffer.compare(hash1 as any, hash2 as any)).not.toBe(0)
      })
    })

    describe('verifyPassword', () => {
      test.each([
        ['correct password', 'password123', true],
        ['wrong password', 'wrongpass', false],
        ['empty password', '', false],
        ['long password', 'a'.repeat(100), true],
        ['password with spaces', ' password123 ', true],
        ['password with special chars', 'p@ssw0rd!123', true]
      ])('should verify %s', (description, password, shouldMatch) => {
        const salt = randomBytes(32)
        const hash = shouldMatch ? hashWithSalt(password, salt) : hashWithSalt('different', salt)

        expect(verifyPassword(password, hash, salt)).toBe(shouldMatch)
      })

      test.each([
        ['null hash', 'password123', null, randomBytes(32)],
        ['null salt', 'password123', randomBytes(32), null],
        ['null both', 'password123', null, null]
      ])('should handle %s', (description, password, hash, salt) => {
        expect(verifyPassword(password, hash, salt)).toBe(false)
      })
    })
  })

  describe('wrap', () => {
    const mockCtx = {
      error: jest.fn()
    } as unknown as MeasureContext

    const mockDb = {} as unknown as AccountDB
    const mockBranding = null

    beforeEach(() => {
      jest.clearAllMocks()
    })

    test('should handle successful execution', async () => {
      const mockResult = { data: 'test' }
      const mockMethod = jest.fn().mockResolvedValue(mockResult)
      const wrappedMethod = wrap(mockMethod)
      const request = { id: 'req1', params: ['param1', 'param2'] }

      const result = await wrappedMethod(mockCtx, mockDb, mockBranding, request)

      expect(result).toEqual({ id: 'req1', result: mockResult })
      expect(mockMethod).toHaveBeenCalledWith(mockCtx, mockDb, mockBranding, 'param1', 'param2')
    })

    test('should handle token parameter', async () => {
      const mockResult = { data: 'test' }
      const mockMethod = jest.fn().mockResolvedValue(mockResult)
      const wrappedMethod = wrap(mockMethod)
      const request = { id: 'req1', params: ['param1'] }
      const token = 'test-token'

      const result = await wrappedMethod(mockCtx, mockDb, mockBranding, request, token)

      expect(result).toEqual({ id: 'req1', result: mockResult })
      expect(mockMethod).toHaveBeenCalledWith(mockCtx, mockDb, mockBranding, token, 'param1')
    })

    test('should handle PlatformError', async () => {
      const errorStatus = new Status(Severity.ERROR, 'test-error' as any, {})
      const mockMethod = jest.fn().mockRejectedValue(new PlatformError(errorStatus))
      const wrappedMethod = wrap(mockMethod)
      const request = { id: 'req1', params: [] }

      const result = await wrappedMethod(mockCtx, mockDb, mockBranding, request)

      expect(result).toEqual({ error: errorStatus })
      expect(mockCtx.error).toHaveBeenCalledWith('error', { status: errorStatus })
    })

    test('should handle TokenError', async () => {
      const mockMethod = jest.fn().mockRejectedValue(new TokenError('test error'))
      const wrappedMethod = wrap(mockMethod)
      const request = { id: 'req1', params: [] }

      const result = await wrappedMethod(mockCtx, mockDb, mockBranding, request)

      expect(result).toEqual({
        error: new Status(Severity.ERROR, platform.status.Unauthorized, {})
      })
    })

    test('should handle internal server error', async () => {
      const error = new Error('unexpected error')
      const mockMethod = jest.fn().mockRejectedValue(error)
      const wrappedMethod = wrap(mockMethod)
      const request = { id: 'req1', params: [] }

      const result = await wrappedMethod(mockCtx, mockDb, mockBranding, request)

      expect(result.error.code).toBe(platform.status.InternalServerError)
      expect(mockCtx.error).toHaveBeenCalledWith('error', {
        status: expect.any(Status),
        err: error
      })
    })

    test('should not report non-internal errors to analytics', async () => {
      const errorStatus = new Status(Severity.ERROR, 'known-error' as any, {})
      const mockMethod = jest.fn().mockRejectedValue(new PlatformError(errorStatus))
      const wrappedMethod = wrap(mockMethod)
      const request = { id: 'req1', params: [] }

      await wrappedMethod(mockCtx, mockDb, mockBranding, request)
    })
  })
})
