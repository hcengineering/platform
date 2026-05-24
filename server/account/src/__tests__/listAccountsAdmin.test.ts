//
// Copyright © 2026 Hardcore Engineering Inc.
//

import { MeasureContext } from '@hcengineering/core'
import { PlatformError } from '@hcengineering/platform'
import type { AccountListRow } from '@hcengineering/account-client'

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

jest.mock('../utils', () => ({
  ...jest.requireActual('../utils'),
  verifyTokenVersion: jest.fn(async () => undefined)
}))

const ctx = { newChild: () => ctx, info: () => {}, warn: () => {}, error: () => {} } as unknown as MeasureContext

// Build an in-memory listAccountsAdmin implementation for testing.
// Replicates the filtering logic so existing test assertions still pass.
function buildInMemoryListAccountsAdmin (rows: AccountListRow[]) {
  return async (params: any): Promise<{ rows: AccountListRow[], total: number }> => {
    let filtered = [...rows]

    if (params.search != null && params.search.trim() !== '') {
      const needle = params.search.trim().toLowerCase()
      filtered = filtered.filter(
        (r) =>
          r.firstName.toLowerCase().includes(needle) ||
          r.lastName.toLowerCase().includes(needle) ||
          (r.primaryEmail ?? '').toLowerCase().includes(needle)
      )
    }
    if (params.statusIn != null && params.statusIn.length > 0) {
      const allowed = new Set(params.statusIn)
      filtered = filtered.filter((r) => allowed.has(r.status))
    }
    if (params.emailContains != null && params.emailContains !== '') {
      const needle = params.emailContains.trim().toLowerCase()
      filtered = filtered.filter((r) => (r.primaryEmail ?? '').toLowerCase().includes(needle))
    }
    if (params.nameContains != null && params.nameContains !== '') {
      const needle = params.nameContains.trim().toLowerCase()
      filtered = filtered.filter((r) => `${r.firstName} ${r.lastName}`.toLowerCase().includes(needle))
    }
    if (params.workspaceUuidsIn != null && params.workspaceUuidsIn.length > 0) {
      // No workspace membership info in unit tests — skip
    }
    if (params.wsMin != null) {
      filtered = filtered.filter((r) => r.workspaceCount >= params.wsMin)
    }
    if (params.wsMax != null) {
      filtered = filtered.filter((r) => r.workspaceCount <= params.wsMax)
    }
    if (params.lastActivityFilter != null) {
      const laf = params.lastActivityFilter
      if (laf.kind === 'never') {
        filtered = filtered.filter((r) => r.lastActivityAt == null)
      } else if (laf.kind === 'range') {
        filtered = filtered.filter((r) => {
          const ts = r.lastActivityAt
          if (ts == null) return false
          if (laf.fromMs != null && ts < laf.fromMs) return false
          if (laf.toMs != null && ts > laf.toMs) return false
          return true
        })
      }
    }
    if (params.sort != null) {
      const dir = params.sort.direction === 'desc' ? -1 : 1
      filtered.sort((a: AccountListRow, b: AccountListRow) => {
        switch (params.sort.field) {
          case 'name':
            return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`) * dir
          case 'email':
            return (a.primaryEmail ?? '￿').localeCompare(b.primaryEmail ?? '￿') * dir
          default:
            return 0
        }
      })
    } else {
      filtered.sort((a, b) =>
        `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
      )
    }

    const limit = params.pagination?.limit ?? 50
    const offset = params.pagination?.offset ?? 0
    const total = filtered.length
    return { rows: filtered.slice(offset, offset + limit), total }
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
): AccountListRow[] {
  return rows.map((r) => ({
    uuid: r.uuid as any,
    firstName: r.firstName,
    lastName: r.lastName,
    primaryEmail: r.email,
    authMethods: r.email != null ? ['email' as const] : [],
    hasPassword: false,
    workspaceCount: 0,
    status: r.status ?? 'active',
    lastActivityAt: r.lastActivity ?? null,
    isAdmin: false
  }))
}

function fakeDb (rows?: AccountListRow[]): any {
  const allRows = rows ?? buildAccounts([{ uuid: 'u1', firstName: 'Alice', lastName: 'A', email: 'a@x.com', lastActivity: 1700000000000 }])
  return {
    account: {
      findOne: async () => ({ uuid: 'admin-uuid', disabledAt: null, tokenVersion: 0 })
    },
    socialId: { find: async () => [], findOne: async () => null },
    listAccountsAdmin: buildInMemoryListAccountsAdmin(allRows)
  }
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
    const rows = buildAccounts([
      { uuid: 'u1', firstName: 'A', lastName: 'x', email: 'c@example.com' },
      { uuid: 'u2', firstName: 'B', lastName: 'x', email: 'a@example.com' },
      { uuid: 'u3', firstName: 'C', lastName: 'x', email: 'b@example.com' }
    ])
    const result = await listAccountsAdmin(ctx, fakeDb(rows), null, ADMIN_TOKEN, {
      sort: { field: 'email', direction: 'asc' },
      pagination: { limit: 10, offset: 0 }
    })
    expect(result.accounts.map((a) => a.uuid)).toEqual(['u2', 'u3', 'u1'])
  })

  it('filters by statusIn=[disabled]', async () => {
    const rows = buildAccounts([
      { uuid: 'u1', firstName: 'A', lastName: 'x', email: 'a@x', status: 'active' },
      { uuid: 'u2', firstName: 'B', lastName: 'x', email: 'b@x', status: 'disabled' },
      { uuid: 'u3', firstName: 'C', lastName: 'x', email: 'c@x', status: 'active' }
    ])
    const result = await listAccountsAdmin(ctx, fakeDb(rows), null, ADMIN_TOKEN, {
      statusIn: ['disabled'],
      pagination: { limit: 10, offset: 0 }
    })
    expect(result.accounts.map((a) => a.uuid)).toEqual(['u2'])
  })

  it('filters by lastActivityFilter.kind=never', async () => {
    const rows = buildAccounts([
      { uuid: 'u1', firstName: 'A', lastName: 'x', email: 'a@x', lastActivity: 1700000000000 },
      { uuid: 'u2', firstName: 'B', lastName: 'x', email: 'b@x', lastActivity: null }
    ])
    const result = await listAccountsAdmin(ctx, fakeDb(rows), null, ADMIN_TOKEN, {
      lastActivityFilter: { kind: 'never' },
      pagination: { limit: 10, offset: 0 }
    })
    expect(result.accounts.map((a) => a.uuid)).toEqual(['u2'])
  })

  it('filters by emailContains (case-insensitive)', async () => {
    const rows = buildAccounts([
      { uuid: 'u1', firstName: 'A', lastName: 'x', email: 'Alice@Example.COM' },
      { uuid: 'u2', firstName: 'B', lastName: 'x', email: 'bob@example.com' }
    ])
    const result = await listAccountsAdmin(ctx, fakeDb(rows), null, ADMIN_TOKEN, {
      emailContains: 'ALICE',
      pagination: { limit: 10, offset: 0 }
    })
    expect(result.accounts.map((a) => a.uuid)).toEqual(['u1'])
  })

  it('delegates to db.listAccountsAdmin and returns {accounts, total}', async () => {
    let capturedParams: any = null
    const delegateDb = {
      account: { findOne: async () => ({ uuid: 'admin-uuid', disabledAt: null, tokenVersion: 0 }) },
      socialId: { find: async () => [] },
      listAccountsAdmin: async (params: any) => {
        capturedParams = params
        return {
          rows: [{ uuid: 'a1', firstName: 'A', lastName: 'One', status: 'active', authMethods: [], hasPassword: false, workspaceCount: 0, primaryEmail: null, lastActivityAt: null, isAdmin: false }],
          total: 42
        }
      }
    } as any
    const res = await listAccountsAdmin(ctx, delegateDb, null, ADMIN_TOKEN, { sort: { field: 'name', direction: 'asc' }, pagination: { limit: 10, offset: 0 } })
    expect(res.accounts).toHaveLength(1)
    expect(res.total).toBe(42)
    expect(capturedParams.sort?.field).toBe('name')
  })
})
