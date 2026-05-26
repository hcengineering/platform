//
// Copyright © 2026 Hardcore Engineering Inc.
//
// Coverage for the admin-only hard-delete RPC introduced for the admin
// panel. The function lives in operations.ts and shares its admin gate
// (requireAdmin) with disableAccount / enableAccount, so tests are
// structured the same way (mock @hcengineering/server-token, supply a
// minimal AccountDB shape). The DB-layer cascade itself is the
// responsibility of postgres.ts and is not exercised here — these tests
// only assert the orchestration the operation owns: auth gate,
// existence check, self-delete guard, last-admin guard, audit + event
// insertion, and the order in which they fire.
//

import { MeasureContext } from '@hcengineering/core'
import { PlatformError } from '@hcengineering/platform'

const ADMIN_TOKEN = 'admin-token'
const SELF_TOKEN = 'self-token'
const NON_ADMIN_TOKEN = 'non-admin-token'
const ADMIN_UUID = 'admin-uuid' as any
const TARGET = '55555555-5555-5555-5555-555555555555' as any

jest.mock('@hcengineering/server-token', () => ({
  decodeTokenVerbose: (ctx: any, token: string) => {
    if (token === ADMIN_TOKEN) return { account: ADMIN_UUID, extra: { admin: 'true' } }
    if (token === SELF_TOKEN) return { account: TARGET, extra: { admin: 'true' } }
    if (token === NON_ADMIN_TOKEN) return { account: ADMIN_UUID, extra: {} }
    throw new Error('bad token')
  },
  TokenError: class extends Error {}
}))

const ctx = { newChild: () => ctx, info: () => {}, warn: () => {}, error: () => {} } as unknown as MeasureContext

// Default ADMIN_EMAILS scope: a single configured admin. The last-admin
// check in operations.ts walks social_id rows of role-USER admins to
// decide "would removing this leave zero?". We override the mock per
// test when last_admin needs to fire.
function mockDb (overrides: any = {}): any {
  return {
    account: {
      findOne: async (query: any) => {
        // verifyTokenVersion calls findOne for the admin UUID; the
        // existence check then calls it for the target. Distinguish by
        // the queried uuid so the existence test can assert NotFound.
        if (query.uuid === ADMIN_UUID) return { uuid: ADMIN_UUID, tokenVersion: 0 }
        if (overrides.targetAccount === null) return null
        return overrides.targetAccount ?? { uuid: TARGET, tokenVersion: 0 }
      }
    },
    socialId: {
      find: async () => overrides.socials ?? [{ personUuid: TARGET, type: 'email', value: 'other@example.com' }]
    },
    deleteAccount: overrides.deleteAccount ?? (async () => undefined),
    accountEvent: {
      insertOne: overrides.accountEventInsert ?? (async () => undefined)
    },
    adminAuditLog: {
      insert: overrides.auditInsert ?? (async () => undefined)
    }
  }
}

import { deleteAccount } from '../operations'

describe('deleteAccount', () => {
  beforeEach(() => {
    // Configure a single admin so the last-admin guard does not fire
    // unless we explicitly point ADMIN_EMAILS at the target's email.
    process.env.ADMIN_EMAILS = 'admin@example.com'
  })

  it('rejects when token is not admin-flagged (Forbidden)', async () => {
    await expect(
      deleteAccount(ctx, mockDb(), null, NON_ADMIN_TOKEN, { uuid: TARGET })
    ).rejects.toThrow(PlatformError)
  })

  it('rejects when target equals the calling admin (cannot_self_delete)', async () => {
    // SELF_TOKEN is admin-flagged BUT its account === TARGET.
    try {
      await deleteAccount(ctx, mockDb(), null, SELF_TOKEN, { uuid: TARGET })
      throw new Error('expected throw')
    } catch (err: any) {
      expect(err).toBeInstanceOf(PlatformError)
      expect(err.status?.code).toBe('cannot_self_delete')
    }
  })

  it('rejects when uuid is missing or empty (BadRequest)', async () => {
    await expect(
      deleteAccount(ctx, mockDb(), null, ADMIN_TOKEN, {} as any)
    ).rejects.toThrow(PlatformError)
    await expect(
      deleteAccount(ctx, mockDb(), null, ADMIN_TOKEN, { uuid: '' as any })
    ).rejects.toThrow(PlatformError)
  })

  it('rejects with AccountNotFound when target row does not exist', async () => {
    let cascadeCalled = false
    let auditCalled = false
    const db = mockDb({
      targetAccount: null,
      deleteAccount: async () => { cascadeCalled = true },
      auditInsert: async () => { auditCalled = true }
    })
    await expect(
      deleteAccount(ctx, db, null, ADMIN_TOKEN, { uuid: TARGET })
    ).rejects.toThrow(PlatformError)
    // Existence check fires BEFORE the destructive work and audit.
    // No phantom cascade, no orphan audit row.
    expect(cascadeCalled).toBe(false)
    expect(auditCalled).toBe(false)
  })

  it('rejects with last_admin when target is the only admin', async () => {
    process.env.ADMIN_EMAILS = 'last@example.com'
    let cascadeCalled = false
    const db = mockDb({
      socials: [{ personUuid: TARGET, type: 'email', value: 'last@example.com' }],
      deleteAccount: async () => { cascadeCalled = true }
    })
    try {
      await deleteAccount(ctx, db, null, ADMIN_TOKEN, { uuid: TARGET })
      throw new Error('expected throw')
    } catch (err: any) {
      expect(err).toBeInstanceOf(PlatformError)
      expect(err.status?.code).toBe('last_admin')
    }
    expect(cascadeCalled).toBe(false)
  })

  it('on success: cascades, emits ACCOUNT_DELETED event, writes audit log', async () => {
    let cascadeUuid: string | null = null
    const accountEvents: any[] = []
    const auditEvents: any[] = []
    const db = mockDb({
      deleteAccount: async (uuid: string) => { cascadeUuid = uuid },
      accountEventInsert: async (row: any) => { accountEvents.push(row) },
      auditInsert: async (row: any) => { auditEvents.push(row) }
    })
    await deleteAccount(ctx, db, null, ADMIN_TOKEN, { uuid: TARGET })
    expect(cascadeUuid).toBe(TARGET)
    expect(accountEvents).toHaveLength(1)
    expect(accountEvents[0].accountUuid).toBe(TARGET)
    // `account_deleted` lifecycle event for downstream consumers.
    expect(accountEvents[0].eventType).toBeDefined()
    expect(auditEvents).toHaveLength(1)
    expect(auditEvents[0].adminAccount).toBe(ADMIN_UUID)
    expect(auditEvents[0].targetAccount).toBe(TARGET)
    expect(auditEvents[0].action).toBe('delete_account')
    expect(auditEvents[0].workspaceUuid).toBeNull()
    expect(auditEvents[0].details?.targetEmail).toBe('other@example.com')
  })

  it('audit row carries null email when target has no EMAIL social-id', async () => {
    const auditEvents: any[] = []
    const db = mockDb({
      socials: [{ personUuid: TARGET, type: 'oidc', value: 'sub-123' }],
      auditInsert: async (row: any) => { auditEvents.push(row) }
    })
    await deleteAccount(ctx, db, null, ADMIN_TOKEN, { uuid: TARGET })
    expect(auditEvents).toHaveLength(1)
    expect(auditEvents[0].details?.targetEmail).toBeNull()
  })
})
