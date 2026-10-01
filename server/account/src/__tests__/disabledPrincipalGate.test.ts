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

import {
  AccountRole,
  type MeasureContext,
  readOnlyGuestAccountUuid,
  systemAccountUuid,
  type WorkspaceUuid
} from '@hcengineering/core'
import platform, { setMetadata } from '@hcengineering/platform'
import serverToken, { generateToken, TokenError } from '@hcengineering/server-token'

import { createApiToken, getMethods } from '../operations'
import { accountPlugin } from '../plugin'
import { type Account, type AccountDB, type Meta } from '../types'
import { GUEST_ACCOUNT, wrap } from '../utils'

setMetadata(serverToken.metadata.Secret, 'test-secret')
setMetadata(accountPlugin.metadata.Transactors, 'http://tx:3000;http://tx:3000;')

const DISABLED = 'a1111111-1111-4111-9111-111111111111' as any
const ACTIVE = 'a2222222-2222-4222-9222-222222222222' as any
const MISSING = 'a3333333-3333-4333-9333-333333333333' as any
const NIL_UUID = '00000000-0000-0000-0000-000000000000' as any
const WS = 'b1111111-1111-4111-9111-111111111111' as WorkspaceUuid

const ctx = {
  newChild: () => ctx,
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
} as unknown as MeasureContext

const unauthorized = { error: expect.objectContaining({ code: platform.status.Unauthorized }) }

function mockDb (): AccountDB {
  const accounts: Record<string, Partial<Account>> = {
    [DISABLED]: { uuid: DISABLED, tokenVersion: 1, disabledAt: 1_700_000_000_000 },
    [ACTIVE]: { uuid: ACTIVE, tokenVersion: 2, disabledAt: null }
  }
  return {
    account: { findOne: jest.fn(async (q: any) => accounts[q.uuid] ?? null) },
    apiToken: {
      findOne: jest.fn(async (q: any) => ({
        id: q.id,
        accountUuid: DISABLED,
        workspaceUuid: WS,
        revoked: false,
        expiresOn: Date.now() + 86400000
      })),
      find: jest.fn(async () => []),
      insertOne: jest.fn()
    },
    socialId: { findOne: jest.fn(async () => null), find: jest.fn(async () => []) },
    getWorkspaceRole: jest.fn(async () => AccountRole.Owner)
  } as unknown as AccountDB
}

