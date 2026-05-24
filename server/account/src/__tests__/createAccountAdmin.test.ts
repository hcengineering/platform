import { MeasureContext, AccountRole } from '@hcengineering/core'
import { PlatformError } from '@hcengineering/platform'

jest.mock('@hcengineering/server-token', () => ({
  decodeTokenVerbose: (_c: any, t: string) =>
    t === 'admin' ? { account: 'admin', extra: { admin: 'true' } } : { account: 'u', extra: {} },
  TokenError: class extends Error {}
}))

// signUpByEmail (utils.ts:722) internally calls db.person.insertOne,
// db.socialId.insertOne, createAccount (which inserts db.account +
// db.userProfile + db.accountEvent rows), and setPassword. Mocking all
// of that is fragile; instead we mock signUpByEmail itself so the test
// stays focused on createAccountAdmin's own logic (email validation,
// password rule, guards, audit-log, response shape).
const signUpByEmailMock = jest.fn(async (..._args: any[]) => ({ account: 'new-account-uuid' as any, socialId: 'new-social-id' as any }))
jest.mock('../utils', () => ({
  ...(jest.requireActual('../utils') as Record<string, unknown>),
  verifyTokenVersion: jest.fn(async () => undefined),
  signUpByEmail: (...args: any[]) => signUpByEmailMock(...args)
}))

const sendMailMock = jest.fn(async (..._args: any[]) => true)
jest.mock('../operations', () => ({
  __esModule: true,
  sendPasswordResetEmail: (...args: any[]) => sendMailMock(...args)
}))

const ctx = { newChild: () => ctx, info: () => {}, error: () => {} } as unknown as MeasureContext

import { createAccountAdmin } from '../serviceOperations'

// Collision is exercised via signUpByEmailMock.mockRejectedValueOnce (above);
// mockDb doesn't need to know about it. Other DB calls live exclusively in
// createAccountAdmin's own body + the final getAccountDetails refetch.
interface Opts { workspace?: any, assignThrows?: boolean }
function mockDb (o: Opts = {}): any {
  // getWorkspaceInfoWithStatusById merges db.workspace + db.workspaceStatus.
  // Split the legacy `{ ..., mode }` fixture across the two collections so
  // the new lookup helper can rebuild `{ ...ws, status: { mode } }`.
  const ws = o.workspace
  const wsRow = ws == null ? null : { uuid: ws.uuid, name: ws.name, url: ws.url }
  const statusRow = ws == null ? null : { workspaceUuid: ws.uuid, mode: ws.mode }
  return {
    socialId: { findOne: async () => null, find: async () => [] },
    account: { findOne: async () => ({ uuid: 'new-account-uuid' as any, disabledAt: null, lastActivityAt: null }), find: async () => [] },
    person: { findOne: async () => ({ uuid: 'new-account-uuid' as any, firstName: '', lastName: '' }), find: async () => [] },
    workspace: { findOne: async () => wsRow, find: async () => [] },
    workspaceStatus: { findOne: async () => statusRow },
    getWorkspaceRole: async () => null,
    getWorkspaceRoles: async () => new Map(),
    getAccountWorkspaces: async () => [],
    assignWorkspace: o.assignThrows ? jest.fn(async () => { throw new Error('race') }) : jest.fn(async () => undefined),
    adminAuditLog: { insert: async () => undefined, findByTarget: async () => [] }
  }
}

beforeEach(() => sendMailMock.mockReset().mockResolvedValue(true))

describe('createAccountAdmin', () => {
  const base = { firstName: 'A', lastName: 'B', email: 'new@example.com', passwordMode: 'set' as const, password: 'longenoughpw' }

  it('rejects non-admin', async () => {
    await expect(createAccountAdmin(ctx, mockDb(), null, 'u', base)).rejects.toThrow(PlatformError)
  })

  it('409 on email collision (signUpByEmail throws AccountAlreadyExists)', async () => {
    const { Status, Severity, PlatformError: PE } = jest.requireActual('@hcengineering/platform')
    const platformModule = jest.requireActual('@hcengineering/platform').default ?? jest.requireActual('@hcengineering/platform')
    signUpByEmailMock.mockRejectedValueOnce(new PE(new Status(Severity.ERROR, platformModule.status?.AccountAlreadyExists ?? 'AccountAlreadyExists', {})))
    await expect(createAccountAdmin(ctx, mockDb(), null, 'admin', base)).rejects.toThrow(/already exists|Conflict/i)
  })

  it('400 on weak password (< 8 chars) in set mode', async () => {
    await expect(createAccountAdmin(ctx, mockDb(), null, 'admin', { ...base, password: 'short' })).rejects.toThrow(/at least 8/i)
  })

  it('happy path set-mode without initial workspace', async () => {
    const r = await createAccountAdmin(ctx, mockDb(), null, 'admin', base)
    expect(r.inviteEmailSent).toBeNull()
    expect(r.initialWorkspaceAssigned).toBeNull()
    expect(r.account).toBeDefined()
  })

  it('invite-mode sets inviteEmailSent from helper', async () => {
    sendMailMock.mockResolvedValueOnce(false)
    const r = await createAccountAdmin(ctx, mockDb(), null, 'admin', { firstName: 'A', lastName: 'B', email: 'x@example.com', passwordMode: 'invite' })
    expect(r.inviteEmailSent).toBe(false)
  })

  it('initialWorkspaceAssigned reflects assign-step success/failure', async () => {
    const okWs = { uuid: 'ws', mode: 'active', name: 'n', url: 'u' }
    const r1 = await createAccountAdmin(ctx, mockDb({ workspace: okWs }), null, 'admin', { ...base, initialWorkspace: { workspaceUuid: 'ws' as any, role: AccountRole.User } })
    expect(r1.initialWorkspaceAssigned).toBe(true)
    const r2 = await createAccountAdmin(ctx, mockDb({ workspace: okWs, assignThrows: true }), null, 'admin', { ...base, initialWorkspace: { workspaceUuid: 'ws' as any, role: AccountRole.User } })
    expect(r2.initialWorkspaceAssigned).toBe(false)
  })
})
