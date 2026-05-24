import { MeasureContext, AccountUuid, WorkspaceUuid } from '@hcengineering/core'
import { PlatformError } from '@hcengineering/platform'

jest.mock('@hcengineering/server-token', () => ({
  decodeTokenVerbose: (_c: any, t: string) =>
    t === 'admin'
      ? { account: 'admin-uuid', extra: { admin: 'true' } }
      : { account: 'u', extra: {} },
  TokenError: class extends Error {}
}))
jest.mock('../utils', () => ({
  ...jest.requireActual('../utils'),
  verifyTokenVersion: jest.fn(async () => undefined)
}))

const ctx = { newChild: () => ctx, info: () => {}, warn: () => {}, error: () => {} } as unknown as MeasureContext

import { listAuditAdmin } from '../serviceOperations'

const fakeEntries = [
  {
    id: 'e1',
    tsMs: 1700000001000,
    adminAccount: 'admin-uuid' as AccountUuid,
    targetAccount: 'user-uuid' as AccountUuid,
    workspaceUuid: null,
    action: 'disable',
    details: null,
    adminFirstName: 'Test',
    adminLastName: 'Admin',
    targetFirstName: 'Target',
    targetLastName: 'User',
    targetWsName: undefined,
    targetWsUrl: undefined
  }
]

function makeDb (entries = fakeEntries, nextCursor: string | null = null): any {
  return {
    account: {
      findOne: async (q: any) => q.uuid === 'admin-uuid' ? { uuid: 'admin-uuid', disabledAt: null, tokenVersion: 0, hash: null } : null
    },
    socialId: {
      find: async () => [{ personUuid: 'admin-uuid', type: 'email', value: 'admin@test.example.com', verifiedOn: 1 }]
    },
    adminAuditLog: {
      listAuditAdmin: jest.fn(async (_params: any) => ({ entries, nextCursor }))
    }
  }
}

describe('listAuditAdmin', () => {
  it('rejects non-admin token', async () => {
    await expect(listAuditAdmin(ctx, makeDb(), null, 'user-token', {})).rejects.toThrow(PlatformError)
  })

  it('returns entries for admin token', async () => {
    const db = makeDb()
    const result = await listAuditAdmin(ctx, db, null, 'admin', {})
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].id).toBe('e1')
    expect(result.entries[0].admin.uuid).toBe('admin-uuid')
    expect(result.entries[0].action).toBe('disable')
    expect(result.nextCursor).toBeNull()
  })

  it('passes filter params to db', async () => {
    const db = makeDb()
    await listAuditAdmin(ctx, db, null, 'admin', {
      filter: {
        targetAccountUuid: 'user-uuid' as AccountUuid,
        action: 'disable',
        from: 1000000
      },
      pagination: { limit: 25 }
    })
    expect(db.adminAuditLog.listAuditAdmin).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: expect.objectContaining({
          targetAccountUuid: 'user-uuid',
          action: 'disable',
          from: 1000000
        }),
        limit: 25
      })
    )
  })

  it('maps targetWorkspace when workspaceUuid is present', async () => {
    const entries = [{
      id: 'e2',
      tsMs: 1700000002000,
      adminAccount: 'admin-uuid' as AccountUuid,
      targetAccount: null,
      workspaceUuid: 'ws-uuid' as WorkspaceUuid,
      action: 'archive_workspace',
      details: null,
      adminFirstName: 'Test',
      adminLastName: 'Admin',
      targetWsName: 'My WS',
      targetWsUrl: 'my-ws'
    }]
    const db = makeDb(entries as any)
    const result = await listAuditAdmin(ctx, db, null, 'admin', {})
    expect(result.entries[0].targetWorkspace?.uuid).toBe('ws-uuid')
    expect(result.entries[0].targetWorkspace?.name).toBe('My WS')
    expect(result.entries[0].targetAccount).toBeUndefined()
  })

  it('passes nextCursor through', async () => {
    const cursor = Buffer.from('1700000001000_e1').toString('base64')
    const db = makeDb(fakeEntries, cursor)
    const result = await listAuditAdmin(ctx, db, null, 'admin', {})
    expect(result.nextCursor).toBe(cursor)
  })
})
