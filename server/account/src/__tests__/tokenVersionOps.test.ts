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

// Token-version enforcement in the four operations that mint or extend
// privileges from the caller's token (createAccessLink, sendInvite,
// resendInvite, changePassword). Every case is exercised both directly and
// through getMethods()/wrap(), which is exactly how the account-service RPC
// dispatcher invokes a method for a bearer token.
//
// API tokens (extra.apiTokenId) are deliberately exempt: their semantics must
// stay unchanged (revocation/expiry is handled by wrap() where available).

import { AccountRole, type MeasureContext, type WorkspaceUuid } from '@hcengineering/core'
import platform, { getMetadata } from '@hcengineering/platform'
import { decodeToken, decodeTokenVerbose, generateToken, TokenError } from '@hcengineering/server-token'

import * as utils from '../utils'
import { type AccountDB, type AccountMethodHandler } from '../types'
import { changePassword, createAccessLink, getMethods, resendInvite, sendInvite } from '../operations'
import { accountPlugin } from '../plugin'

jest.mock('@hcengineering/platform', () => {
  const actual = jest.requireActual('@hcengineering/platform')
  return {
    ...actual,
    ...actual.default,
    getMetadata: jest.fn(),
    translate: jest.fn((id, params) => `${id} << ${JSON.stringify(params)}`)
  }
})

// Token-dependent decoding: wrap() (on branches that carry the API-token
// block) decodes with decodeToken, the operations with decodeTokenVerbose.
// Both mocks resolve the same token table.
jest.mock('@hcengineering/server-token', () => {
  const actual = jest.requireActual('@hcengineering/server-token')
  return {
    ...actual,
    decodeTokenVerbose: jest.fn(),
    decodeToken: jest.fn(),
    generateToken: jest.fn().mockReturnValue('minted-guest-token')
  }
})

const ACCOUNT = 'a1111111-1111-4111-9111-111111111111' as any
const WORKSPACE = 'b2222222-2222-4222-9222-222222222222' as WorkspaceUuid

const TOKENS: Record<string, { account: string, workspace: WorkspaceUuid, extra: Record<string, string> }> = {
  session: { account: ACCOUNT, workspace: WORKSPACE, extra: { token_version: '1' } },
  legacy: { account: ACCOUNT, workspace: WORKSPACE, extra: {} },
  api: { account: ACCOUNT, workspace: WORKSPACE, extra: { apiTokenId: 'tok-1' } },
  service: { account: ACCOUNT, workspace: WORKSPACE, extra: { service: 'telegram-bot' } }
}

const ctx = {
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  newChild: () => ctx
} as unknown as MeasureContext

const activeWorkspace = {
  uuid: WORKSPACE,
  name: 'Test Workspace',
  url: 'test-workspace',
  region: '',
  status: { mode: 'active', isDisabled: false }
}

function makeDb (accountRow: Record<string, any> | null): AccountDB {
  return {
    account: { findOne: jest.fn().mockResolvedValue(accountRow), update: jest.fn() },
    workspace: { findOne: jest.fn().mockResolvedValue(activeWorkspace) },
    invite: {
      insertOne: jest.fn().mockResolvedValue('invite-id'),
      findOne: jest.fn().mockResolvedValue(null),
      update: jest.fn()
    },
    // Present so the same suite keeps working after the integration merge,
    // where wrap() looks up API-token rows outside of its try/catch.
    apiToken: {
      findOne: jest.fn().mockResolvedValue({ id: 'tok-1', revoked: false, expiresOn: Date.now() + 1e9 })
    },
    getWorkspaceRole: jest.fn().mockResolvedValue(AccountRole.Owner),
    getAccountWorkspaces: jest.fn().mockResolvedValue([activeWorkspace]),
    generatePersonUuid: jest.fn().mockResolvedValue('c3333333-3333-4333-9333-333333333333')
  } as unknown as AccountDB
}

const bumped = (): Record<string, any> => ({ uuid: ACCOUNT, tokenVersion: 1, hash: 'h', salt: 's' })
const disabled = (): Record<string, any> => ({
  uuid: ACCOUNT,
  tokenVersion: 1,
  disabledAt: Date.now(),
  hash: 'h',
  salt: 's'
})
const legacyRow = (): Record<string, any> => ({ uuid: ACCOUNT, hash: 'h', salt: 's' })

function rpc (name: 'createAccessLink' | 'getUserWorkspaces'): AccountMethodHandler {
  const method = getMethods()[name]
  if (method === undefined) throw new Error(`method ${name} not registered`)
  return method
}

interface OpCase {
  name: 'createAccessLink' | 'sendInvite' | 'resendInvite' | 'changePassword'
  params: Record<string, any>
  direct: (db: AccountDB, token: string) => Promise<any>
  wrote: (db: AccountDB) => boolean
}

const opCases: OpCase[] = [
  {
    name: 'createAccessLink',
    params: { role: AccountRole.Guest },
    direct: async (db, token) => await createAccessLink(ctx, db, null, token, { role: AccountRole.Guest }),
    wrote: () => (generateToken as jest.Mock).mock.calls.length > 0
  },
  {
    name: 'sendInvite',
    params: { email: 'invitee@example.com', role: AccountRole.User },
    direct: async (db, token) => {
      await sendInvite(ctx, db, null, token, { email: 'invitee@example.com', role: AccountRole.User })
    },
    wrote: (db) => (db.invite.insertOne as jest.Mock).mock.calls.length > 0
  },
  {
    name: 'resendInvite',
    params: { email: 'invitee2@example.com', role: AccountRole.User },
    direct: async (db, token) => {
      await resendInvite(ctx, db, null, token, { email: 'invitee2@example.com', role: AccountRole.User })
    },
    wrote: (db) =>
      (db.invite.insertOne as jest.Mock).mock.calls.length > 0 || (db.invite.update as jest.Mock).mock.calls.length > 0
  },
  {
    name: 'changePassword',
    params: { oldPassword: 'old-password', newPassword: 'new-password-123' },
    direct: async (db, token) => {
      await changePassword(ctx, db, null, token, { oldPassword: 'old-password', newPassword: 'new-password-123' })
    },
    wrote: () => (utils.setPassword as unknown as jest.Mock).mock.calls.length > 0
  }
]

