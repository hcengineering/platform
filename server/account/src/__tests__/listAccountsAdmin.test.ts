//
// Copyright © 2026 Hardcore Engineering Inc.
//

import { MeasureContext } from '@hcengineering/core'
import { PlatformError } from '@hcengineering/platform'

const ADMIN_TOKEN = 'fake-admin-token'
const USER_TOKEN = 'fake-user-token'

jest.mock('@hcengineering/server-token', () => ({
  decodeTokenVerbose: (ctx: any, token: string) => {
    if (token === ADMIN_TOKEN) return { account: 'admin-uuid', extra: { admin: 'true' } }
    if (token === USER_TOKEN) return { account: 'user-uuid', extra: {} }
    throw new Error('bad token')
  },
  TokenError: class extends Error {}
}))

const ctx = { newChild: () => ctx, info: () => {}, warn: () => {}, error: () => {} } as unknown as MeasureContext

const fakeDb = (): any => ({
  account: {
    find: async () => [{ uuid: 'u1', disabledAt: null, tokenVersion: 0, lastActivityAt: 1700000000000 }],
    findOne: async () => null
  },
  socialId: { find: async () => [], findOne: async () => null },
  person: { find: async () => [{ uuid: 'u1', firstName: 'Alice', lastName: 'A' }] },
  getWorkspaceRoles: async () => new Map()
})

import { listAccountsAdmin } from '../serviceOperations'

describe('listAccountsAdmin', () => {
  it('returns 403 for non-admin caller', async () => {
    await expect(
      listAccountsAdmin(ctx, fakeDb(), null, USER_TOKEN, { pagination: { limit: 50, offset: 0 } })
    ).rejects.toThrow(PlatformError)
  })

  it('returns a list for admin caller with default sort', async () => {
    const res = await listAccountsAdmin(ctx, fakeDb(), null, ADMIN_TOKEN, { pagination: { limit: 50, offset: 0 } })
    expect(res.total).toBeGreaterThanOrEqual(0)
    expect(Array.isArray(res.accounts)).toBe(true)
  })
})