describe('disabled-principal gate in wrap()', () => {
  let db: AccountDB
  let spy: jest.Mock
  let handler: ReturnType<typeof wrap>

  beforeEach(() => {
    jest.clearAllMocks()
    db = mockDb()
    spy = jest.fn(async () => 'ok')
    Object.defineProperty(spy, 'name', { value: 'spyMethod' })
    handler = wrap(spy)
  })

  describe('session token of a disabled account', () => {
    const token = generateToken(DISABLED, undefined, { token_version: '1' })

    it('is rejected before the method runs', async () => {
      expect(await handler(ctx, db, null, { id: 1, params: {} }, token)).toEqual(unauthorized)
      expect(spy).not.toHaveBeenCalled()
    })

    it.each(['createInvite', 'changeUsername', 'createApiToken'] as const)(
      'is rejected by the registered %s method',
      async (name) => {
        const method = getMethods()[name]
        expect(method).toBeDefined()
        const res = await method?.(ctx, db, null, { id: 1, params: { name: 'x', workspaceUuid: WS } }, token)
        expect(res).toEqual(unauthorized)
        expect(db.getWorkspaceRole).not.toHaveBeenCalled()
        expect(db.apiToken.insertOne).not.toHaveBeenCalled()
      }
    )

    it('also rejects confirm/restore style tokens of the disabled account', async () => {
      const restore = generateToken(DISABLED, undefined, { restoreEmail: 'x@example.com' })
      expect(await handler(ctx, db, null, { id: 1, params: {} }, restore)).toEqual(unauthorized)
      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe('API token of a disabled owner', () => {
    const token = generateToken(DISABLED, WS, { apiTokenId: 'token-1' })

    it('is rejected although the api_tokens row is valid', async () => {
      expect(await handler(ctx, db, null, { id: 1, params: {} }, token)).toEqual(unauthorized)
      expect(db.apiToken.findOne).toHaveBeenCalledWith({ id: 'token-1' })
      expect(spy).not.toHaveBeenCalled()
    })

    it('is reported as Unauthorized by getLoginInfoByToken (transactor revocation signal)', async () => {
      const res = await getMethods().getLoginInfoByToken?.(ctx, db, null, { id: 1, params: {} }, token)
      expect(res).toEqual(unauthorized)
    })
  })

  describe('service tokens', () => {
    it('rejects a user-scoped service token of a disabled account', async () => {
      const token = generateToken(DISABLED, WS, { service: 'telegram-bot' })
      expect(await handler(ctx, db, null, { id: 1, params: {} }, token)).toEqual(unauthorized)
      expect(spy).not.toHaveBeenCalled()
    })

    it('passes a system service token without reading the account', async () => {
      const token = generateToken(systemAccountUuid, undefined, { service: 'github' })
      expect(await handler(ctx, db, null, { id: 1, params: {} }, token)).toEqual({ id: 1, result: 'ok' })
      expect(db.account.findOne).not.toHaveBeenCalled()
    })
  })

  describe('exempt principals', () => {
    it.each([
      ['doc guest', GUEST_ACCOUNT, { guest: 'true' }, false],
      ['read-only guest', readOnlyGuestAccountUuid, {}, false],
      ['2FA intermediate principal', NIL_UUID, { tfaAccount: DISABLED }, true],
      ['account without row', MISSING, {}, true]
    ])('passes the %s', async (_name, account, extra, readsAccount) => {
      const token = generateToken(account, undefined, extra)
      expect(await handler(ctx, db, null, { id: 1, params: {} }, token)).toEqual({ id: 1, result: 'ok' })
      expect(spy).toHaveBeenCalled()
      expect((db.account.findOne as jest.Mock).mock.calls.length > 0).toBe(readsAccount)
    })
  })

  describe('requests without a token', () => {
    it.each([undefined, ''])('do not touch the account table (token=%p)', async (token) => {
      expect(await handler(ctx, db, null, { id: 1, params: {} }, token)).toEqual({ id: 1, result: 'ok' })
      expect(db.account.findOne).not.toHaveBeenCalled()
    })

    it('leave getRegionInfo unchanged', async () => {
      const res = await getMethods().getRegionInfo?.(ctx, db, null, { id: 1, params: {} }, undefined)
      expect(res).toEqual({ id: 1, result: expect.any(Array) })
      expect(db.account.findOne).not.toHaveBeenCalled()
    })

    it('leave login unchanged', async () => {
      const res = await getMethods().login?.(
        ctx,
        db,
        null,
        { id: 1, params: { email: 'nobody@example.com', password: 'secret' } },
        undefined
      )
      expect(res).toEqual({ error: expect.objectContaining({ code: platform.status.AccountNotFound }) })
      expect(db.account.findOne).not.toHaveBeenCalled()
    })
  })

  describe('active account', () => {
    it('hands the loaded row to the method via meta.principalAccount', async () => {
      const token = generateToken(ACTIVE, undefined, { token_version: '2' })
      await handler(ctx, db, null, { id: 1, params: {} }, token, { timezone: 'UTC' })
      expect(db.account.findOne).toHaveBeenCalledTimes(1)
      const meta: Meta = spy.mock.calls[0][5]
      expect(meta).toEqual({
        timezone: 'UTC',
        principalAccount: { uuid: ACTIVE, tokenVersion: 2, disabledAt: null }
      })
    })

    it('never forwards a caller-supplied principalAccount', async () => {
      const token = generateToken(systemAccountUuid, undefined, { service: 'github' })
      const spoofed: Meta = { timezone: 'UTC', principalAccount: { uuid: DISABLED, tokenVersion: 99 } }
      await handler(ctx, db, null, { id: 1, params: {} }, token, spoofed)
      expect(spy.mock.calls[0][5]).toEqual({ timezone: 'UTC' })
    })

    it('rejects a session token issued before the last version bump in createApiToken', async () => {
      const stale = generateToken(ACTIVE, undefined, { token_version: '1' })
      const res = await getMethods().createApiToken?.(
        ctx,
        db,
        null,
        { id: 1, params: { name: 'x', workspaceUuid: WS, expiryDays: 30 } },
        stale
      )
      expect(res).toEqual(unauthorized)
      expect(db.apiToken.insertOne).not.toHaveBeenCalled()
    })
  })
})

describe('createApiToken called directly (defense in depth)', () => {
  it('refuses to mint an API token for a disabled account', async () => {
    const db = mockDb()
    const token = generateToken(DISABLED, undefined, { token_version: '1' })
    await expect(
      createApiToken(ctx, db, null, token, { name: 'x', workspaceUuid: WS, expiryDays: 30 })
    ).rejects.toThrow(TokenError)
    expect(db.apiToken.insertOne).not.toHaveBeenCalled()
  })
})
