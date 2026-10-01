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

import { AccountRole, type MeasureContext } from '@hcengineering/core'
import platform, { setMetadata } from '@hcengineering/platform'
import serverToken, { generateToken } from '@hcengineering/server-token'

import { disableAccount, enableAccount, getMethods } from '../operations'
import { accountPlugin } from '../plugin'
import type { AccountDB, AccountMethodHandler } from '../types'
import { generateTokenWithVersion } from '../utils'
import { createLifecycleDb } from './fixtures/memoryAccountDb'

setMetadata(serverToken.metadata.Secret, 'test-secret')

const ADMIN = 'a1111111-1111-4111-9111-111111111111' as any
const TARGET = 'a3333333-3333-4333-9333-333333333333' as any
const WS = 'b1111111-1111-4111-9111-111111111111' as any

const ctx = { newChild: () => ctx, info: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as MeasureContext
const adminToken = generateToken(ADMIN, undefined, { admin: 'true' })

describe('enableAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    delete process.env.ADMIN_EMAILS
  })

  it('clears disabledAt, bumps the version and audits in one lifecycle write', async () => {
    const { db, accounts } = createLifecycleDb([{ uuid: ADMIN }, { uuid: TARGET, disabledAt: 123, tokenVersion: 5 }])
    await expect(enableAccount(ctx, db, null, adminToken, { accountUuid: TARGET })).resolves.toEqual({ ok: true })
    expect(db.applyAccountLifecycle).toHaveBeenCalledWith(
      TARGET,
      { disabledAt: null, bumpTokenVersion: true },
      { adminAccount: ADMIN, targetAccount: TARGET, action: 'enable', workspaceUuid: null, details: null }
    )
    expect(db.account.update).not.toHaveBeenCalled()
    expect(accounts.get(TARGET)).toEqual(expect.objectContaining({ disabledAt: null, tokenVersion: 6 }))
  })

  it('is a no-op on an active account: no state change, no version bump', async () => {
    const { db, accounts, audit } = createLifecycleDb([{ uuid: ADMIN }, { uuid: TARGET, tokenVersion: 2 }])
    await expect(enableAccount(ctx, db, null, adminToken, { accountUuid: TARGET })).resolves.toEqual({ ok: true })
    expect(db.applyAccountLifecycle).not.toHaveBeenCalled()
    expect(accounts.get(TARGET)).toEqual(expect.objectContaining({ disabledAt: null, tokenVersion: 2 }))
    expect(audit).toEqual([
      { adminAccount: ADMIN, targetAccount: TARGET, action: 'enable', workspaceUuid: null, details: { noop: true } }
    ])
  })

  it('propagates a failed lifecycle write', async () => {
    const { db } = createLifecycleDb([{ uuid: ADMIN }, { uuid: TARGET, disabledAt: 123 }])
    ;(db.applyAccountLifecycle as jest.Mock).mockRejectedValueOnce(new Error('boom'))
    await expect(enableAccount(ctx, db, null, adminToken, { accountUuid: TARGET })).rejects.toThrow('boom')
    expect(db.adminAuditLog.insert).not.toHaveBeenCalled()
  })

  it('requires the admin claim', async () => {
    const { db } = createLifecycleDb([{ uuid: ADMIN }, { uuid: TARGET, disabledAt: 123 }])
    const err = await enableAccount(ctx, db, null, generateToken(ADMIN), { accountUuid: TARGET }).catch((e) => e)
    expect(err.status.code).toBe(platform.status.Forbidden)
  })

  it('is registered and reachable through wrap()', async () => {
    const { db } = createLifecycleDb([{ uuid: ADMIN }, { uuid: TARGET, disabledAt: 123 }])
    const res = await getMethods().enableAccount?.(
      ctx,
      db,
      null,
      { id: 1, params: { accountUuid: TARGET } },
      adminToken
    )
    expect(res).toEqual({ id: 1, result: { ok: true } })
  })
})

