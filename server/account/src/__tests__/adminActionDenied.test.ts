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
import { setMetadata } from '@hcengineering/platform'
import serverToken, { generateToken } from '@hcengineering/server-token'

import { disableAccount, resetAdminDeniedAuditThrottle } from '../operations'
import { accountPlugin } from '../plugin'
import { createLifecycleDb } from './fixtures/memoryAccountDb'

setMetadata(serverToken.metadata.Secret, 'test-secret')

const ADMIN = 'a1111111-1111-4111-9111-111111111111' as any
const OTHER_ADMIN = 'a2222222-2222-4222-9222-222222222222' as any
const ADMIN_EMAIL = 'admin@example.com'
const OTHER_ADMIN_EMAIL = 'other-admin@example.com'

const ctx = { newChild: () => ctx, info: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as MeasureContext
const adminToken = generateToken(ADMIN, undefined, { admin: 'true' })

function setup (): ReturnType<typeof createLifecycleDb> {
  return createLifecycleDb([
    { uuid: ADMIN, email: ADMIN_EMAIL },
    { uuid: OTHER_ADMIN, email: OTHER_ADMIN_EMAIL }
  ])
}

describe('admin_action_denied audit', () => {
  const envBackup = process.env.ADMIN_EMAILS

  beforeEach(() => {
    jest.clearAllMocks()
    resetAdminDeniedAuditThrottle()
    process.env.ADMIN_EMAILS = `${ADMIN_EMAIL},${OTHER_ADMIN_EMAIL}`
  })

  afterAll(() => {
    process.env.ADMIN_EMAILS = envBackup
  })

  it('records a self-disable attempt', async () => {
    const { db, audit } = setup()
    await expect(disableAccount(ctx, db, null, adminToken, { accountUuid: ADMIN })).rejects.toThrow()
    expect(audit).toEqual([
      {
        adminAccount: ADMIN,
        targetAccount: ADMIN,
        action: 'admin_action_denied',
        workspaceUuid: null,
        details: { reason: 'self_disable', method: 'disableAccount' }
      }
    ])
  })

  it('records a last-admin refusal', async () => {
    const { db, audit } = setup()
    process.env.ADMIN_EMAILS = OTHER_ADMIN_EMAIL
    await expect(disableAccount(ctx, db, null, adminToken, { accountUuid: OTHER_ADMIN })).rejects.toThrow()
    expect(audit).toEqual([
      expect.objectContaining({
        action: 'admin_action_denied',
        targetAccount: OTHER_ADMIN,
        details: { reason: 'last_admin', method: 'disableAccount' }
      })
    ])
  })

  it('throttles repeated refusals of the same kind', async () => {
    const { db, audit } = setup()
    await expect(disableAccount(ctx, db, null, adminToken, { accountUuid: ADMIN })).rejects.toThrow()
    await expect(disableAccount(ctx, db, null, adminToken, { accountUuid: ADMIN })).rejects.toThrow()
    expect(audit).toHaveLength(1)
  })

  it('keeps separate throttle slots per reason', async () => {
    const { db, audit } = setup()
    await expect(disableAccount(ctx, db, null, adminToken, { accountUuid: ADMIN })).rejects.toThrow()
    process.env.ADMIN_EMAILS = OTHER_ADMIN_EMAIL
    await expect(disableAccount(ctx, db, null, adminToken, { accountUuid: OTHER_ADMIN })).rejects.toThrow()
    expect(audit.map((it) => it.details?.reason)).toEqual(['self_disable', 'last_admin'])
  })

  it('never lets a failed audit write mask the refusal', async () => {
    const { db } = setup()
    ;(db.adminAuditLog.insert as jest.Mock).mockRejectedValueOnce(new Error('audit db down'))
    const err = await disableAccount(ctx, db, null, adminToken, { accountUuid: ADMIN }).catch((e) => e)
    expect(err.status.code).toBe(accountPlugin.status.CannotDisableSelf)
    expect(ctx.error).toHaveBeenCalledWith(
      'Failed to write admin audit row',
      expect.objectContaining({ action: 'admin_action_denied', reason: 'self_disable' })
    )
  })

  it('writes nothing for callers without the admin claim', async () => {
    const { db, audit } = setup()
    await expect(disableAccount(ctx, db, null, generateToken(ADMIN), { accountUuid: ADMIN })).rejects.toThrow()
    expect(audit).toHaveLength(0)
  })
})
