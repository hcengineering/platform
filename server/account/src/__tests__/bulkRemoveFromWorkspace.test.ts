//
// Copyright © 2026 Hardcore Engineering Inc.
//

import { MeasureContext } from '@hcengineering/core'

const ADMIN_TOKEN = 'admin-token'
const ADMIN_UUID = 'admin-uuid' as any
const OTHER1 = '11111111-1111-1111-1111-111111111111' as any
const OTHER2 = '22222222-2222-2222-2222-222222222222' as any
const WS = 'wwwwwwww-wwww-wwww-wwww-wwwwwwwwwwww' as any

jest.mock('@hcengineering/server-token', () => ({
  decodeTokenVerbose: (_c: any, token: string) => {
    if (token === ADMIN_TOKEN) return { account: ADMIN_UUID, extra: { admin: 'true' } }
    throw new Error('bad token')
  },
  TokenError: class extends Error {}
}))

// assertAdmin internally calls verifyTokenVersion against the DB; mock it
// to a no-op so the bulk-loop runs without needing real account-version
// fixtures. Same pattern as bulkActions.test.ts.
jest.mock('../utils', () => ({
  ...jest.requireActual('../utils'),
  verifyTokenVersion: jest.fn(async () => undefined)
}))

const ctx = { newChild: () => ctx, info: () => {}, warn: () => {}, error: () => {} } as unknown as MeasureContext

// Track every call made via the mocked removeWorkspaceMemberInternal so the test
// can assert which uuids made it past the selfFilter into the operation.
const removeCalls: any[] = []
jest.mock('../operations', () => ({
  ...jest.requireActual('../operations'),
  removeWorkspaceMember: async (_c: any, _db: any, _b: any, _t: any, params: any) => {
    removeCalls.push(params)
  },
  removeWorkspaceMemberInternal: async (_c: any, _db: any, _adminUuid: any, params: any) => {
    removeCalls.push(params)
  }
}))

import { bulkRemoveFromWorkspace } from '../serviceOperations'

// Full mock-db: bulkRemoveFromWorkspace calls assertAdmin
// (account.findOne for token-version check via verifyTokenVersion mock —
// returning anything is fine since that path is mocked out), and the
// bulkLoop on success would call adminAuditLog.insert downstream — but
// our mocked removeWorkspaceMember bypasses that. Keep the db small
// but well-formed.
function db (): any {
  return {
    account: {
      findOne: async (q: any) => ({ uuid: q.uuid, disabledAt: null, tokenVersion: 0 }),
      update: async () => undefined
    },
    socialId: { find: async () => [] },
    adminAuditLog: { insert: async () => undefined }
  }
}

beforeEach(() => {
  removeCalls.length = 0
})

describe('bulkRemoveFromWorkspace selfFilter', () => {
  it('excludes the admin themselves from bulk-remove', async () => {
    const res = await bulkRemoveFromWorkspace(
      ctx, db(), null, ADMIN_TOKEN,
      { accountUuids: [OTHER1, ADMIN_UUID, OTHER2], workspaceUuid: WS }
    )
    // Self should NOT be in removeCalls (filtered before op runs)
    const calledFor = removeCalls.map((c) => c.accountUuid)
    expect(calledFor).toEqual([OTHER1, OTHER2])
    // Self should appear in failed with explanatory reason
    expect(res.failed).toContainEqual({ accountUuid: ADMIN_UUID, error: expect.stringMatching(/self/i) })
    expect(res.succeeded).toEqual([OTHER1, OTHER2])
  })

  it('does NOT filter when admin uuid is not in the bulk list', async () => {
    const res = await bulkRemoveFromWorkspace(
      ctx, db(), null, ADMIN_TOKEN,
      { accountUuids: [OTHER1, OTHER2], workspaceUuid: WS }
    )
    expect(res.succeeded).toEqual([OTHER1, OTHER2])
    expect(res.failed).toEqual([])
  })
})
