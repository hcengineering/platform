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

const ctx = { newChild: () => ctx, info: () => {}, error: () => {} } as unknown as MeasureContext

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
      findOne: async (q: any) => ({ uuid: q.uuid, disabledAt: null, tokenVersion: 0 }),
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
    for (const fn of [bulkAddToWorkspace, bulkRemoveFromWorkspace, bulkSetDisabled, bulkSendPasswordReset]) {
      await expect(fn(ctx, db(), null, 'u', { accountUuids: [], workspaceUuid: 'ws' as any, role: AccountRole.User, disabled: false } as any)).rejects.toThrow(PlatformError)
    }
  })

  it('400 on input > 200', async () => {
    const big = new Array(201).fill('a').map((_, i) => `acc-${i}`) as any
    await expect(bulkAddToWorkspace(ctx, db(), null, 'admin', { accountUuids: big, workspaceUuid: 'ws' as any, role: AccountRole.User })).rejects.toThrow(/200/)
  })

  it('bulkSetDisabled skips admin self', async () => {
    const r = await bulkSetDisabled(ctx, db(), null, 'admin', { accountUuids: ['admin-uuid', 'other'] as any, disabled: true })
    expect(r.failed).toEqual([{ accountUuid: 'admin-uuid', error: 'cannot disable self' }])
    expect(r.succeeded).toEqual(['other'])
  })

  it('bulkAddToWorkspace returns succeeded for happy path', async () => {
    const r = await bulkAddToWorkspace(ctx, db(), null, 'admin', { accountUuids: ['a1', 'a2'] as any, workspaceUuid: 'ws' as any, role: AccountRole.User })
    expect(r.succeeded.sort()).toEqual(['a1', 'a2'])
    expect(r.failed).toEqual([])
  })
})
