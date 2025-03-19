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

import {
  AccountRole,
  Branding,
  MeasureContext,
  Person,
  PersonId,
  PersonUuid,
  SocialIdType,
  systemAccountUuid,
  WorkspaceUuid
} from '@hcengineering/core'
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
  wrap,
  isOtpValid,
  sendOtpEmail,
  sendOtp,
  generateUniqueOtp,
  getEmailSocialId,
  confirmEmail,
  sendEmailConfirmation,
  GUEST_ACCOUNT,
  selectWorkspace,
  signUpByEmail,
  getAccount,
  getWorkspaceById,
  getWorkspaceInfoWithStatusById,
  updateArchiveInfo,
  cleanExpiredOtp,
  getWorkspaces,
  verifyAllowedServices,
  getPersonName,
  getInviteEmail,
  getFrontUrl,
  getMailUrl,
  getSocialIdByKey,
  getWorkspaceInvite,
  loginOrSignUpWithProvider,
  sendEmail
} from '../utils'
// eslint-disable-next-line import/no-named-default
import platform, { getMetadata, PlatformError, Severity, Status } from '@hcengineering/platform'
import { decodeTokenVerbose, generateToken, TokenError } from '@hcengineering/server-token'
import { randomBytes } from 'crypto'

import { AccountDB, AccountEventType, Workspace } from '../types'
import { accountPlugin } from '../plugin'

// Mock platform with minimum required functionality
jest.mock('@hcengineering/platform', () => {
  const actual = jest.requireActual('@hcengineering/platform')

  return {
    ...actual,
    ...actual.default,
    getMetadata: jest.fn(),
    addEventListener: jest.fn(),
    translate: jest.fn((id, params) => `${id} << ${JSON.stringify(params)}`)
  }
})

