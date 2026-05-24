//
// Copyright © 2026 Hardcore Engineering Inc.
//

import { MeasureContext } from '@hcengineering/core'
import { PlatformError } from '@hcengineering/platform'

const ADMIN_TOKEN = 'admin-token'
const USER_TOKEN = 'user-token'
const TARGET_UUID = '33333333-3333-3333-3333-333333333333' as any

jest.mock('@hcengineering/server-token', () => ({
  decodeTokenVerbose: (ctx: any, token: string) => {
    if (token === ADMIN_TOKEN) return { account: 'admin-uuid', extra: { admin: 'true' } }
    if (token === USER_TOKEN) return { account: 'user-uuid', extra: {} }
    throw new Error('bad token')
  },
  TokenError: class extends Error {}
}))

const ctx = { newChild: () => ctx, info: () => {} } as unknown as MeasureContext

const fakeDb = (account: any): any => ({
  account: { findOne: async () => account },
  socialId: { find: async () => [], findOne: async () => null },
  person: { findOne: async () => ({ uuid: TARGET_UUID, firstName: 'Charlie', lastName: 'Citrine' }) },
  getAccountWorkspaces: async () => [],
  getWorkspaceRoles: async () => new Map(),
  adminAuditLog: { findByTarget: async () => [] }
})

import { getAccountDetails } from '../serviceOperations'

describe('getAccountDetails', () => {
  it('rejects non-admin caller', async () => {
    await expect(
      getAccountDetails(ctx, fakeDb({ uuid: TARGET_UUID }), null, USER_TOKEN, { accountUuid: TARGET_UUID })
    ).rejects.toThrow(PlatformError)
  })

  it('returns 404 for unknown account', async () => {
    await expect(
      getAccountDetails(ctx, fakeDb(null), null, ADMIN_TOKEN, { accountUuid: TARGET_UUID })
    ).rejects.toThrow()
  })

  it('returns full detail for admin caller', async () => {
    const account = {
      uuid: TARGET_UUID,
      firstName: 'Charlie',
      lastName: 'Citrine',
      disabledAt: null,
      lastActivityAt: 1700000000000
    }
    const res = await getAccountDetails(ctx, fakeDb(account), null, ADMIN_TOKEN, { accountUuid: TARGET_UUID })
    expect(res.uuid).toBe(TARGET_UUID)
    expect(res.status).toBe('active')
  })

  it('populates adminFirstName/adminLastName from person table', async () => {
    const admin1 = 'a1111111-1111-1111-1111-111111111111'
    const admin2 = 'a2222222-2222-2222-2222-222222222222'

    const account = {
      uuid: TARGET_UUID,
      firstName: 'Charlie',
      lastName: 'Citrine',
      disabledAt: null,
      lastActivityAt: 1700000000000
    }

    const auditEntries = [
      { tsMs: 1700000000000, adminAccount: admin1, action: 'disable', details: null },
      { tsMs: 1700000001000, adminAccount: admin2, action: 'enable', details: null },
      { tsMs: 1700000002000, adminAccount: admin1, action: 'disable', details: null }
    ]

    const personRows = new Map([
      [admin1, { uuid: admin1, firstName: 'Alice', lastName: 'Admin' }],
      [admin2, { uuid: admin2, firstName: 'Bob', lastName: 'Boss' }]
    ])

    const db = {
      account: { findOne: async () => account },
      socialId: { find: async () => [], findOne: async () => null },
      person: {
        findOne: async ({ uuid }: any) => personRows.get(uuid) ?? { uuid: TARGET_UUID, firstName: 'Charlie', lastName: 'Citrine' },
        find: async ({ uuid }: any) => {
          // IN-query: uuid is { $in: [admin1, admin2] }
          if (uuid?.$in != null) return uuid.$in.map((u: string) => personRows.get(u)).filter(Boolean)
          return []
        }
      },
      getAccountWorkspaces: async () => [],
      getWorkspaceRoles: async () => new Map(),
      adminAuditLog: { findByTarget: async () => auditEntries }
    } as any

    const res = await getAccountDetails(ctx, db, null, ADMIN_TOKEN, { accountUuid: TARGET_UUID })

    expect(res.recentAuditEntries).toHaveLength(3)
    expect(res.recentAuditEntries[0].adminFirstName).toBe('Alice')
    expect(res.recentAuditEntries[0].adminLastName).toBe('Admin')
    expect(res.recentAuditEntries[1].adminFirstName).toBe('Bob')
    expect(res.recentAuditEntries[1].adminLastName).toBe('Boss')
    expect(res.recentAuditEntries[2].adminFirstName).toBe('Alice')
  })
})
