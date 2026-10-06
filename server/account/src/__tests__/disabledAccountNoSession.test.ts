//
// Copyright © 2026 Hardcore Engineering Inc.
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

import { AccountRole, type MeasureContext, SocialIdType, type WorkspaceUuid } from '@hcengineering/core'
import { setMetadata } from '@hcengineering/platform'
import serverToken, { decodeTokenVerbose, generateToken, TokenError } from '@hcengineering/server-token'
import { authenticator } from 'otplib'

import { getLoginInfoByToken, getLoginWithWorkspaceInfo, login, validateOtp, verify2fa } from '../operations'
import { accountPlugin } from '../plugin'
import type { Account, AccountDB } from '../types'
import { hashWithSalt, loginOrSignUpWithProvider, selectWorkspace } from '../utils'

setMetadata(serverToken.metadata.Secret, 'test-secret')
// A transactor endpoint so getLoginWithWorkspaceInfo() can build a full result.
setMetadata(accountPlugin.metadata.Transactors, 'http://tx:3000;http://tx:3000;')

const USER = 'a2222222-2222-4222-9222-222222222222' as any
const WS = 'b3333333-3333-4333-9333-333333333333' as WorkspaceUuid
const NIL_UUID = '00000000-0000-0000-0000-000000000000' as any
const EMAIL = 'user@example.com'
const PASSWORD = 'correct-password'
const DISABLED_AT = 1_700_000_000_000

const ctx = {
  newChild: () => ctx,
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  measure: jest.fn()
} as unknown as MeasureContext

const salt = Buffer.from('0123456789abcdef')
const emailSocialId = {
  _id: 'sid-email',
  type: SocialIdType.EMAIL,
  value: EMAIL,
  key: `email:${EMAIL}`,
  personUuid: USER,
  verifiedOn: 1
}

function makeDb (account: Partial<Account>): AccountDB {
  const row: Partial<Account> = { uuid: USER, hash: hashWithSalt(PASSWORD, salt), salt, ...account }
  return {
    account: {
      findOne: jest.fn(async (q: any) => (q.uuid === USER ? row : null)),
      update: jest.fn(async () => undefined)
    },
    socialId: {
      findOne: jest.fn(async () => emailSocialId),
      find: jest.fn(async () => [emailSocialId]),
      update: jest.fn(async () => undefined),
      insertOne: jest.fn(async () => 'sid-new')
    },
    person: {
      findOne: jest.fn(async () => ({ uuid: USER, firstName: 'Dis', lastName: 'Abled' })),
      update: jest.fn(async () => undefined)
    },
    otp: {
      findOne: jest.fn(async () => ({ expiresOn: Date.now() + 60_000 })),
      deleteMany: jest.fn(async () => undefined)
    },
    workspace: { findOne: jest.fn(async () => ({ uuid: WS, url: 'ws-url', name: 'WS' })) },
    workspaceStatus: {
      findOne: jest.fn(async () => ({ workspaceUuid: WS, mode: 'active', isDisabled: false })),
      update: jest.fn(async () => undefined)
    },
    getWorkspaceRole: jest.fn(async () => AccountRole.Owner),
    getWorkspaceRoles: jest.fn(async () => new Map([[WS, AccountRole.Owner]])),
    getAccountWorkspaces: jest.fn(async () => [
      {
        uuid: WS,
        url: 'ws-url',
        status: { mode: 'active', versionMajor: 0, versionMinor: 0, versionPatch: 0, processingProgress: 100 }
      }
    ]),
    resetPassword: jest.fn(async () => undefined)
  } as unknown as AccountDB
}

async function statusCodeOf (promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise
  } catch (err: any) {
    return err?.status?.code ?? err?.name
  }
  return undefined
}

describe('token-less login paths reject disabled accounts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('login', () => {
    it('rejects a disabled account with the correct password', async () => {
      const db = makeDb({ disabledAt: DISABLED_AT })
      const code = await statusCodeOf(login(ctx, db, null, '', { email: EMAIL, password: PASSWORD }))
      expect(code).toBe(accountPlugin.status.AccountDisabled)
    })

    it('does not disclose the disabled state for a wrong password', async () => {
      const db = makeDb({ disabledAt: DISABLED_AT })
      const code = await statusCodeOf(login(ctx, db, null, '', { email: EMAIL, password: 'wrong' }))
      expect(code).toBe('platform:status:AccountNotFound')
    })

    it('stamps the token version and records activity for an active account', async () => {
      const db = makeDb({ tokenVersion: 2, lastActivityAt: null })
      const res = await login(ctx, db, null, '', { email: EMAIL, password: PASSWORD })
      expect(decodeTokenVerbose(ctx, res.token ?? '').extra?.token_version).toBe('2')
      expect(db.account.update).toHaveBeenCalledWith({ uuid: USER }, { lastActivityAt: expect.any(Number) })
    })
  })

  it('validateOtp rejects a disabled account', async () => {
    const db = makeDb({ disabledAt: DISABLED_AT })
    const code = await statusCodeOf(validateOtp(ctx, db, null, '', { email: EMAIL, code: '123456' }))
    expect(code).toBe(accountPlugin.status.AccountDisabled)
  })

  describe('verify2fa', () => {
    const tfaSecret = authenticator.generateSecret()
    const intermediate = generateToken(NIL_UUID, undefined, { tfaAccount: USER })

    it('rejects a disabled account even with a valid TOTP code', async () => {
      const db = makeDb({ disabledAt: DISABLED_AT, tfaSecret })
      const code = await statusCodeOf(
        verify2fa(ctx, db, null, intermediate, { code: authenticator.generate(tfaSecret) })
      )
      expect(code).toBe(accountPlugin.status.AccountDisabled)
    })

    it('issues a versioned token for an active account', async () => {
      const db = makeDb({ tokenVersion: 3, tfaSecret })
      const res = await verify2fa(ctx, db, null, intermediate, { code: authenticator.generate(tfaSecret) })
      const decoded = decodeTokenVerbose(ctx, res.token ?? '')
      expect(decoded.account).toBe(USER)
      expect(decoded.extra?.token_version).toBe('3')
      expect(decoded.extra?.tfaAccount).toBeUndefined()
    })
  })

  it('loginOrSignUpWithProvider rejects a disabled account', async () => {
    const db = makeDb({ disabledAt: DISABLED_AT })
    const code = await statusCodeOf(
      loginOrSignUpWithProvider(ctx, db, null, EMAIL, 'Dis', 'Abled', { type: SocialIdType.GITHUB, value: 'gh-user' })
    )
    expect(code).toBe(accountPlugin.status.AccountDisabled)
  })
})