describe('disable -> enable round trip', () => {
  const EMAIL = 'target@example.com'
  const unauthorized = { error: expect.objectContaining({ code: platform.status.Unauthorized }) }

  // Lifecycle DB plus the workspace/person data the session paths need.
  function makeDb (): AccountDB {
    const { db } = createLifecycleDb([{ uuid: ADMIN }, { uuid: TARGET, tokenVersion: 0, email: EMAIL }])
    const workspace = { uuid: WS, url: 'ws-url', name: 'WS', region: '' }
    const status = { mode: 'active', versionMajor: 0, versionMinor: 0, versionPatch: 0, processingProgress: 100 }
    return Object.assign(db, {
      person: { findOne: jest.fn(async () => ({ uuid: TARGET, firstName: 'Tar', lastName: 'Get' })) },
      workspace: { findOne: jest.fn(async () => workspace) },
      workspaceStatus: {
        findOne: jest.fn(async () => ({ workspaceUuid: WS, ...status, isDisabled: false })),
        update: jest.fn(async () => undefined)
      },
      getWorkspaceRole: jest.fn(async () => AccountRole.User),
      getWorkspaceRoles: jest.fn(async () => new Map([[WS, AccountRole.User]])),
      getAccountWorkspaces: jest.fn(async () => [{ ...workspace, status }])
    })
  }

  // Every call goes through getMethods()/wrap(), exactly like the
  // account-service RPC dispatcher (and therefore the transactor's
  // getLoginInfoByToken revocation check and WebSocket session lookup).
  async function rpc (db: AccountDB, method: string, token: string, params: any = {}): Promise<any> {
    const handler = (getMethods() as Record<string, AccountMethodHandler>)[method]
    return await handler(ctx, db, null, { id: 1, params }, token)
  }

  // The token-version-checked session paths plus one ordinary wrapped RPC.
  async function callAll (db: AccountDB, token: string): Promise<any[]> {
    return [
      await rpc(db, 'getLoginInfoByToken', token),
      await rpc(db, 'getLoginWithWorkspaceInfo', token),
      await rpc(db, 'selectWorkspace', token, { workspaceUrl: 'ws-url', kind: 'external' }),
      await rpc(db, 'getUserWorkspaces', token)
    ]
  }

  function expectAccepted (results: any[]): void {
    const [loginInfo, wsInfo, selected, workspaces] = results
    expect(loginInfo).toEqual({ id: 1, result: expect.objectContaining({ account: TARGET, workspace: WS }) })
    expect(wsInfo).toEqual({ id: 1, result: expect.objectContaining({ account: TARGET }) })
    expect(Object.keys(wsInfo.result.workspaces)).toEqual([WS])
    expect(selected).toEqual({ id: 1, result: expect.objectContaining({ account: TARGET, workspace: WS }) })
    expect(workspaces).toEqual({ id: 1, result: [expect.objectContaining({ uuid: WS })] })
  }

  function expectRejected (results: any[]): void {
    for (const result of results) {
      expect(result).toEqual(unauthorized)
    }
  }

  beforeAll(() => {
    setMetadata(accountPlugin.metadata.Transactors, 'http://tx:3000;http://tx:3000;')
  })

  it('rejects the old session token and accepts API and service tokens again after enable', async () => {
    const db = makeDb()
    const sessionBefore = await generateTokenWithVersion(ctx, db, TARGET, WS)
    const apiToken = generateToken(TARGET, WS, { apiTokenId: 'api-1' })
    const serviceToken = generateToken(TARGET, WS, { service: 'telegram-bot' })

    for (const token of [sessionBefore, apiToken, serviceToken]) {
      expectAccepted(await callAll(db, token))
    }

    await disableAccount(ctx, db, null, adminToken, { accountUuid: TARGET })
    // While disabled every token kind is rejected on every path.
    for (const token of [sessionBefore, apiToken, serviceToken]) {
      expectRejected(await callAll(db, token))
    }

    await enableAccount(ctx, db, null, adminToken, { accountUuid: TARGET })
    expect((await db.account.findOne({ uuid: TARGET }))?.tokenVersion).toBe(2)

    // The pre-disable session token stays invalid on every version-checked
    // session path (wrap() itself has no version gate by design)...
    expectRejected((await callAll(db, sessionBefore)).slice(0, 3))
    // ...while API and user-scoped service tokens (no version claim) work again.
    expectAccepted(await callAll(db, apiToken))
    expectAccepted(await callAll(db, serviceToken))

    // A session issued after enable works, and so does the workspace token
    // selectWorkspace mints from it.
    const sessionAfter = await generateTokenWithVersion(ctx, db, TARGET, WS)
    expectAccepted(await callAll(db, sessionAfter))
    const selected = await rpc(db, 'selectWorkspace', sessionAfter, { workspaceUrl: 'ws-url', kind: 'external' })
    expectAccepted(await callAll(db, selected.result.token))
  })
})
