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

function mockDb (data: { accounts: any[], persons: any[], socials: any[] }): any {
  return {
    account: {
      find: async () => data.accounts,
      findOne: async () => null
    },
    socialId: {
      find: async () => data.socials,
      findOne: async () => null
    },
    person: { find: async () => data.persons },
    getWorkspaceRoles: async () => new Map()
  }
}

function buildAccounts (
  rows: Array<{
    uuid: string
    firstName: string
    lastName: string
    email: string | null
    status?: 'active' | 'disabled'
    lastActivity?: number | null
  }>
): { accounts: any[], persons: any[], socials: any[] } {
  const accounts = rows.map((r) => ({
    uuid: r.uuid,
    disabledAt: r.status === 'disabled' ? 1700000000000 : null,
    lastActivityAt: r.lastActivity ?? null
  }))
  const persons = rows.map((r) => ({ uuid: r.uuid, firstName: r.firstName, lastName: r.lastName }))
  const socials = rows
    .filter((r) => r.email != null)
    .map((r) => ({ personUuid: r.uuid, type: 'email', value: r.email }))
  return { accounts, persons, socials }
}

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

  it('sorts by email asc', async () => {
    const { accounts, persons, socials } = buildAccounts([
      { uuid: 'u1', firstName: 'A', lastName: 'x', email: 'c@example.com' },
      { uuid: 'u2', firstName: 'B', lastName: 'x', email: 'a@example.com' },
      { uuid: 'u3', firstName: 'C', lastName: 'x', email: 'b@example.com' }
    ])
    const result = await listAccountsAdmin(ctx, mockDb({ accounts, persons, socials }), null, ADMIN_TOKEN, {
      sort: { field: 'email', direction: 'asc' },
      pagination: { limit: 10, offset: 0 }
    })
    expect(result.accounts.map((a) => a.uuid)).toEqual(['u2', 'u3', 'u1'])
  })

  it('filters by statusIn=[disabled]', async () => {
    const { accounts, persons, socials } = buildAccounts([
      { uuid: 'u1', firstName: 'A', lastName: 'x', email: 'a@x', status: 'active' },
      { uuid: 'u2', firstName: 'B', lastName: 'x', email: 'b@x', status: 'disabled' },
      { uuid: 'u3', firstName: 'C', lastName: 'x', email: 'c@x', status: 'active' }
    ])
    const result = await listAccountsAdmin(ctx, mockDb({ accounts, persons, socials }), null, ADMIN_TOKEN, {
      statusIn: ['disabled'],
      pagination: { limit: 10, offset: 0 }
    })
    expect(result.accounts.map((a) => a.uuid)).toEqual(['u2'])
  })

  it('filters by lastActivityFilter.kind=never', async () => {
    const { accounts, persons, socials } = buildAccounts([
      { uuid: 'u1', firstName: 'A', lastName: 'x', email: 'a@x', lastActivity: 1700000000000 },
      { uuid: 'u2', firstName: 'B', lastName: 'x', email: 'b@x', lastActivity: null }
    ])
    const result = await listAccountsAdmin(ctx, mockDb({ accounts, persons, socials }), null, ADMIN_TOKEN, {
      lastActivityFilter: { kind: 'never' },
      pagination: { limit: 10, offset: 0 }
    })
    expect(result.accounts.map((a) => a.uuid)).toEqual(['u2'])
  })

  it('filters by emailContains (case-insensitive)', async () => {
    const { accounts, persons, socials } = buildAccounts([
      { uuid: 'u1', firstName: 'A', lastName: 'x', email: 'Alice@Example.COM' },
      { uuid: 'u2', firstName: 'B', lastName: 'x', email: 'bob@example.com' }
    ])
    const result = await listAccountsAdmin(ctx, mockDb({ accounts, persons, socials }), null, ADMIN_TOKEN, {
      emailContains: 'ALICE',
      pagination: { limit: 10, offset: 0 }
    })
    expect(result.accounts.map((a) => a.uuid)).toEqual(['u1'])
  })
})
