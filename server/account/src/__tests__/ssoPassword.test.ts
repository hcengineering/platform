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

import { SocialIdType, type MeasureContext, type PersonUuid } from '@hcengineering/core'
import platform, { getMetadata } from '@hcengineering/platform'
import { decodeTokenVerbose, generateToken } from '@hcengineering/server-token'

import { accountPlugin } from '../plugin'
import { type AccountDB } from '../types'
import { getMethods } from '../operations'

jest.mock('@hcengineering/platform', () => {
  const actual = jest.requireActual('@hcengineering/platform')
  return {
    ...actual,
    ...actual.default,
    getMetadata: jest.fn(),
    translate: jest.fn((id: string, params: any) => `${id} << ${JSON.stringify(params)}`)
  }
})

jest.mock('@hcengineering/server-token', () => {
  class TokenError extends Error {
    constructor (msg: string) {
      super(msg)
      this.name = 'TokenError'
    }
  }
  return {
    decodeTokenVerbose: jest.fn(),
    decodeToken: jest.fn(),
    TokenError,
    generateToken: jest.fn().mockReturnValue('mocked-reset-token')
  }
})

const mockCtx = { error: jest.fn(), info: jest.fn(), warn: jest.fn() } as unknown as MeasureContext
const accountUuid = 'account-uuid' as PersonUuid

describe('checkHasPassword', () => {
  const mockDb = {
    account: { findOne: jest.fn() }
  } as unknown as AccountDB

  const methods = getMethods()
  const checkHasPassword = methods.checkHasPassword!

  beforeEach(() => {
    jest.clearAllMocks()
    ;(decodeTokenVerbose as jest.Mock).mockReturnValue({ account: accountUuid })
  })

  test('returns true when account has hash and salt', async () => {
    ;(mockDb.account.findOne as jest.Mock).mockResolvedValue({
      uuid: accountUuid,
      hash: Buffer.from('hash'),
      salt: Buffer.from('salt')
    })
    const result = await checkHasPassword(mockCtx, mockDb, null, { id: 1, params: {} }, 'token')
    expect(result.result).toBe(true)
  })

  test('returns false when account has no hash (SSO-only)', async () => {
    ;(mockDb.account.findOne as jest.Mock).mockResolvedValue({
      uuid: accountUuid,
      hash: null,
      salt: null
    })
    const result = await checkHasPassword(mockCtx, mockDb, null, { id: 1, params: {} }, 'token')
    expect(result.result).toBe(false)
  })

  test('returns false for partial state: hash set but salt null', async () => {
    ;(mockDb.account.findOne as jest.Mock).mockResolvedValue({
      uuid: accountUuid,
      hash: Buffer.from('hash'),
      salt: null
    })
    const result = await checkHasPassword(mockCtx, mockDb, null, { id: 1, params: {} }, 'token')
    expect(result.result).toBe(false)
  })

  test('returns false for partial state: salt set but hash null', async () => {
    ;(mockDb.account.findOne as jest.Mock).mockResolvedValue({
      uuid: accountUuid,
      hash: null,
      salt: Buffer.from('salt')
    })
    const result = await checkHasPassword(mockCtx, mockDb, null, { id: 1, params: {} }, 'token')
    expect(result.result).toBe(false)
  })

  test('returns error for missing account', async () => {
    ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(null)
    const result = await checkHasPassword(mockCtx, mockDb, null, { id: 1, params: {} }, 'token')
    expect(result.error).toBeDefined()
  })

  test('returns error for invalid/expired token', async () => {
    const { TokenError } = jest.requireMock('@hcengineering/server-token')
    ;(decodeTokenVerbose as jest.Mock).mockImplementation(() => { throw new TokenError('invalid token') })
    const result = await checkHasPassword(mockCtx, mockDb, null, { id: 1, params: {} }, 'bad-token')
    expect(result.error).toBeDefined()
  })
})

