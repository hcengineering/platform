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

import { type MeasureContext } from '@hcengineering/core'
import platform, { setMetadata } from '@hcengineering/platform'
import serverToken, { generateToken } from '@hcengineering/server-token'

import { disableAccount, getMethods, resetAdminDeniedAuditThrottle } from '../operations'
import { accountPlugin } from '../plugin'
import { createLifecycleDb } from './fixtures/memoryAccountDb'

setMetadata(serverToken.metadata.Secret, 'test-secret')

const ADMIN = 'a1111111-1111-4111-9111-111111111111' as any
const OTHER_ADMIN = 'a2222222-2222-4222-9222-222222222222' as any
const TARGET = 'a3333333-3333-4333-9333-333333333333' as any
const ADMIN_EMAIL = 'admin@example.com'
const OTHER_ADMIN_EMAIL = 'other-admin@example.com'

const ctx = { newChild: () => ctx, info: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as MeasureContext
const adminToken = generateToken(ADMIN, undefined, { admin: 'true' })

async function codeOf (promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise
  } catch (err: any) {
    return err?.status?.code
  }
  return undefined
}

describe('disableAccount', () => {
  const envBackup = process.env.ADMIN_EMAILS

  beforeEach(() => {
    jest.clearAllMocks()
    resetAdminDeniedAuditThrottle()
    process.env.ADMIN_EMAILS = `${ADMIN_EMAIL},${OTHER_ADMIN_EMAIL}`
  })

  afterAll(() => {
    process.env.ADMIN_EMAILS = envBackup
  })

  function setup (target: Record<string, any> = {}): ReturnType<typeof createLifecycleDb> {
    return createLifecycleDb([
      { uuid: ADMIN, email: ADMIN_EMAIL },
      { uuid: OTHER_ADMIN, email: OTHER_ADMIN_EMAIL },
      { uuid: TARGET, email: 'target@example.com', tokenVersion: 4, ...target }
    ])
  }

  it('disables the account, bumps the version and audits in one lifecycle write', async () => {
    const { db, accounts, audit } = setup()
    await expect(disableAccount(ctx, db, null, adminToken, { accountUuid: TARGET })).resolves.toEqual({ ok: true })

    expect(db.applyAccountLifecycle).toHaveBeenCalledTimes(1)
    expect(db.applyAccountLifecycle).toHaveBeenCalledWith(
      TARGET,
      { disabledAt: expect.any(Number), bumpTokenVersion: true },
      {
        adminAccount: ADMIN,
        targetAccount: TARGET,
        action: 'disable',
        workspaceUuid: null,
        details: { reason: 'manual_admin_action' }
      }
    )
    // State and audit are never written outside the lifecycle write.
    expect(db.account.update).not.toHaveBeenCalled()
    expect(db.adminAuditLog.insert).not.toHaveBeenCalled()
    expect(accounts.get(TARGET)).toEqual(expect.objectContaining({ tokenVersion: 5, disabledAt: expect.any(Number) }))
    expect(audit).toHaveLength(1)
  })

  it('is a no-op on an already disabled account', async () => {
    const { db, accounts, audit } = setup({ disabledAt: 123 })
    await expect(disableAccount(ctx, db, null, adminToken, { accountUuid: TARGET })).resolves.toEqual({ ok: true })
    expect(db.applyAccountLifecycle).not.toHaveBeenCalled()
    expect(accounts.get(TARGET)).toEqual(expect.objectContaining({ tokenVersion: 4, disabledAt: 123 }))
    expect(audit).toEqual([expect.objectContaining({ action: 'disable', details: { noop: true } })])
  })

  it('refuses to disable the caller', async () => {
    const { db } = setup()
    const code = await codeOf(disableAccount(ctx, db, null, adminToken, { accountUuid: ADMIN }))
    expect(code).toBe(accountPlugin.status.CannotDisableSelf)
    expect(db.applyAccountLifecycle).not.toHaveBeenCalled()
  })

  it('refuses to disable the last active admin', async () => {
    const { db } = setup()
    process.env.ADMIN_EMAILS = OTHER_ADMIN_EMAIL
    const code = await codeOf(disableAccount(ctx, db, null, adminToken, { accountUuid: OTHER_ADMIN }))
    expect(code).toBe(accountPlugin.status.LastAdmin)
    expect(db.applyAccountLifecycle).not.toHaveBeenCalled()
  })

  it('allows disabling an admin while another admin stays active', async () => {
    const { db } = setup()
    await expect(disableAccount(ctx, db, null, adminToken, { accountUuid: OTHER_ADMIN })).resolves.toEqual({
      ok: true
    })
  })

  it('compensates atomically when a concurrent disable left no active admin', async () => {
    const { db, accounts, audit } = setup()
    process.env.ADMIN_EMAILS = `${OTHER_ADMIN_EMAIL},third@example.com`
    const THIRD = 'a4444444-4444-4444-9444-444444444444' as any
    const third = { uuid: THIRD, disabledAt: null as number | null, tokenVersion: 0 }
    accounts.set(THIRD, third)
    ;(db.socialId.findOne as jest.Mock).mockImplementation(async (q: any) =>
      q.value === 'third@example.com' ? { personUuid: THIRD, type: 'email', value: q.value } : null
    )
    // The other admin gets disabled concurrently right after our write.
    const apply = db.applyAccountLifecycle as jest.Mock
    const original = apply.getMockImplementation()
    apply.mockImplementation(async (...args: any[]) => {
      await original?.(...args)
      if (apply.mock.calls.length === 1) third.disabledAt = 999
    })

    const code = await codeOf(disableAccount(ctx, db, null, adminToken, { accountUuid: OTHER_ADMIN }))
    expect(code).toBe(accountPlugin.status.LastAdmin)
    expect(apply).toHaveBeenCalledTimes(2)
    expect(apply.mock.calls[1]).toEqual([
      OTHER_ADMIN,
      { disabledAt: null, bumpTokenVersion: false },
      expect.objectContaining({ action: 'admin_action_denied', details: { reason: 'last_admin', rollback: true } })
    ])
    // Re-enabled, but the bumped version is kept.
    expect(accounts.get(OTHER_ADMIN)).toEqual(expect.objectContaining({ disabledAt: null, tokenVersion: 1 }))
    expect(audit.map((it) => it.action)).toEqual(['disable', 'admin_action_denied'])
  })

  it('propagates a failed lifecycle write and does not fall back to separate writes', async () => {
    const { db } = setup()
    ;(db.applyAccountLifecycle as jest.Mock).mockRejectedValueOnce(new Error('audit insert failed'))
    await expect(disableAccount(ctx, db, null, adminToken, { accountUuid: TARGET })).rejects.toThrow(
      'audit insert failed'
    )
    expect(db.account.update).not.toHaveBeenCalled()
    expect(db.adminAuditLog.insert).not.toHaveBeenCalled()
  })

  it('reports an unknown account', async () => {
    const { db } = setup()
    const code = await codeOf(
      disableAccount(ctx, db, null, adminToken, { accountUuid: 'a9999999-9999-4999-9999-999999999999' as any })
    )
    expect(code).toBe(platform.status.AccountNotFound)
  })

  it('rejects a missing account uuid', async () => {
    const { db } = setup()
    const code = await codeOf(disableAccount(ctx, db, null, adminToken, {} as any))
    expect(code).toBe(platform.status.BadRequest)
  })

  it('requires the admin claim', async () => {
    const { db, audit } = setup()
    const code = await codeOf(disableAccount(ctx, db, null, generateToken(ADMIN), { accountUuid: TARGET }))
    expect(code).toBe(platform.status.Forbidden)
    expect(audit).toHaveLength(0)
  })

  it('is registered and reachable through wrap()', async () => {
    const { db } = setup()
    const res = await getMethods().disableAccount?.(
      ctx,
      db,
      null,
      { id: 1, params: { accountUuid: TARGET } },
      adminToken
    )
    expect(res).toEqual({ id: 1, result: { ok: true } })
  })
})
