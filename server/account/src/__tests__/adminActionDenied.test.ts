//
// Copyright © 2026 Hardcore Engineering Inc.
//
// V13 — admin_action_denied audit (reduced scope: self_disable + last_admin)
//

import { MeasureContext, SocialIdType } from '@hcengineering/core'

const ADMIN = 'admin-uuid'
const ADMIN_EMAIL = 'admin@example.com'
const OTHER_ADMIN = 'other-admin-uuid'
const OTHER_ADMIN_EMAIL = 'other-admin@example.com'
const TARGET = '44444444-4444-4444-4444-444444444444' as any
const TARGET_EMAIL = 'target@example.com'
const ADMIN_TOKEN = 'admin-token'
const NON_ADMIN_TOKEN = 'non-admin-token'

jest.mock('@hcengineering/server-token', () => ({
  decodeTokenVerbose: (_ctx: any, token: string) => {
    if (token === ADMIN_TOKEN) return { account: ADMIN, extra: { admin: 'true' } }
    if (token === NON_ADMIN_TOKEN) return { account: 'regular-uuid', extra: {} }
    throw new Error('bad token')
  },
  TokenError: class extends Error {}
}))

jest.mock('../utils', () => ({
  ...jest.requireActual('../utils'),
  verifyTokenVersion: jest.fn(async () => undefined)
}))

const ctx = { newChild: () => ctx, info: () => {}, warn: () => {}, error: () => {} } as unknown as MeasureContext

// Inline mock DB — matches the pattern used by disableAccount.test.ts. Holds
// the audit rows so the test can assert on what was inserted.
//
// IMPORTANT: socialId needs BOTH find() (used by disableAccountInternal to
// look up the target's email) AND findOne() (used by isLastAdmin to look
// up each ADMIN_EMAILS entry).
function mockDb (opts: {
  adminEmails?: string[]
  targetAccount?: any
  targetEmail?: string
  insertAudit?: jest.Mock
}): { auditRows: any[], insertAudit: jest.Mock, db: any } {
  const auditRows: any[] = []
  const insertAudit = opts.insertAudit ?? jest.fn(async (row: any) => { auditRows.push(row) })
  // Map of email value → socialId, used by findOne lookups during isLastAdmin
  const socialIdByValue: Record<string, any> = {
    [ADMIN_EMAIL]: { personUuid: ADMIN, type: SocialIdType.EMAIL, value: ADMIN_EMAIL },
    [OTHER_ADMIN_EMAIL]: { personUuid: OTHER_ADMIN, type: SocialIdType.EMAIL, value: OTHER_ADMIN_EMAIL },
    [opts.targetEmail ?? TARGET_EMAIL]: { personUuid: opts.targetAccount?.uuid ?? TARGET, type: SocialIdType.EMAIL, value: opts.targetEmail ?? TARGET_EMAIL }
  }
  return {
    auditRows,
    insertAudit,
    db: {
      account: {
        findOne: async ({ uuid }: any) => {
          if (opts.targetAccount != null && uuid === opts.targetAccount.uuid) return opts.targetAccount
          if (uuid === TARGET) return { uuid: TARGET, email: TARGET_EMAIL, tokenVersion: 0 }
          if (uuid === ADMIN) return { uuid: ADMIN, email: ADMIN_EMAIL, tokenVersion: 0 }
          if (uuid === OTHER_ADMIN) return { uuid: OTHER_ADMIN, email: OTHER_ADMIN_EMAIL, tokenVersion: 0 }
          return null
        },
        update: async () => undefined
      },
      socialId: {
        find: async ({ personUuid }: any) => {
          const email =
            personUuid === ADMIN
              ? ADMIN_EMAIL
              : personUuid === OTHER_ADMIN
                ? OTHER_ADMIN_EMAIL
                : opts.targetEmail ?? TARGET_EMAIL
          return [{ personUuid, type: SocialIdType.EMAIL, value: email }]
        },
        // isLastAdmin uses findOne({type, value}) keyed on email
        findOne: async ({ type, value }: any) => {
          if (type !== SocialIdType.EMAIL) return null
          return socialIdByValue[value] ?? null
        }
      },
      adminAuditLog: { insert: insertAudit }
    }
  }
}