describe('changePassword', () => {
  const mockDb = {
    account: { findOne: jest.fn() },
    accountEvent: { insertOne: jest.fn() },
    setPassword: jest.fn()
  } as unknown as AccountDB

  const methods = getMethods()
  const changePassword = methods.changePassword!

  beforeEach(() => {
    jest.clearAllMocks()
    ;(decodeTokenVerbose as jest.Mock).mockReturnValue({ account: accountUuid })
  })

  test('rejects empty newPassword', async () => {
    const result = await changePassword(
      mockCtx, mockDb, null,
      { id: 1, params: { oldPassword: 'old', newPassword: '' } },
      'token'
    )
    expect(result.error).toBeDefined()
    expect(mockDb.setPassword).not.toHaveBeenCalled()
  })

  test('rejects empty oldPassword even for SSO-only accounts (no hash)', async () => {
    // changePassword always requires oldPassword — SSO accounts must use requestPasswordSetup flow
    ;(mockDb.account.findOne as jest.Mock).mockResolvedValue({
      uuid: accountUuid,
      hash: null,
      salt: null
    })
    const result = await changePassword(
      mockCtx, mockDb, null,
      { id: 1, params: { oldPassword: '', newPassword: 'newpass123' } },
      'token'
    )
    expect(result.error).toBeDefined()
    expect(mockDb.setPassword).not.toHaveBeenCalled()
  })

  test('rejects empty oldPassword for accounts with hash', async () => {
    ;(mockDb.account.findOne as jest.Mock).mockResolvedValue({
      uuid: accountUuid,
      hash: Buffer.from('hash'),
      salt: Buffer.from('salt')
    })
    const result = await changePassword(
      mockCtx, mockDb, null,
      { id: 1, params: { oldPassword: '', newPassword: 'newpass123' } },
      'token'
    )
    expect(result.error).toBeDefined()
    expect(mockDb.setPassword).not.toHaveBeenCalled()
  })

  test('rejects wrong oldPassword', async () => {
    ;(mockDb.account.findOne as jest.Mock).mockResolvedValue({
      uuid: accountUuid,
      hash: Buffer.from('hash'),
      salt: Buffer.from('salt')
    })
    const result = await changePassword(
      mockCtx, mockDb, null,
      { id: 1, params: { oldPassword: 'wrongpass', newPassword: 'newpass123' } },
      'token'
    )
    expect(result.error).toBeDefined()
    expect(mockDb.setPassword).not.toHaveBeenCalled()
  })
})

describe('requestPasswordSetup', () => {
  const mockDb = {
    account: { findOne: jest.fn() },
    socialId: { findOne: jest.fn() }
  } as unknown as AccountDB

  const methods = getMethods()
  const requestPasswordSetup = methods.requestPasswordSetup!

  const mockFetch = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(decodeTokenVerbose as jest.Mock).mockReturnValue({ account: accountUuid })
    ;(generateToken as jest.Mock).mockReturnValue('mocked-reset-token')
    ;(getMetadata as jest.Mock).mockImplementation((key: any) => {
      switch (key) {
        case accountPlugin.metadata.MAIL_URL: return 'http://mail.test'
        case accountPlugin.metadata.MAIL_AUTH_TOKEN: return undefined
        case accountPlugin.metadata.FrontURL: return 'http://app.test'
        default: return undefined
      }
    })
    global.fetch = mockFetch
    mockFetch.mockResolvedValue({ ok: true })
    // Default: SSO-only account (no password hash)
    ;(mockDb.account.findOne as jest.Mock).mockResolvedValue({ uuid: accountUuid, hash: null, salt: null })
  })

  test('rejects when account already has a password (server-side guard)', async () => {
    ;(mockDb.account.findOne as jest.Mock).mockResolvedValue({
      uuid: accountUuid,
      hash: Buffer.from('hash'),
      salt: Buffer.from('salt')
    })
    const result = await requestPasswordSetup(mockCtx, mockDb, null, { id: 1, params: {} }, 'token')
    expect(result.error).toBeDefined()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  test('sends email when account has a verified email social ID', async () => {
    ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue({
      type: SocialIdType.EMAIL,
      value: 'user@example.com',
      personUuid: accountUuid
    })

    const result = await requestPasswordSetup(mockCtx, mockDb, null, { id: 1, params: {} }, 'token')

    expect(result.error).toBeUndefined()
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const fetchCall = mockFetch.mock.calls[0]
    const body = JSON.parse(fetchCall[1].body)
    expect(body.to).toBe('user@example.com')
    expect(body.text).toContain('mocked-reset-token')
  })

  test('returns SocialIdNotFound when account has no email social ID', async () => {
    ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue(null)

    const result = await requestPasswordSetup(mockCtx, mockDb, null, { id: 1, params: {} }, 'token')

    expect(result.error).toBeDefined()
    expect(result.error?.code).toBe(platform.status.SocialIdNotFound)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  test('does not throw when mail service returns non-ok response', async () => {
    ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue({
      type: SocialIdType.EMAIL,
      value: 'user@example.com',
      personUuid: accountUuid
    })
    mockFetch.mockResolvedValue({ ok: false, statusText: 'Internal Server Error' })

    // Should complete without throwing — error is logged, not rethrown
    const result = await requestPasswordSetup(mockCtx, mockDb, null, { id: 1, params: {} }, 'token')
    expect(result.error).toBeUndefined()
    expect(mockCtx.error).toHaveBeenCalled()
  })
})