describe('API and service tokens: disabled check only, no token-version check', () => {
  const kinds: Array<{ kind: string, extra: Record<string, string> }> = [
    { kind: 'API token', extra: { apiTokenId: 'api-1' } },
    { kind: 'user-scoped service token', extra: { service: 'telegram-bot' } }
  ]
  const params = { workspaceUrl: 'ws-url', kind: 'external' as const }

  describe.each(kinds)('$kind', ({ extra }) => {
    it('is accepted on a bumped account by selectWorkspace, getLoginInfoByToken and getLoginWithWorkspaceInfo', async () => {
      const db = makeDb({ tokenVersion: 2 })
      const token = generateToken(USER, WS, extra)
      await expect(selectWorkspace(ctx, db, null, token, params)).resolves.toEqual(
        expect.objectContaining({ account: USER, workspace: WS })
      )
      await expect(getLoginInfoByToken(ctx, db, null, token)).resolves.toEqual(
        expect.objectContaining({ account: USER, workspace: WS })
      )
      const info = await getLoginWithWorkspaceInfo(ctx, db, null, token)
      expect(Object.keys(info.workspaces)).toEqual([WS])
    })

    it('is rejected on a disabled account by all three paths', async () => {
      const db = makeDb({ disabledAt: DISABLED_AT, tokenVersion: 2 })
      const token = generateToken(USER, WS, extra)
      await expect(selectWorkspace(ctx, db, null, token, params)).rejects.toThrow('Account disabled')
      expect(await statusCodeOf(getLoginInfoByToken(ctx, db, null, token))).toBe('platform:status:Unauthorized')
      expect(await statusCodeOf(getLoginWithWorkspaceInfo(ctx, db, null, token))).toBe('platform:status:Unauthorized')
    })
  })
})

describe('session paths enforce disabled state and token version', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('selectWorkspace', () => {
    const params = { workspaceUrl: 'ws-url', kind: 'external' as const }

    it('rejects a disabled account', async () => {
      const db = makeDb({ disabledAt: DISABLED_AT, tokenVersion: 1 })
      await expect(
        selectWorkspace(ctx, db, null, generateToken(USER, undefined, { token_version: '1' }), params)
      ).rejects.toThrow(TokenError)
    })

    it('rejects a session token issued before the last version bump', async () => {
      const db = makeDb({ tokenVersion: 2 })
      await expect(selectWorkspace(ctx, db, null, generateToken(USER), params)).rejects.toThrow(
        'Token version invalidated'
      )
    })

    it('issues a workspace token carrying the current version', async () => {
      const db = makeDb({ tokenVersion: 2 })
      const res = await selectWorkspace(ctx, db, null, generateToken(USER, undefined, { token_version: '2' }), params)
      expect(decodeTokenVerbose(ctx, res.token ?? '').extra?.token_version).toBe('2')
    })
  })

  describe('getLoginInfoByToken', () => {
    it('reports a stale session token as Unauthorized', async () => {
      const db = makeDb({ tokenVersion: 2 })
      const code = await statusCodeOf(getLoginInfoByToken(ctx, db, null, generateToken(USER, WS)))
      expect(code).toBe('platform:status:Unauthorized')
    })

    it('uses the principal row loaded by wrap()', async () => {
      const db = makeDb({ tokenVersion: 0 })
      const code = await statusCodeOf(
        getLoginInfoByToken(ctx, db, null, generateToken(USER, WS), undefined, {
          principalAccount: { uuid: USER, tokenVersion: 5, disabledAt: null }
        })
      )
      expect(code).toBe('platform:status:Unauthorized')
      expect(db.account.findOne).not.toHaveBeenCalled()
    })
  })

  describe('getLoginWithWorkspaceInfo (transactor session path)', () => {
    it('rejects a disabled account holding a never-expiring workspace token', async () => {
      const db = makeDb({ disabledAt: DISABLED_AT, tokenVersion: 1 })
      // Token issued before disable. Workspace JWTs have no exp.
      const code = await statusCodeOf(getLoginWithWorkspaceInfo(ctx, db, null, generateToken(USER, WS, {})))
      expect(code).toBe('platform:status:Unauthorized')
    })

    it('rejects a session token issued before the last version bump', async () => {
      const db = makeDb({ tokenVersion: 1 })
      const code = await statusCodeOf(getLoginWithWorkspaceInfo(ctx, db, null, generateToken(USER, WS, {})))
      expect(code).toBe('platform:status:Unauthorized')
    })

    it('accepts a current token', async () => {
      const db = makeDb({ tokenVersion: 1 })
      const res = await getLoginWithWorkspaceInfo(ctx, db, null, generateToken(USER, WS, { token_version: '1' }))
      expect(Object.keys(res.workspaces)).toEqual([WS])
    })
  })
})
