import { type MeasureContext, AccountRole } from '@hcengineering/core'
import { PlatformError } from '@hcengineering/platform'

import { getWorkspaceMembersAdmin } from '../serviceOperations'

jest.mock('@hcengineering/server-token', () => ({
  decodeTokenVerbose: (_ctx: any, token: string) => {
    if (token === 'admin') return { account: 'admin-uuid', extra: { admin: 'true' } }
    if (token === 'user') return { account: 'user-uuid', extra: {} }
    throw new Error('bad token')
  },
  TokenError: class extends Error {}
}))

jest.mock('../utils', () => ({
  ...jest.requireActual('../utils'),
  verifyTokenVersion: jest.fn(async () => undefined)
}))

const ctx = { newChild: () => ctx, info: () => {}, error: () => {} } as unknown as MeasureContext

const WS = 'ws-uuid' as any

function mockDb (workspace: any, members: any[], accounts: any[], persons: any[], socials: any[]): any {
  // getWorkspaceInfoWithStatusById merges db.workspace + db.workspaceStatus;
  // split the legacy `{ ..., mode }` payload across the two collections.
  const wsRow = workspace == null ? null : { uuid: workspace.uuid, name: workspace.name, url: workspace.url }
  const statusRow = workspace == null ? null : { workspaceUuid: workspace.uuid, mode: workspace.mode }
  return {
    workspace: { findOne: async () => wsRow },
    workspaceStatus: { findOne: async () => statusRow },
    getWorkspaceMembers: async () => members,
    account: { find: jest.fn(async () => accounts) },
    person: { find: jest.fn(async () => persons) },
    socialId: { find: jest.fn(async () => socials) }
  }
}

describe('getWorkspaceMembersAdmin', () => {
  it('rejects non-admin', async () => {
    await expect(
      getWorkspaceMembersAdmin(ctx, mockDb(null, [], [], [], []), null, 'user', { workspaceUuid: WS })
    ).rejects.toThrow(PlatformError)
  })

  it('404 when workspace is missing', async () => {
    await expect(
      getWorkspaceMembersAdmin(ctx, mockDb(null, [], [], [], []), null, 'admin', { workspaceUuid: WS })
    ).rejects.toThrow(/WorkspaceNotFound|workspace.*not found/i)
  })

  it('returns enriched members', async () => {
    const ws = { uuid: WS, name: 'team', url: 'team-url', mode: 'active' }
    const members = [
      { person: 'acc-1', role: AccountRole.Owner },
      { person: 'acc-2', role: AccountRole.User }
    ]
    const accounts = [
      { uuid: 'acc-1', disabledAt: null, lastActivityAt: 1700000000000 },
      { uuid: 'acc-2', disabledAt: 1000, lastActivityAt: null }
    ]
    const persons = [
      { uuid: 'acc-1', firstName: 'A', lastName: '1' },
      { uuid: 'acc-2', firstName: 'B', lastName: '2' }
    ]
    const socials = [
      { personUuid: 'acc-1', type: 'email', value: 'a@x' },
      { personUuid: 'acc-2', type: 'email', value: 'b@x' }
    ]
    const db = mockDb(ws, members, accounts, persons, socials)
    const out = await getWorkspaceMembersAdmin(ctx, db, null, 'admin', {
      workspaceUuid: WS
    })
    expect(out.workspaceUuid).toBe(WS)
    expect(out.members).toHaveLength(2)
    expect(out.members[0]).toMatchObject({
      accountUuid: 'acc-1',
      primaryEmail: 'a@x',
      role: AccountRole.Owner,
      status: 'active',
      lastActivityAt: 1700000000000
    })
    expect(out.members[1]).toMatchObject({ accountUuid: 'acc-2', status: 'disabled' })
    // L-FTS: gezielte $in-Query auf die Member-UUIDs statt Full-Table-Scan ({}).
    expect(db.account.find).toHaveBeenCalledWith({ uuid: { $in: ['acc-1', 'acc-2'] } })
    expect(db.person.find).toHaveBeenCalledWith({ uuid: { $in: ['acc-1', 'acc-2'] } })
    expect(db.socialId.find).toHaveBeenCalledWith({ personUuid: { $in: ['acc-1', 'acc-2'] } })
  })

  it('L-FTS: skips DB queries when workspace has no members', async () => {
    const ws = { uuid: WS, name: 'team', url: 'team-url', mode: 'active' }
    const db = mockDb(ws, [], [], [], [])
    const out = await getWorkspaceMembersAdmin(ctx, db, null, 'admin', { workspaceUuid: WS })
    expect(out.members).toHaveLength(0)
    expect(db.account.find).not.toHaveBeenCalled()
    expect(db.person.find).not.toHaveBeenCalled()
    expect(db.socialId.find).not.toHaveBeenCalled()
  })
})