const deps: any = {}

describe('V13 — admin_action_denied audit', () => {
  let envBackup: string | undefined
  beforeEach(() => {
    envBackup = process.env.ADMIN_EMAILS
    process.env.ADMIN_EMAILS = `${ADMIN_EMAIL},${OTHER_ADMIN_EMAIL}`
    // Clear the in-process rate-limit map between tests. The map is a
    // module-level const so we re-require the module fresh.
    jest.resetModules()
  })
  afterEach(() => {
    if (envBackup === undefined) delete process.env.ADMIN_EMAILS
    else process.env.ADMIN_EMAILS = envBackup
  })

  test('self-disable: writes admin_action_denied + throws cannot_self_disable', async () => {
    const { db, auditRows } = mockDb({})
    const { disableAccount } = await import('../operations')
    await expect(
      disableAccount(ctx, db, null, deps, ADMIN_TOKEN, { accountUuid: ADMIN as any })
    ).rejects.toThrow(/cannot_self_disable/)
    const denied = auditRows.filter((r) => r.action === 'admin_action_denied')
    expect(denied).toHaveLength(1)
    expect(denied[0].details.reason).toBe('self_disable')
    expect(denied[0].details.method).toBe('disableAccount')
    expect(denied[0].adminAccount).toBe(ADMIN)
  })

  test('last_admin: writes admin_action_denied + throws last_admin', async () => {
    // Only OTHER_ADMIN_EMAIL in ADMIN_EMAILS → disabling OTHER_ADMIN leaves zero
    process.env.ADMIN_EMAILS = OTHER_ADMIN_EMAIL
    const { db, auditRows } = mockDb({
      targetAccount: { uuid: OTHER_ADMIN, email: OTHER_ADMIN_EMAIL, tokenVersion: 0 },
      targetEmail: OTHER_ADMIN_EMAIL
    })
    const { disableAccount } = await import('../operations')
    await expect(
      disableAccount(ctx, db, null, deps, ADMIN_TOKEN, { accountUuid: OTHER_ADMIN as any })
    ).rejects.toThrow(/last_admin/)
    const denied = auditRows.filter((r) => r.action === 'admin_action_denied')
    expect(denied.some((r) => r.details.reason === 'last_admin')).toBe(true)
  })

  test('rate-limit: two self-disable attempts within 1h → only one audit row', async () => {
    const { db, auditRows } = mockDb({})
    const { disableAccount } = await import('../operations')
    await expect(
      disableAccount(ctx, db, null, deps, ADMIN_TOKEN, { accountUuid: ADMIN as any })
    ).rejects.toThrow()
    await expect(
      disableAccount(ctx, db, null, deps, ADMIN_TOKEN, { accountUuid: ADMIN as any })
    ).rejects.toThrow()
    const denied = auditRows.filter((r) => r.action === 'admin_action_denied')
    expect(denied).toHaveLength(1)
  })

  test('rate-limit key includes reason: self_disable then last_admin → two rows', async () => {
    const { db, auditRows } = mockDb({})
    const { disableAccount } = await import('../operations')
    await expect(
      disableAccount(ctx, db, null, deps, ADMIN_TOKEN, { accountUuid: ADMIN as any })
    ).rejects.toThrow()
    // Trigger last_admin against OTHER_ADMIN with single-admin env
    process.env.ADMIN_EMAILS = OTHER_ADMIN_EMAIL
    const { db: db2, auditRows: rows2 } = mockDb({
      targetAccount: { uuid: OTHER_ADMIN, email: OTHER_ADMIN_EMAIL, tokenVersion: 0 },
      targetEmail: OTHER_ADMIN_EMAIL
    })
    await expect(
      disableAccount(ctx, db2, null, deps, ADMIN_TOKEN, { accountUuid: OTHER_ADMIN as any })
    ).rejects.toThrow()
    const allRows = [
      ...auditRows.filter((r) => r.action === 'admin_action_denied'),
      ...rows2.filter((r) => r.action === 'admin_action_denied')
    ]
    const reasons = allRows.map((r) => r.details.reason).sort()
    expect(reasons).toEqual(['last_admin', 'self_disable'])
  })

  test('rate-limit key includes method: single then bulk-with-self → two rows', async () => {
    const { db, auditRows } = mockDb({})
    const { disableAccount } = await import('../operations')
    const { bulkSetDisabled } = await import('../serviceOperations')
    // 1) Single self-disable → reason='self_disable', method='disableAccount'
    await expect(
      disableAccount(ctx, db, null, deps, ADMIN_TOKEN, { accountUuid: ADMIN as any })
    ).rejects.toThrow()
    // 2) Bulk including ADMIN. bulkLoop filters self BEFORE op() runs, so
    //    disableAccountInternal never gets called for ADMIN. The audit-write
    //    fires from the pre-bulkLoop instrumentation in bulkSetDisabled
    //    instead (v3 fix). Returned BulkResult has failed=[{accountUuid: ADMIN, ...}].
    const result = await bulkSetDisabled(ctx, db, null, deps, ADMIN_TOKEN, {
      accountUuids: [ADMIN as any],
      disabled: true
    })
    expect(result.failed.some((f: any) => f.accountUuid === ADMIN)).toBe(true)
    // Both single and bulk self-disable attempts are now audited with
    // distinct method names.
    const denied = auditRows.filter((r) => r.action === 'admin_action_denied' && r.details.reason === 'self_disable')
    const methods = denied.map((r) => r.details.method).sort()
    expect(methods).toEqual(['bulkSetDisabled', 'disableAccount'])
  })

  test('pre-auth Forbidden (no admin claim): NO audit row', async () => {
    const { db, auditRows } = mockDb({})
    const { disableAccount } = await import('../operations')
    await expect(
      disableAccount(ctx, db, null, deps, NON_ADMIN_TOKEN, { accountUuid: TARGET })
    ).rejects.toThrow()
    const denied = auditRows.filter((r) => r.action === 'admin_action_denied')
    expect(denied).toHaveLength(0)
  })

  test('bulk-non-self last_admin denial is tagged method="bulkSetDisabled"', async () => {
    // OTHER_ADMIN is the only entry in ADMIN_EMAILS. Bulk-disable OTHER_ADMIN
    // (not the caller). bulkLoop calls disableAccountInternal for that target;
    // isLastAdmin returns true; the audit-write fires with the explicit
    // methodName='bulkSetDisabled' passed by bulkSetDisabled.
    process.env.ADMIN_EMAILS = OTHER_ADMIN_EMAIL
    const { db, auditRows } = mockDb({
      targetAccount: { uuid: OTHER_ADMIN, email: OTHER_ADMIN_EMAIL, tokenVersion: 0 },
      targetEmail: OTHER_ADMIN_EMAIL
    })
    const { bulkSetDisabled } = await import('../serviceOperations')
    const result = await bulkSetDisabled(ctx, db, null, deps, ADMIN_TOKEN, {
      accountUuids: [OTHER_ADMIN as any],
      disabled: true
    })
    // bulkLoop catches the last_admin throw and records the per-target failure
    expect(result.failed.some((f: any) => f.accountUuid === OTHER_ADMIN)).toBe(true)
    // The audit row carries the bulk method tag, not the default
    const denied = auditRows.filter((r) => r.action === 'admin_action_denied' && r.details.reason === 'last_admin')
    expect(denied).toHaveLength(1)
    expect(denied[0].details.method).toBe('bulkSetDisabled')
  })
})
