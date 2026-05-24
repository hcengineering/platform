import { MeasureContext, AccountRole } from '@hcengineering/core'
import { PlatformError } from '@hcengineering/platform'

const ADMIN = 'admin-token'
const USER = 'user-token'
const TARGET = 'target-uuid' as any
const WS = 'ws-uuid' as any

jest.mock('@hcengineering/server-token', () => ({
  decodeTokenVerbose: (_ctx: any, token: string) => {
    if (token === ADMIN) return { account: 'admin', extra: { admin: 'true' } }
    if (token === USER) return { account: 'user', extra: {} }
    throw new Error('bad token')
  },
  TokenError: class extends Error {}
}))

jest.mock('../utils', () => ({
  ...jest.requireActual('../utils'),
  verifyTokenVersion: jest.fn(async () => undefined)
}))

const ctx = { newChild: () => ctx, info: () => {}, error: () => {} } as unknown as MeasureContext

interface MockOpts {
  account?: { disabledAt?: number | null } | null
  workspace?: { mode: string } | null
  currentRole?: AccountRole | null
}

function mockDb (o: MockOpts): any {
  // getWorkspaceInfoWithStatusById merges db.workspace + db.workspaceStatus;
  // the legacy `{ mode }` payload on `workspace` is split: identity fields
  // remain on the workspace row, `mode` is served from the status row.
  const ws = o.workspace
  const wsRow = ws == null ? null : { uuid: WS, name: 'n', url: 'u' }
  const statusRow = ws == null ? null : { workspaceUuid: WS, mode: ws.mode }
  return {
    account: { findOne: async () => o.account ?? null },
    workspace: { findOne: async () => wsRow },
    workspaceStatus: { findOne: async () => statusRow },
    getWorkspaceRole: async () => o.currentRole ?? null,
    assignWorkspace: jest.fn(async () => undefined),
    adminAuditLog: { insert: async () => undefined }
  }
}

import { addWorkspaceMember } from '../serviceOperations'

describe('addWorkspaceMember', () => {
  it('rejects non-admin caller', async () => {
    await expect(
      addWorkspaceMember(ctx, mockDb({}), null, USER, { accountUuid: TARGET, workspaceUuid: WS, role: AccountRole.User })
    ).rejects.toThrow(PlatformError)
  })

  it('404 when account is missing', async () => {
    await expect(
      addWorkspaceMember(ctx, mockDb({ account: null }), null, ADMIN, { accountUuid: TARGET, workspaceUuid: WS, role: AccountRole.User })
    ).rejects.toThrow(/AccountNotFound|account.*not found/i)
  })

  it('400 when account is disabled', async () => {
    await expect(
      addWorkspaceMember(ctx, mockDb({ account: { disabledAt: 12345 } }), null, ADMIN, { accountUuid: TARGET, workspaceUuid: WS, role: AccountRole.User })
    ).rejects.toThrow(/disabled/i)
  })

  it('404 when workspace is missing', async () => {
    await expect(
      addWorkspaceMember(ctx, mockDb({ account: { disabledAt: null }, workspace: null }), null, ADMIN, { accountUuid: TARGET, workspaceUuid: WS, role: AccountRole.User })
    ).rejects.toThrow(/WorkspaceNotFound|workspace.*not found/i)
  })

  it('400 when workspace mode is archived', async () => {
    await expect(
      addWorkspaceMember(ctx, mockDb({ account: { disabledAt: null }, workspace: { mode: 'archived' } }), null, ADMIN, { accountUuid: TARGET, workspaceUuid: WS, role: AccountRole.User })
    ).rejects.toThrow(/Workspace not available|not.*available/i)
  })

  it('409 when account is already a member', async () => {
    await expect(
      addWorkspaceMember(ctx, mockDb({ account: { disabledAt: null }, workspace: { mode: 'active' }, currentRole: AccountRole.User }), null, ADMIN, { accountUuid: TARGET, workspaceUuid: WS, role: AccountRole.User })
    ).rejects.toThrow(/Already a member|already/i)
  })

  it('assigns and audits on happy path', async () => {
    const db = mockDb({ account: { disabledAt: null }, workspace: { mode: 'active' }, currentRole: null })
    const auditInsert = jest.fn(async () => undefined)
    db.adminAuditLog = { insert: auditInsert, findByTarget: async () => [] }
    const assignSpy = db.assignWorkspace as jest.Mock
    // Mock getAccountDetails-shaped response — the real fn will compose it
    db.socialId = { find: async () => [] }
    db.person = { findOne: async () => ({ firstName: 'A', lastName: 'B' }) }
    db.getWorkspaceRoles = async () => new Map()
    db.getAccountWorkspaces = async () => []
    db.workspace = {
      findOne: async () => ({ uuid: WS, name: 'n', url: 'u' }),
      find: async () => []
    }
    db.workspaceStatus = { findOne: async () => ({ workspaceUuid: WS, mode: 'active' }) }
    await addWorkspaceMember(ctx, db, null, ADMIN, { accountUuid: TARGET, workspaceUuid: WS, role: AccountRole.User })
    expect(assignSpy).toHaveBeenCalledWith(TARGET, WS, AccountRole.User)
    expect(auditInsert).toHaveBeenCalledWith(expect.objectContaining({ action: 'add_workspace_member' }))
  })
})
