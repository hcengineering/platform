import { MeasureContext, AccountRole } from '@hcengineering/core'
import { PlatformError } from '@hcengineering/platform'

jest.mock('@hcengineering/server-token', () => ({
  decodeTokenVerbose: (_c: any, t: string) => t === 'admin' ? { account: 'admin-uuid', extra: { admin: 'true' } } : { account: 'u', extra: {} },
  TokenError: class extends Error {}
}))
jest.mock('../utils', () => ({
  ...jest.requireActual('../utils'),
  verifyTokenVersion: jest.fn(async () => undefined)
}))

const ctx = { newChild: () => ctx, info: () => {}, warn: () => {}, error: () => {} } as unknown as MeasureContext

import {
  bulkAddToWorkspace,
  bulkRemoveFromWorkspace,
  bulkSetDisabled,
  bulkSendPasswordReset
} from '../serviceOperations'

function db (): any {
  // NOTE: single `workspace` key with both findOne + find. Two `workspace:`
  // properties in the same object literal silently override each other; the
  // earlier draft had findOne shadowed by find and bulkAddToWorkspace's
  // getWorkspaceById(db, ...) lookup then returned undefined.
  return {
    account: {
      findOne: async (q: any) => ({ uuid: q.uuid, disabledAt: null, tokenVersion: 0, hash: null }),
      update: async () => undefined
    },
    workspace: {
      findOne: async () => ({ uuid: 'ws', name: 'n', url: 'u' }),
      find: async () => []
    },
    // addWorkspaceMember now resolves the workspace via
    // getWorkspaceInfoWithStatusById which reads from db.workspaceStatus too.
    workspaceStatus: { findOne: async () => ({ workspaceUuid: 'ws', mode: 'active' }) },
    getWorkspaceRole: async () => null,
    getWorkspaceRoles: async () => new Map(),
    getWorkspaceMembers: async () => [],
    getAccountWorkspaces: async () => [],
    assignWorkspace: async () => undefined,
    unassignWorkspace: async () => undefined,
    setDisabledAt: async () => undefined,
    adminAuditLog: { insert: async () => undefined, findByTarget: async () => [] },
    socialId: { find: async () => [{ personUuid: 'a1', type: 'email', value: 'a1@x' }] },
    person: { find: async () => [], findOne: async () => null }
  }
}

describe('bulkActions', () => {
  it('all endpoints reject non-admin', async () => {
    // bulkSetDisabled has a different signature (takes deps), test separately.
    for (const fn of [bulkAddToWorkspace, bulkRemoveFromWorkspace, bulkSendPasswordReset]) {
      await expect((fn as any)(ctx, db(), null, 'u', { accountUuids: [], workspaceUuid: 'ws' as any, role: AccountRole.User } as any)).rejects.toThrow(PlatformError)
    }
    // bulkSetDisabled with deps
    await expect(bulkSetDisabled(ctx, db(), null, {}, 'u', { accountUuids: [], disabled: false } as any)).rejects.toThrow(PlatformError)
  })

  it('400 on input > 200', async () => {
    const big = new Array(201).fill('a').map((_, i) => `acc-${i}`) as any
    await expect(bulkAddToWorkspace(ctx, db(), null, 'admin', { accountUuids: big, workspaceUuid: 'ws' as any, role: AccountRole.User })).rejects.toThrow(/200/)
  })

  it('bulkSetDisabled skips admin self', async () => {
    const r = await bulkSetDisabled(ctx, db(), null, {}, 'admin', { accountUuids: ['admin-uuid', 'other'] as any, disabled: true })
    expect(r.failed).toEqual([{ accountUuid: 'admin-uuid', error: 'cannot disable self' }])
    expect(r.succeeded).toEqual(['other'])
  })

  it('bulkAddToWorkspace returns succeeded for happy path', async () => {
    const r = await bulkAddToWorkspace(ctx, db(), null, 'admin', { accountUuids: ['a1', 'a2'] as any, workspaceUuid: 'ws' as any, role: AccountRole.User })
    expect(r.succeeded.sort()).toEqual(['a1', 'a2'])
    expect(r.failed).toEqual([])
  })

  it('assertAdmin runs once per bulk call, not per row', async () => {
    let verifyTokenCalls = 0
    // verifyTokenVersion is mocked but we can count account.findOne calls which
    // are the main cost of assertAdmin (token-version check path).
    const mockDb = {
      ...db(),
      account: {
        findOne: jest.fn(async (q: any) => {
          verifyTokenCalls++
          return { uuid: q.uuid ?? 'admin-uuid', disabledAt: null, tokenVersion: 0, hash: null }
        }),
        update: async () => undefined
      }
    }
    await bulkAddToWorkspace(ctx, mockDb, null, 'admin', {
      accountUuids: ['u1', 'u2', 'u3', 'u4', 'u5'] as any,
      workspaceUuid: 'ws' as any,
      role: AccountRole.User
    })
    // Expect fewer than 5 (bulk size) calls — admin check is once, not per-row.
    // Per-row account lookups for the members add ~5 calls; assertAdmin adds ~1.
    // The key invariant: total < 5 * 2 (i.e. not O(bulk * adminChecks)).
    expect(verifyTokenCalls).toBeLessThan(5 * 2)
  })
})