beforeEach(() => {
  jest.clearAllMocks()
  const decode = (token: string): any => {
    const t = TOKENS[token]
    if (t === undefined) throw new Error(`unknown test token ${token}`)
    return { account: t.account, workspace: t.workspace, extra: { ...t.extra } }
  }
  ;(decodeTokenVerbose as jest.Mock).mockImplementation((_ctx: any, token: string) => decode(token))
  ;(decodeToken as jest.Mock).mockImplementation((token: string) => decode(token))
  ;(generateToken as jest.Mock).mockReturnValue('minted-guest-token')
  ;(getMetadata as jest.Mock).mockImplementation((key) => {
    switch (key) {
      case accountPlugin.metadata.MAIL_URL:
        return 'https://mail.example.com'
      case accountPlugin.metadata.MAIL_AUTH_TOKEN:
        return 'mail-auth'
      case accountPlugin.metadata.FrontURL:
        return 'https://app.example.com'
      default:
        return undefined
    }
  })
  global.fetch = jest.fn().mockResolvedValue({ ok: true })
  jest.spyOn(utils, 'verifyPassword').mockReturnValue(true)
  jest.spyOn(utils, 'setPassword').mockResolvedValue()
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe.each(opCases)('$name: token-version enforcement (direct call)', (op) => {
  it('(a) rejects a stale session token (no claim) on a bumped account, without writing', async () => {
    const db = makeDb(bumped())
    await expect(op.direct(db, 'legacy')).rejects.toThrow(TokenError)
    expect(op.wrote(db)).toBe(false)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('rejects a current session token on a disabled account, without writing', async () => {
    const db = makeDb(disabled())
    await expect(op.direct(db, 'session')).rejects.toThrow(TokenError)
    expect(op.wrote(db)).toBe(false)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('(b) accepts a fresh session token', async () => {
    const db = makeDb(bumped())
    await op.direct(db, 'session')
    expect(op.wrote(db)).toBe(true)
  })

  it('(c) accepts an API token without claim on a bumped account (API token semantics unchanged)', async () => {
    const db = makeDb(bumped())
    await op.direct(db, 'api')
    expect(op.wrote(db)).toBe(true)
  })

  it('accepts a legacy token on a never-bumped account', async () => {
    const db = makeDb(legacyRow())
    await op.direct(db, 'legacy')
    expect(op.wrote(db)).toBe(true)
  })
})

describe('through getMethods()/wrap - bearer RPC path', () => {
  // Same call shape as the account-service dispatcher:
  // method(_ctx, db, branding, request, token, meta)
  describe.each(opCases)('$name', (op) => {
    const call = async (db: AccountDB, token: string): Promise<any> => {
      const method = getMethods()[op.name]
      if (method === undefined) throw new Error(`method ${op.name} not registered`)
      return await method(ctx, db, null, { id: 1, params: op.params }, token)
    }

    it('(a) stale session token -> Unauthorized, no write', async () => {
      const db = makeDb(bumped())
      const res = await call(db, 'legacy')
      expect(res.error?.code).toBe(platform.status.Unauthorized)
      expect(op.wrote(db)).toBe(false)
    })

    it('(b) fresh session token -> result, no error', async () => {
      const db = makeDb(bumped())
      const res = await call(db, 'session')
      expect(res.error).toBeUndefined()
      expect(res.id).toBe(1)
      expect(op.wrote(db)).toBe(true)
    })

    it('(c) API token on a bumped account -> result, no error', async () => {
      const db = makeDb(bumped())
      const res = await call(db, 'api')
      expect(res.error).toBeUndefined()
      expect(res.id).toBe(1)
      expect(op.wrote(db)).toBe(true)
    })
  })

  it('createAccessLink returns the minted link through wrap for (b) and (c)', async () => {
    for (const token of ['session', 'api']) {
      const res = await rpc('createAccessLink')(
        ctx,
        makeDb(bumped()),
        null,
        { id: 1, params: { role: AccountRole.Guest } },
        token
      )
      expect(res.result).toBeDefined()
      expect(res.result).toContain('minted-guest-token')
    }
  })
})

describe('wrap passes non-gated RPCs for versionless tokens', () => {
  // Guards invariant 6 (no token-version gate in wrap()): if anyone adds one,
  // these versionless tokens on a bumped account would be rejected here.
  it('(i) UUID-backed service token without claim calls getUserWorkspaces', async () => {
    const db = makeDb({ uuid: ACCOUNT, tokenVersion: 1 })
    const res = await rpc('getUserWorkspaces')(ctx, db, null, { id: 1, params: {} }, 'service')
    expect(res.error).toBeUndefined()
    expect(res.result).toEqual([activeWorkspace])
  })

  it('(ii) API token calls getUserWorkspaces', async () => {
    const db = makeDb({ uuid: ACCOUNT, tokenVersion: 1 })
    const res = await rpc('getUserWorkspaces')(ctx, db, null, { id: 1, params: {} }, 'api')
    expect(res.error).toBeUndefined()
    expect(res.result).toEqual([activeWorkspace])
  })
})
