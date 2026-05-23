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
})