// Mock server-token
jest.mock('@hcengineering/server-token', () => ({
  TokenError: jest.requireActual('@hcengineering/server-token').TokenError,
  decodeTokenVerbose: jest.fn(),
  generateToken: jest.fn()
}))

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
      const request = { id: 'req1', params: { param1: 'value1', param2: 'value2' } }

      const result = await wrappedMethod(mockCtx, mockDb, mockBranding, request, 'token')

      expect(result).toEqual({ id: 'req1', result: mockResult })
      expect(mockMethod).toHaveBeenCalledWith(mockCtx, mockDb, mockBranding, 'token', {
        param1: 'value1',
        param2: 'value2'
      })
    })

    test('should handle token parameter', async () => {
      const mockResult = { data: 'test' }
      const mockMethod = jest.fn().mockResolvedValue(mockResult)
      const wrappedMethod = wrap(mockMethod)
      const request = { id: 'req1', params: { param1: 'value1' } }

      const result = await wrappedMethod(mockCtx, mockDb, mockBranding, request, 'token')

      expect(result).toEqual({ id: 'req1', result: mockResult })
      expect(mockMethod).toHaveBeenCalledWith(mockCtx, mockDb, mockBranding, 'token', { param1: 'value1' })
    })

    test('should handle PlatformError', async () => {
      const errorStatus = new Status(Severity.ERROR, 'test-error' as any, {})
      const mockMethod = jest.fn().mockRejectedValue(new PlatformError(errorStatus))
      const wrappedMethod = wrap(mockMethod)
      const request = { id: 'req1', params: [] }

      const result = await wrappedMethod(mockCtx, mockDb, mockBranding, request, 'token')

      expect(result).toEqual({ error: errorStatus })
      expect(mockCtx.error).toHaveBeenCalledWith('error', { status: errorStatus })
    })

    test('should handle TokenError', async () => {
      const mockMethod = jest.fn().mockRejectedValue(new TokenError('test error'))
      const wrappedMethod = wrap(mockMethod)
      const request = { id: 'req1', params: [] }

      const result = await wrappedMethod(mockCtx, mockDb, mockBranding, request, 'token')

      expect(result).toEqual({
        error: new Status(Severity.ERROR, platform.status.Unauthorized, {})
      })
    })

    test('should handle internal server error', async () => {
      const error = new Error('unexpected error')
      const mockMethod = jest.fn().mockRejectedValue(error)
      const wrappedMethod = wrap(mockMethod)
      const request = { id: 'req1', params: [] }

      const result = await wrappedMethod(mockCtx, mockDb, mockBranding, request, 'token')

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

      await wrappedMethod(mockCtx, mockDb, mockBranding, request, 'token')
    })
  })

  describe('with mocked fetch', () => {
    const mockFetch = jest.fn(() => Promise.resolve({ ok: true }))

    beforeEach(() => {
      jest.clearAllMocks()
      global.fetch = mockFetch as any
    })

    afterEach(() => {
      jest.clearAllMocks()
    })

    describe('otp utils', () => {
      const mockCtx = {
        error: jest.fn()
      } as unknown as MeasureContext

      const mockBranding: Branding = {
        language: 'en',
        title: 'Test App'
      }

      const mockDb = {
        otp: {
          findOne: jest.fn(),
          find: jest.fn(),
          insertOne: jest.fn()
        }
      } as unknown as AccountDB

      const sesUrl = 'https://ses.example.com'
      const sesAuth = 'test-auth-token'

      const originalConsoleError = console.error

      beforeEach(() => {
        jest.clearAllMocks()
        console.error = jest.fn()
        ;(getMetadata as jest.Mock).mockImplementation((key) => {
          switch (key) {
            case accountPlugin.metadata.OtpRetryDelaySec:
              return 30
            case accountPlugin.metadata.OtpTimeToLiveSec:
              return 60
            case accountPlugin.metadata.MAIL_URL:
              return sesUrl
            case accountPlugin.metadata.MAIL_AUTH_TOKEN:
              return sesAuth
            case accountPlugin.metadata.ProductName:
              return 'Test Product'
            default:
              return undefined
          }
        })
      })

      afterEach(() => {
        jest.clearAllMocks()
        console.error = originalConsoleError
      })

      describe('generateUniqueOtp', () => {
        test('should generate 6-digit numeric code', async () => {
          ;(mockDb.otp.findOne as jest.Mock).mockResolvedValue(null)
          const code = await generateUniqueOtp(mockDb)

          expect(code).toMatch(/^\d{6}$/)
          expect(mockDb.otp.findOne).toHaveBeenCalledWith({ code })
        })

        test('should retry if code exists', async () => {
          ;(mockDb.otp.findOne as jest.Mock)
            .mockResolvedValueOnce({ code: '123456' })
            .mockResolvedValueOnce({ code: '234567' })
            .mockResolvedValueOnce(null)

          const code = await generateUniqueOtp(mockDb)

          expect(code).toMatch(/^\d{6}$/)
          expect(mockDb.otp.findOne).toHaveBeenCalledTimes(3)
        })
      })

      describe('sendOtp', () => {
        const mockSocialId = {
          personUuid: '123456-uuid' as PersonUuid,
          type: SocialIdType.EMAIL,
          value: 'test@example.com',
          key: 'email:test@example.com' as PersonId
        }

        test('should return existing OTP if not expired', async () => {
          const now = Date.now()
          const mockOtpData = {
            code: '123456',
            expiresOn: now + 60000,
            createdOn: now - 15000
          }
          ;(mockDb.otp.find as jest.Mock).mockResolvedValue([mockOtpData])

          const result = await sendOtp(mockCtx, mockDb, mockBranding, mockSocialId)

          expect(result).toEqual({
            sent: true,
            retryOn: mockOtpData.createdOn + 30000
          })
          expect(mockDb.otp.insertOne).not.toHaveBeenCalled()
        })

        test('should generate and send new OTP if expired', async () => {
          ;(mockDb.otp.find as jest.Mock).mockResolvedValue([])
          ;(mockDb.otp.findOne as jest.Mock).mockResolvedValue(null)

          const result = await sendOtp(mockCtx, mockDb, mockBranding, mockSocialId)

          expect(result).toEqual({
            sent: true,
            retryOn: expect.any(Number)
          })
          expect(mockDb.otp.insertOne).toHaveBeenCalledWith({
            socialId: mockSocialId.key,
            code: expect.any(String),
            expiresOn: expect.any(Number),
            createdOn: expect.any(Number)
          })
        })

        test('should throw error for unsupported social id type', async () => {
          const invalidSocialId = {
            personUuid: '123456-uuid' as PersonUuid,
            type: 'INVALID' as SocialIdType,
            value: 'test',
            key: 'invalid:test' as PersonId
          }

          await expect(sendOtp(mockCtx, mockDb, mockBranding, invalidSocialId)).rejects.toThrow(
            'Unsupported OTP social id type'
          )
        })
      })

      describe('sendOtpEmail', () => {
        beforeEach(() => {
          global.fetch = jest.fn()
        })

        test('should send email with OTP', async () => {
          await sendOtpEmail(mockCtx, mockBranding, '123456', 'test@example.com')

          expect(global.fetch).toHaveBeenCalledWith(`${sesUrl}/send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${sesAuth}`
            },
            body: expect.stringContaining('123456')
          })
        })

        test('should handle missing SES URL', async () => {
          ;(getMetadata as jest.Mock).mockReturnValue(undefined)

          await sendOtpEmail(mockCtx, mockBranding, '123456', 'test@example.com')

          expect(mockCtx.error).toHaveBeenCalledWith('Please provide email service url to enable email otp')
          expect(global.fetch).not.toHaveBeenCalled()
        })
      })

      describe('isOtpValid', () => {
        test('should return true for valid non-expired OTP', async () => {
          const mockOtpData = {
            expiresOn: Date.now() + 60000
          }
          ;(mockDb.otp.findOne as jest.Mock).mockResolvedValue(mockOtpData)

          const result = await isOtpValid(mockDb, 'email:test@example.com', '123456')
          expect(result).toBe(true)
        })

        test('should return false for expired OTP', async () => {
          const mockOtpData = {
            expiresOn: Date.now() - 1000
          }
          ;(mockDb.otp.findOne as jest.Mock).mockResolvedValue(mockOtpData)

          const result = await isOtpValid(mockDb, 'email:test@example.com', '123456')
          expect(result).toBe(false)
        })

        test('should return false for non-existent OTP', async () => {
          ;(mockDb.otp.findOne as jest.Mock).mockResolvedValue(null)

          const result = await isOtpValid(mockDb, 'email:test@example.com', '123456')
          expect(result).toBe(false)
        })
      })
    })

    describe('email confirmation utils', () => {
      const mockCtx = {
        error: jest.fn(),
        info: jest.fn()
      } as unknown as MeasureContext

      const mockBranding: Branding = {
        language: 'en',
        title: 'Test App',
        front: 'https://app.example.com'
      }

      const mockDb = {
        socialId: {
          findOne: jest.fn(),
          updateOne: jest.fn()
        }
      } as unknown as AccountDB

      beforeEach(() => {
        jest.clearAllMocks()
        mockFetch.mockResolvedValue({ ok: true })
        ;(getMetadata as jest.Mock).mockImplementation((key) => {
          switch (key) {
            case accountPlugin.metadata.MAIL_URL:
              return 'https://ses.example.com'
            case accountPlugin.metadata.MAIL_AUTH_TOKEN:
              return 'test-auth-token'
            case accountPlugin.metadata.ProductName:
              return 'Test Product'
            case accountPlugin.metadata.FrontURL:
              return 'https://app.example.com'
            default:
              return undefined
          }
        })
      })

      afterEach(() => {
        jest.clearAllMocks()
      })

      describe('sendEmailConfirmation', () => {
        const account = 'test-account-id' as PersonUuid
        const email = 'test@example.com'

        test('should send confirmation email with correct link', async () => {
          await sendEmailConfirmation(mockCtx, mockBranding, account, email)

          expect(mockFetch).toHaveBeenCalledWith(
            'https://ses.example.com/send',
            expect.objectContaining({
              method: 'post',
              headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer test-auth-token'
              },
              body: expect.stringContaining('https://app.example.com/login/confirm')
            })
          )
        })

        test('should throw error if MAIL_URL is missing', async () => {
          ;(getMetadata as jest.Mock).mockReturnValue(undefined)

          await expect(sendEmailConfirmation(mockCtx, mockBranding, account, email)).rejects.toThrow(
            new PlatformError(new Status(Severity.ERROR, platform.status.InternalServerError, {}))
          )

          expect(mockCtx.error).toHaveBeenCalledWith('Please provide MAIL_URL to enable email confirmations.')
        })

        test('should use branding front URL if available', async () => {
          const brandingWithFront = {
            ...mockBranding,
            front: 'https://custom.example.com'
          }

          await sendEmailConfirmation(mockCtx, brandingWithFront, account, email)

          expect(mockFetch).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
              body: expect.stringContaining('https://custom.example.com/login/confirm')
            })
          )
        })
      })

      describe('confirmEmail', () => {
        const account = 'test-account-id'
        const email = 'test@example.com'

        test('should confirm unverified email', async () => {
          const mockSocialId = {
            key: 'email:test@example.com',
            type: SocialIdType.EMAIL,
            value: email,
            verifiedOn: null
          }
          ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue(mockSocialId)

          await confirmEmail(mockCtx, mockDb, account, email)

          expect(mockDb.socialId.updateOne).toHaveBeenCalledWith(
            { key: mockSocialId.key },
            { verifiedOn: expect.any(Number) }
          )
        })

        test('should throw error if email not found', async () => {
          ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue(null)

          await expect(confirmEmail(mockCtx, mockDb, account, email)).rejects.toThrow(
            new PlatformError(
              new Status(Severity.ERROR, platform.status.SocialIdNotFound, {
                socialId: email,
                type: SocialIdType.EMAIL
              })
            )
          )
        })

        test('should throw error if email already confirmed', async () => {
          const mockSocialId = {
            key: 'email:test@example.com',
            type: SocialIdType.EMAIL,
            value: email,
            verifiedOn: Date.now()
          }
          ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue(mockSocialId)

          await expect(confirmEmail(mockCtx, mockDb, account, email)).rejects.toThrow(
            new PlatformError(
              new Status(Severity.ERROR, platform.status.SocialIdAlreadyConfirmed, {
                socialId: email,
                type: SocialIdType.EMAIL
              })
            )
          )
        })

        test('should normalize email before confirmation', async () => {
          const mockSocialId = {
            key: 'email:test@example.com',
            type: SocialIdType.EMAIL,
            value: 'test@example.com',
            verifiedOn: null
          }
          ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue(mockSocialId)

          await confirmEmail(mockCtx, mockDb, account, '  TEST@EXAMPLE.COM  ')

          expect(mockDb.socialId.findOne).toHaveBeenCalledWith({
            type: SocialIdType.EMAIL,
            value: 'test@example.com'
          })
        })
      })

      describe('getEmailSocialId', () => {
        test('should find social id by email', async () => {
          const mockSocialId = {
            key: 'email:test@example.com',
            type: SocialIdType.EMAIL,
            value: 'test@example.com'
          }
          ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue(mockSocialId)

          const result = await getEmailSocialId(mockDb, 'test@example.com')
          expect(result).toEqual(mockSocialId)
          expect(mockDb.socialId.findOne).toHaveBeenCalledWith({
            type: SocialIdType.EMAIL,
            value: 'test@example.com'
          })
        })

        test('should return null if email not found', async () => {
          ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue(null)

          const result = await getEmailSocialId(mockDb, 'nonexistent@example.com')
          expect(result).toBeNull()
        })
      })
    })

    describe('sendEmail', () => {
      beforeEach(() => {
        ;(getMetadata as jest.Mock).mockImplementation((key) => {
          switch (key) {
            case accountPlugin.metadata.MAIL_URL:
              return 'https://ses.example.com'
            case accountPlugin.metadata.MAIL_AUTH_TOKEN:
              return 'test-token'
            default:
              return undefined
          }
        })
      })

      test('should send email with correct parameters', async () => {
        const emailInfo = {
          text: 'Test email',
          html: '<p>Test email</p>',
          subject: 'Test Subject',
          to: 'test@example.com'
        }

        await sendEmail(emailInfo)

        expect(mockFetch).toHaveBeenCalledWith('https://ses.example.com/send', {
          method: 'post',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token'
          },
          body: JSON.stringify(emailInfo)
        })
      })
    })
  })

  describe('selectWorkspace', () => {
    const mockCtx = {
      error: jest.fn(),
      info: jest.fn()
    } as unknown as MeasureContext

    const mockBranding = null

    const mockDb = {
      account: {
        findOne: jest.fn() as jest.MockedFunction<AccountDB['account']['findOne']>
      },
      workspace: {
        findOne: jest.fn() as jest.MockedFunction<AccountDB['workspace']['findOne']>
      },
      workspaceStatus: {
        findOne: jest.fn() as jest.MockedFunction<AccountDB['workspaceStatus']['findOne']>
      },
      getWorkspaceRole: jest.fn() as jest.MockedFunction<AccountDB['getWorkspaceRole']>,
      person: {
        findOne: jest.fn() as jest.MockedFunction<AccountDB['person']['findOne']>
      }
    } as unknown as AccountDB

    beforeEach(() => {
      jest.clearAllMocks()
      ;(generateToken as jest.Mock).mockReturnValue('new-token')
    })

    describe('guest access', () => {
      const guestToken = 'guest-token'
      const workspaceUrl = 'test-workspace'
      const mockWorkspace = {
        uuid: 'workspace-uuid' as WorkspaceUuid,
        url: workspaceUrl,
        region: 'us',
        dataId: 'test-data-id'
      }

      beforeEach(() => {
        ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
          account: GUEST_ACCOUNT,
          workspace: 'workspace-uuid',
          extra: { guest: 'true' }
        })
        ;(getMetadata as jest.Mock).mockReturnValue('http://internal:3000;http://external:3000;us')
      })

      test('should handle guest access to existing workspace', async () => {
        ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue(mockWorkspace)

        const result = await selectWorkspace(mockCtx, mockDb, mockBranding, guestToken, {
          workspaceUrl,
          kind: 'external'
        })

        expect(result).toEqual({
          account: GUEST_ACCOUNT,
          endpoint: expect.any(String),
          token: guestToken,
          workspace: mockWorkspace.uuid,
          workspaceUrl: mockWorkspace.url,
          workspaceDataId: mockWorkspace.dataId,
          role: AccountRole.DocGuest
        })
      })

      test('should throw error if workspace not found', async () => {
        ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue(null)

        await expect(
          selectWorkspace(mockCtx, mockDb, mockBranding, guestToken, { workspaceUrl, kind: 'external' })
        ).rejects.toThrow(
          new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspaceUrl }))
        )

        expect(mockCtx.error).toHaveBeenCalledWith('Workspace not found in selectWorkspace', expect.any(Object))
      })
    })

    describe('system account', () => {
      const systemToken = 'system-token'
      const workspaceUrl = 'test-workspace'
      const mockWorkspace = {
        uuid: 'workspace-uuid' as WorkspaceUuid,
        url: workspaceUrl,
        region: 'us'
      }

      beforeEach(() => {
        ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
          account: systemAccountUuid,
          workspace: 'workspace-uuid',
          extra: {}
        })
        ;(getMetadata as jest.Mock).mockReturnValue('http://internal:3000;http://external:3000;us')
      })

      test('should handle system account access', async () => {
        ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue(mockWorkspace)

        const result = await selectWorkspace(mockCtx, mockDb, mockBranding, systemToken, {
          workspaceUrl,
          kind: 'external'
        })

        expect(result).toEqual({
          account: systemAccountUuid,
          token: 'new-token',
          endpoint: 'http://external:3000',
          workspace: mockWorkspace.uuid,
          workspaceUrl: mockWorkspace.url,
          role: AccountRole.Owner
        })
      })
    })

    describe('regular user access', () => {
      const userToken = 'user-token'
      const workspaceUrl = 'test-workspace'
      const mockWorkspace = {
        uuid: 'workspace-uuid' as WorkspaceUuid,
        url: workspaceUrl,
        region: 'us',
        dataId: 'test-data-id'
      }
      const mockAccount = { uuid: 'user-uuid' as PersonUuid }
      const mockPerson = { uuid: 'user-uuid' as PersonUuid }

      beforeEach(() => {
        ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
          account: mockAccount.uuid,
          workspace: 'workspace-uuid',
          extra: {}
        })
        ;(getMetadata as jest.Mock).mockReturnValue('http://internal:3000;http://external:3000;us')
      })

      test('should handle regular user access', async () => {
        ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue(mockWorkspace)
        ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(mockAccount)
        ;(mockDb.getWorkspaceRole as jest.Mock).mockResolvedValue(AccountRole.User)
        ;(mockDb.workspaceStatus.findOne as jest.Mock).mockResolvedValue({ isDisabled: false })
        ;(mockDb.person.findOne as jest.Mock).mockResolvedValue(mockPerson)

        const result = await selectWorkspace(mockCtx, mockDb, mockBranding, userToken, {
          workspaceUrl,
          kind: 'external'
        })

        expect(result).toEqual({
          account: mockAccount.uuid,
          token: 'new-token',
          endpoint: expect.any(String),
          workspace: mockWorkspace.uuid,
          workspaceUrl: mockWorkspace.url,
          workspaceDataId: mockWorkspace.dataId,
          role: AccountRole.User
        })
      })

      test('should throw error if account not found', async () => {
        ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(null)

        await expect(
          selectWorkspace(mockCtx, mockDb, mockBranding, userToken, { workspaceUrl, kind: 'external' })
        ).rejects.toThrow(new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, {})))
      })

      test('should throw error if workspace not found', async () => {
        ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(mockAccount)
        ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue(null)

        await expect(
          selectWorkspace(mockCtx, mockDb, mockBranding, userToken, { workspaceUrl, kind: 'external' })
        ).rejects.toThrow(
          new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspaceUrl }))
        )
      })

      test('should throw error if user not a member', async () => {
        ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(mockAccount)
        ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue(mockWorkspace)
        ;(mockDb.getWorkspaceRole as jest.Mock).mockResolvedValue(null)

        await expect(
          selectWorkspace(mockCtx, mockDb, mockBranding, userToken, { workspaceUrl, kind: 'external' })
        ).rejects.toThrow(new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {})))

        expect(mockCtx.error).toHaveBeenCalledWith('Not a member of the workspace being selected', expect.any(Object))
      })

      test('should throw error if workspace is disabled', async () => {
        ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(mockAccount)
        ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue(mockWorkspace)
        ;(mockDb.getWorkspaceRole as jest.Mock).mockResolvedValue(AccountRole.User)
        ;(mockDb.workspaceStatus.findOne as jest.Mock).mockResolvedValue({ isDisabled: true, mode: 'active' })

        await expect(
          selectWorkspace(mockCtx, mockDb, mockBranding, userToken, { workspaceUrl, kind: 'external' })
        ).rejects.toThrow(
          new PlatformError(new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspaceUrl }))
        )

        expect(mockCtx.error).toHaveBeenCalledWith('Selecting a disabled workspace', expect.any(Object))
      })
    })
  })

  describe('signUpByEmail', () => {
    const mockCtx = {
      error: jest.fn()
    } as unknown as MeasureContext

    const mockBranding = null

    const mockDb = {
      socialId: {
        findOne: jest.fn() as jest.MockedFunction<AccountDB['socialId']['findOne']>,
        insertOne: jest.fn() as jest.MockedFunction<AccountDB['socialId']['insertOne']>
      },
      account: {
        findOne: jest.fn() as jest.MockedFunction<AccountDB['account']['findOne']>,
        insertOne: jest.fn() as jest.MockedFunction<AccountDB['account']['insertOne']>
      },
      person: {
        insertOne: jest.fn() as jest.MockedFunction<AccountDB['person']['insertOne']>,
        updateOne: jest.fn() as jest.MockedFunction<AccountDB['person']['updateOne']>
      },
      accountEvent: {
        insertOne: jest.fn() as jest.MockedFunction<AccountDB['accountEvent']['insertOne']>
      },
      setPassword: jest.fn() as jest.MockedFunction<AccountDB['setPassword']>
    } as unknown as AccountDB

    beforeEach(() => {
      jest.clearAllMocks()
    })

    test('should create new account when email does not exist', async () => {
      const email = 'new@example.com'
      const password = 'password123'
      const firstName = 'John'
      const lastName = 'Doe'
      const personUuid = 'new-person-uuid' as PersonUuid

      // Mock no existing social id
      ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue(null)
      // Mock person creation
      ;(mockDb.person.insertOne as jest.Mock).mockResolvedValue(personUuid)

      const result = await signUpByEmail(mockCtx, mockDb, mockBranding, email, password, firstName, lastName)

      expect(result).toBe(personUuid)
      expect(mockDb.person.insertOne).toHaveBeenCalledWith({ firstName, lastName })
      expect(mockDb.socialId.insertOne).toHaveBeenCalledWith({
        type: SocialIdType.EMAIL,
        value: email,
        personUuid,
        verifiedOn: undefined
      })
      expect(mockDb.account.insertOne).toHaveBeenCalledWith({ uuid: personUuid })
      expect(mockDb.setPassword).toHaveBeenCalledWith(personUuid, expect.any(Buffer), expect.any(Buffer))
    })

    test('should create account for existing email without account', async () => {
      const email = 'existing@example.com'
      const password = 'password123'
      const firstName = 'John'
      const lastName = 'Doe'
      const personUuid = 'existing-person-uuid' as PersonUuid

      // Mock existing social id but no account
      const mockSocialId = {
        personUuid,
        type: SocialIdType.EMAIL,
        value: email
      }
      ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue(mockSocialId)
      ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(null)

      const result = await signUpByEmail(mockCtx, mockDb, mockBranding, email, password, firstName, lastName)

      expect(result).toBe(personUuid)
      expect(mockDb.person.updateOne).toHaveBeenCalledWith({ uuid: personUuid }, { firstName, lastName })
      expect(mockDb.account.insertOne).toHaveBeenCalledWith({ uuid: personUuid })
      expect(mockDb.setPassword).toHaveBeenCalledWith(personUuid, expect.any(Buffer), expect.any(Buffer))
    })

    test('should throw error if account already exists', async () => {
      const email = 'existing@example.com'
      const password = 'password123'
      const firstName = 'John'
      const lastName = 'Doe'
      const personUuid = 'existing-person-uuid' as PersonUuid

      // Mock existing social id and account
      const mockSocialId = {
        personUuid,
        type: SocialIdType.EMAIL,
        value: email
      }
      ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue(mockSocialId)
      ;(mockDb.account.findOne as jest.Mock).mockResolvedValue({ uuid: personUuid })

      await expect(signUpByEmail(mockCtx, mockDb, mockBranding, email, password, firstName, lastName)).rejects.toThrow(
        new PlatformError(new Status(Severity.ERROR, platform.status.AccountAlreadyExists, {}))
      )

      expect(mockCtx.error).toHaveBeenCalledWith('An account with the provided email already exists', { email })
    })

    test('should handle confirmed status', async () => {
      const email = 'new@example.com'
      const password = 'password123'
      const firstName = 'John'
      const lastName = 'Doe'
      const personUuid = 'new-person-uuid' as PersonUuid
      const confirmed = true

      ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue(null)
      ;(mockDb.person.insertOne as jest.Mock).mockResolvedValue(personUuid)

      await signUpByEmail(mockCtx, mockDb, mockBranding, email, password, firstName, lastName, confirmed)

      expect(mockDb.socialId.insertOne).toHaveBeenCalledWith({
        type: SocialIdType.EMAIL,
        value: email,
        personUuid,
        verifiedOn: expect.any(Number)
      })
    })

    test('should normalize email before processing', async () => {
      const email = '  TEST@EXAMPLE.COM  '
      const normalizedEmail = 'test@example.com'
      const password = 'password123'
      const firstName = 'John'
      const lastName = 'Doe'

      ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue(null)

      await signUpByEmail(mockCtx, mockDb, mockBranding, email, password, firstName, lastName)

      expect(mockDb.socialId.findOne).toHaveBeenCalledWith({
        type: SocialIdType.EMAIL,
        value: normalizedEmail
      })
      expect(mockDb.socialId.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          value: normalizedEmail
        })
      )
    })

    test('should create HULY social id when creating account', async () => {
      const email = 'new@example.com'
      const password = 'password123'
      const firstName = 'John'
      const lastName = 'Doe'
      const personUuid = 'new-person-uuid' as PersonUuid

      ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue(null)
      ;(mockDb.person.insertOne as jest.Mock).mockResolvedValue(personUuid)

      await signUpByEmail(mockCtx, mockDb, mockBranding, email, password, firstName, lastName)

      // Verify HULY social id creation
      expect(mockDb.socialId.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SocialIdType.HULY,
          value: personUuid,
          personUuid
        })
      )
    })

    test('should create account event', async () => {
      const email = 'new@example.com'
      const password = 'password123'
      const firstName = 'John'
      const lastName = 'Doe'
      const personUuid = 'new-person-uuid' as PersonUuid

      ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue(null)
      ;(mockDb.person.insertOne as jest.Mock).mockResolvedValue(personUuid)

      await signUpByEmail(mockCtx, mockDb, mockBranding, email, password, firstName, lastName)

      expect(mockDb.accountEvent.insertOne).toHaveBeenCalledWith({
        accountUuid: personUuid,
        eventType: AccountEventType.ACCOUNT_CREATED,
        time: expect.any(Number)
      })
    })
  })

  describe('getAccount', () => {
    const mockDb = {
      account: {
        findOne: jest.fn()
      }
    } as unknown as AccountDB

    beforeEach(() => {
      jest.clearAllMocks()
    })

    test('should return account when found', async () => {
      const mockAccount = { uuid: 'test-uuid' as PersonUuid }
      ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(mockAccount)

      const result = await getAccount(mockDb, 'test-uuid' as PersonUuid)
      expect(result).toEqual(mockAccount)
      expect(mockDb.account.findOne).toHaveBeenCalledWith({ uuid: 'test-uuid' })
    })

    test('should return null when account not found', async () => {
      ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(null)

      const result = await getAccount(mockDb, 'nonexistent-uuid' as PersonUuid)
      expect(result).toBeNull()
    })
  })

  describe('workspace utils', () => {
    const mockDb = {
      workspace: {
        findOne: jest.fn(),
        find: jest.fn()
      },
      workspaceStatus: {
        findOne: jest.fn(),
        find: jest.fn(),
        updateOne: jest.fn()
      }
    } as unknown as AccountDB

    beforeEach(() => {
      jest.clearAllMocks()
    })

    describe('getWorkspaceById', () => {
      test('should return workspace when found', async () => {
        const mockWorkspace = { uuid: 'test-uuid' as WorkspaceUuid }
        ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue(mockWorkspace)

        const result = await getWorkspaceById(mockDb, 'test-uuid' as WorkspaceUuid)
        expect(result).toEqual(mockWorkspace)
        expect(mockDb.workspace.findOne).toHaveBeenCalledWith({ uuid: 'test-uuid' })
      })

      test('should return null when workspace not found', async () => {
        ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue(null)

        const result = await getWorkspaceById(mockDb, 'nonexistent-uuid' as WorkspaceUuid)
        expect(result).toBeNull()
      })
    })

    describe('getWorkspaceInfoWithStatusById', () => {
      test('should return combined workspace and status info', async () => {
        const mockWorkspace = { uuid: 'test-uuid' as WorkspaceUuid }
        const mockStatus = { workspaceUuid: 'test-uuid', mode: 'active' }
        ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue(mockWorkspace)
        ;(mockDb.workspaceStatus.findOne as jest.Mock).mockResolvedValue(mockStatus)

        const result = await getWorkspaceInfoWithStatusById(mockDb, 'test-uuid' as WorkspaceUuid)
        expect(result).toEqual({
          ...mockWorkspace,
          status: mockStatus
        })
      })

      test('should return null if workspace not found', async () => {
        ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue(null)
        ;(mockDb.workspaceStatus.findOne as jest.Mock).mockResolvedValue({ mode: 'active' })

        const result = await getWorkspaceInfoWithStatusById(mockDb, 'test-uuid' as WorkspaceUuid)
        expect(result).toBeNull()
      })

      test('should return null if status not found', async () => {
        ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue({ uuid: 'test-uuid' })
        ;(mockDb.workspaceStatus.findOne as jest.Mock).mockResolvedValue(null)

        const result = await getWorkspaceInfoWithStatusById(mockDb, 'test-uuid' as WorkspaceUuid)
        expect(result).toBeNull()
      })
    })

    describe('updateArchiveInfo', () => {
      const mockCtx = {
        error: jest.fn()
      } as unknown as MeasureContext

      test('should update workspace status to archived', async () => {
        const mockWorkspace = { uuid: 'test-uuid' as WorkspaceUuid }
        ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue(mockWorkspace)

        await updateArchiveInfo(mockCtx, mockDb, 'test-uuid' as WorkspaceUuid, true)

        expect(mockDb.workspaceStatus.updateOne).toHaveBeenCalledWith(
          { workspaceUuid: 'test-uuid' },
          { mode: 'archived' }
        )
      })

      test('should throw error if workspace not found', async () => {
        ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue(null)

        await expect(updateArchiveInfo(mockCtx, mockDb, 'nonexistent' as WorkspaceUuid, true)).rejects.toThrow(
          new PlatformError(
            new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspaceUuid: 'nonexistent' })
          )
        )
      })
    })
  })

  describe('cleanExpiredOtp', () => {
    const mockDb = {
      otp: {
        deleteMany: jest.fn()
      }
    } as unknown as AccountDB

    beforeEach(() => {
      jest.clearAllMocks()
    })

    test('should delete expired OTP records', async () => {
      await cleanExpiredOtp(mockDb)

      expect(mockDb.otp.deleteMany).toHaveBeenCalledWith({
        expiresOn: { $lte: expect.any(Number) }
      })
    })
  })

  describe('getWorkspaces', () => {
    const mockDb = {
      workspace: {
        find: jest.fn()
      },
      workspaceStatus: {
        find: jest.fn()
      }
    } as unknown as AccountDB

    beforeEach(() => {
      jest.clearAllMocks()
    })

    test('should return all workspaces with status when no filters provided', async () => {
      const mockWorkspaces = [{ uuid: 'ws1' as WorkspaceUuid }, { uuid: 'ws2' as WorkspaceUuid }]
      const mockStatuses = [
        { workspaceUuid: 'ws1', isDisabled: false, mode: 'active' },
        { workspaceUuid: 'ws2', isDisabled: true, mode: 'archived' }
      ]
      ;(mockDb.workspace.find as jest.Mock).mockResolvedValue(mockWorkspaces)
      ;(mockDb.workspaceStatus.find as jest.Mock).mockResolvedValue(mockStatuses)

      const result = await getWorkspaces(mockDb)
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        ...mockWorkspaces[0],
        status: mockStatuses[0]
      })
    })

    test('should filter by disabled status', async () => {
      const mockWorkspaces = [{ uuid: 'ws1' as WorkspaceUuid }, { uuid: 'ws2' as WorkspaceUuid }]
      const mockStatuses = [
        { workspaceUuid: 'ws1', isDisabled: false, mode: 'active' },
        { workspaceUuid: 'ws2', isDisabled: true, mode: 'active' }
      ]
      ;(mockDb.workspace.find as jest.Mock).mockResolvedValue(mockWorkspaces)
      ;(mockDb.workspaceStatus.find as jest.Mock).mockResolvedValue(mockStatuses)

      const result = await getWorkspaces(mockDb, true)
      expect(result).toHaveLength(1)
      expect(result[0].uuid).toBe('ws2')
    })

    test('should filter by region', async () => {
      const region = 'us-east'
      ;(mockDb.workspace.find as jest.Mock).mockResolvedValue([])
      ;(mockDb.workspaceStatus.find as jest.Mock).mockResolvedValue([])

      await getWorkspaces(mockDb, null, region)
      expect(mockDb.workspace.find).toHaveBeenCalledWith({ region })
    })

    test('should filter by mode', async () => {
      const mockWorkspaces = [{ uuid: 'ws1' as WorkspaceUuid }, { uuid: 'ws2' as WorkspaceUuid }]
      const mockStatuses = [
        { workspaceUuid: 'ws1', isDisabled: false, mode: 'active' },
        { workspaceUuid: 'ws2', isDisabled: false, mode: 'archived' }
      ]
      ;(mockDb.workspace.find as jest.Mock).mockResolvedValue(mockWorkspaces)
      ;(mockDb.workspaceStatus.find as jest.Mock).mockResolvedValue(mockStatuses)

      const result = await getWorkspaces(mockDb, null, null, 'active')
      expect(result).toHaveLength(1)
      expect(result[0].uuid).toBe('ws1')
    })
  })

  describe('verifyAllowedServices', () => {
    test('should not throw for allowed service', () => {
      const services = ['service1', 'service2']
      const extra = { service: 'service1' }

      expect(() => {
        verifyAllowedServices(services, extra)
      }).not.toThrow()
    })

    test('should not throw for admin', () => {
      const services = ['service1']
      const extra = { service: 'service2', admin: 'true' }

      expect(() => {
        verifyAllowedServices(services, extra)
      }).not.toThrow()
    })

    test('should throw for unauthorized service', () => {
      const services = ['service1']
      const extra = { service: 'service2' }

      expect(() => {
        verifyAllowedServices(services, extra)
      }).toThrow(new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {})))
    })
  })

  describe('getPersonName', () => {
    test('should combine first and last name', () => {
      const person: Person = {
        uuid: 'test-uuid' as PersonUuid,
        firstName: 'John',
        lastName: 'Doe'
      }

      expect(getPersonName(person)).toBe('John Doe')
    })
  })

  describe('loginOrSignUpWithProvider', () => {
    const mockCtx = {
      error: jest.fn()
    } as unknown as MeasureContext

    const mockDb = {
      socialId: {
        findOne: jest.fn(),
        insertOne: jest.fn(),
        updateOne: jest.fn()
      },
      account: {
        findOne: jest.fn(),
        insertOne: jest.fn()
      },
      accountEvent: {
        findOne: jest.fn(),
        insertOne: jest.fn()
      },
      person: {
        findOne: jest.fn(),
        insertOne: jest.fn(),
        updateOne: jest.fn()
      },
      resetPassword: jest.fn()
    } as unknown as AccountDB

    const mockBranding = null
    const mockSocialId = { type: SocialIdType.GOOGLE, value: 'test-id' }

    beforeEach(() => {
      jest.clearAllMocks()
      ;(generateToken as jest.Mock).mockReturnValue('new-token')
    })

    test('should create new account when no social ids exist', async () => {
      const email = 'test@example.com'
      const firstName = 'John'
      const lastName = 'Doe'
      const personUuid = 'new-person' as PersonUuid

      ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue(null)
      ;(mockDb.person.insertOne as jest.Mock).mockResolvedValue(personUuid)
      ;(mockDb.person.findOne as jest.Mock).mockResolvedValue({ firstName, lastName })
      ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(null)

      const result = await loginOrSignUpWithProvider(
        mockCtx,
        mockDb,
        mockBranding,
        email,
        firstName,
        lastName,
        mockSocialId
      )

      expect(result).toEqual({
        account: personUuid,
        socialId: expect.any(String),
        name: 'John Doe',
        token: 'new-token'
      })
    })

    test('should return null when signup disabled and no account exists', async () => {
      ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue(null)

      const result = await loginOrSignUpWithProvider(
        mockCtx,
        mockDb,
        mockBranding,
        'test@example.com',
        'John',
        'Doe',
        mockSocialId,
        true
      )

      expect(result).toBeNull()
    })
  })

  describe('getWorkspaceInvite', () => {
    const mockDb = {
      invite: {
        findOne: jest.fn()
      }
    } as unknown as AccountDB

    beforeEach(() => {
      jest.clearAllMocks()
    })

    test('should return invite when found by id', async () => {
      const mockInvite = { id: 'test-invite', workspaceUuid: 'ws1' as WorkspaceUuid }
      ;(mockDb.invite.findOne as jest.Mock).mockResolvedValueOnce(mockInvite)

      const result = await getWorkspaceInvite(mockDb, 'test-invite')
      expect(result).toEqual(mockInvite)
      expect(mockDb.invite.findOne).toHaveBeenCalledWith({ id: 'test-invite' })
    })

    test('should check migrated invites when not found by id', async () => {
      const mockInvite = { id: 'new-id', migratedFrom: 'old-id' }
      ;(mockDb.invite.findOne as jest.Mock).mockResolvedValueOnce(null).mockResolvedValueOnce(mockInvite)

      const result = await getWorkspaceInvite(mockDb, 'old-id')
      expect(result).toEqual(mockInvite)
      expect(mockDb.invite.findOne).toHaveBeenCalledWith({ migratedFrom: 'old-id' })
    })

    test('should return null when invite not found', async () => {
      ;(mockDb.invite.findOne as jest.Mock).mockResolvedValueOnce(null).mockResolvedValueOnce(null)

      const result = await getWorkspaceInvite(mockDb, 'nonexistent')
      expect(result).toBeNull()
    })
  })

  describe('getSocialIdByKey', () => {
    const mockDb = {
      socialId: {
        findOne: jest.fn()
      }
    } as unknown as AccountDB

    beforeEach(() => {
      jest.clearAllMocks()
    })

    test('should return social id when found', async () => {
      const mockSocialId = { key: 'email:test@example.com' as PersonId }
      ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue(mockSocialId)

      const result = await getSocialIdByKey(mockDb, 'email:test@example.com' as PersonId)
      expect(result).toEqual(mockSocialId)
      expect(mockDb.socialId.findOne).toHaveBeenCalledWith({ key: 'email:test@example.com' })
    })

    test('should return null when social id not found', async () => {
      ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue(null)

      const result = await getSocialIdByKey(mockDb, 'nonexistent' as PersonId)
      expect(result).toBeNull()
    })
  })

  describe('getSesUrl', () => {
    beforeEach(() => {
      ;(getMetadata as jest.Mock).mockImplementation((key) => {
        switch (key) {
          case accountPlugin.metadata.MAIL_URL:
            return 'https://ses.example.com'
          case accountPlugin.metadata.MAIL_AUTH_TOKEN:
            return 'test-token'
          default:
            return undefined
        }
      })
    })

    afterEach(() => {
      ;(getMetadata as jest.Mock).mockReset()
    })

    test('should return SES URL and auth token when configured', () => {
      const result = getMailUrl()
      expect(result).toEqual({
        mailURL: 'https://ses.example.com',
        mailAuth: 'test-token'
      })
    })

    test('should throw error when SES URL not configured', () => {
      ;(getMetadata as jest.Mock).mockReturnValue(undefined)

      expect(() => getMailUrl()).toThrow('Please provide email service url')
    })
  })

  describe('getFrontUrl', () => {
    const mockBranding: Branding = {
      front: 'https://custom.example.com'
    }

    beforeEach(() => {
      ;(getMetadata as jest.Mock).mockImplementation((key) => {
        if (key === accountPlugin.metadata.FrontURL) {
          return 'https://default.example.com'
        }
        return undefined
      })
    })

    test('should return branding front URL when available', () => {
      const result = getFrontUrl(mockBranding)
      expect(result).toBe('https://custom.example.com')
    })

    test('should return FRONT_URL when no branding front URL', () => {
      const result = getFrontUrl(null)
      expect(result).toBe('https://default.example.com')
    })

    test('should throw error when no URL available', () => {
      ;(getMetadata as jest.Mock).mockReturnValue(undefined)
      expect(() => getFrontUrl(null)).toThrow('Please provide front url')
    })
  })

  describe('getInviteEmail', () => {
    const mockBranding: Branding = {
      language: 'en',
      front: 'https://app.example.com'
    }

    const mockWorkspace: Workspace = {
      uuid: 'test-workspace-uuid' as WorkspaceUuid,
      name: 'Test Workspace',
      url: 'test-workspace'
    }

    test('should generate invite email content', async () => {
      const result = await getInviteEmail(mockBranding, 'test@example.com', 'invite-id', mockWorkspace, 24)

      expect(result).toEqual({
        text: expect.any(String),
        html: expect.any(String),
        subject: expect.any(String),
        to: 'test@example.com'
      })
    })
  })
})
