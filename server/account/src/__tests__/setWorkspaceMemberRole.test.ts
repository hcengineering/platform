//
// Copyright © 2026 Hardcore Engineering Inc.
//

import { type MeasureContext, AccountRole, type WorkspaceMemberInfo } from '@hcengineering/core'
import platform, { PlatformError } from '@hcengineering/platform'

import { setWorkspaceMemberRole } from '../operations'

const ADMIN_TOKEN = 'admin-token'
const USER_TOKEN = 'user-token'
const TARGET = 'target-uuid' as any
const WS = 'ws-uuid' as any

jest.mock('@hcengineering/server-token', () => ({
  decodeTokenVerbose: (ctx: any, token: string) => {
    if (token === ADMIN_TOKEN) return { account: 'admin-uuid', extra: { admin: 'true' } }
    if (token === USER_TOKEN) return { account: 'user-uuid', extra: {} }
    throw new Error('bad token')
  },
  TokenError: class extends Error {}
}))

const ctx = { newChild: () => ctx, info: () => {} } as unknown as MeasureContext

function mockDb (currentRole: AccountRole | null, members: WorkspaceMemberInfo[] = []): any {
  return {
    getWorkspaceRole: async () => currentRole,
    getWorkspaceMembers: async () => members,
    updateWorkspaceRole: async () => undefined,
    // L-RACE: conditional demote mirrors the real DB guard (blocks last Owner).
    updateWorkspaceRoleIfOtherOwnerExists: async (accountId: any) =>
      members.filter((m) => m.role === AccountRole.Owner && m.person !== accountId).length > 0,
    adminAuditLog: { insert: async () => undefined }
  }
}

describe('setWorkspaceMemberRole', () => {
  it('rejects non-admin caller', async () => {
    await expect(
      setWorkspaceMemberRole(ctx, mockDb(null), null, USER_TOKEN, {
        accountUuid: TARGET,
        workspaceUuid: WS,
        newRole: AccountRole.User
      })
    ).rejects.toThrow(PlatformError)
  })

  it('rejects when target is not a member of the workspace', async () => {
    await expect(
      setWorkspaceMemberRole(ctx, mockDb(null), null, ADMIN_TOKEN, {
        accountUuid: TARGET,
        workspaceUuid: WS,
        newRole: AccountRole.User
      })
    ).rejects.toThrow(PlatformError)
  })

  it('rejects demoting the last Owner', async () => {
    const members: WorkspaceMemberInfo[] = [{ person: TARGET, role: AccountRole.Owner }]
    await expect(
      setWorkspaceMemberRole(ctx, mockDb(AccountRole.Owner, members), null, ADMIN_TOKEN, {
        accountUuid: TARGET,
        workspaceUuid: WS,
        newRole: AccountRole.User
      })
    ).rejects.toThrow(PlatformError)
  })

  it('allows demoting an Owner when other Owners exist', async () => {
    const members: WorkspaceMemberInfo[] = [
      { person: TARGET, role: AccountRole.Owner },
      { person: 'other-uuid' as any, role: AccountRole.Owner }
    ]
    const res = await setWorkspaceMemberRole(ctx, mockDb(AccountRole.Owner, members), null, ADMIN_TOKEN, {
      accountUuid: TARGET,
      workspaceUuid: WS,
      newRole: AccountRole.User
    })
    expect(res).toEqual({ ok: true })
  })

  it('allows changing role when target is already non-Owner', async () => {
    const res = await setWorkspaceMemberRole(ctx, mockDb(AccountRole.User), null, ADMIN_TOKEN, {
      accountUuid: TARGET,
      workspaceUuid: WS,
      newRole: AccountRole.Maintainer
    })
    expect(res).toEqual({ ok: true })
  })

  describe('rejects non-assignable roles before any DB access', () => {
    it.each([
      ['Admin', AccountRole.Admin],
      ['DocGuest', AccountRole.DocGuest],
      ['ReadOnlyGuest', AccountRole.ReadOnlyGuest],
      ["'NaN'", 'NaN' as any],
      ['undefined', undefined as any]
    ])('%s -> BadRequest, no write, no audit', async (_name, newRole) => {
      const db = mockDb(AccountRole.User, [{ person: TARGET, role: AccountRole.Owner }])
      db.getWorkspaceRole = jest.fn(async () => AccountRole.User)
      db.updateWorkspaceRole = jest.fn(async () => undefined)
      db.updateWorkspaceRoleIfOtherOwnerExists = jest.fn(async () => true)
      db.adminAuditLog = { insert: jest.fn(async () => undefined) }
      const p = setWorkspaceMemberRole(ctx, db, null, ADMIN_TOKEN, {
        accountUuid: TARGET,
        workspaceUuid: WS,
        newRole
      })
      await expect(p).rejects.toThrow(PlatformError)
      await expect(p).rejects.toMatchObject({ status: { code: platform.status.BadRequest } })
      expect(db.getWorkspaceRole).not.toHaveBeenCalled()
      expect(db.updateWorkspaceRole).not.toHaveBeenCalled()
      expect(db.updateWorkspaceRoleIfOtherOwnerExists).not.toHaveBeenCalled()
      expect(db.adminAuditLog.insert).not.toHaveBeenCalled()
    })

    it.each([AccountRole.Guest, AccountRole.User, AccountRole.Maintainer, AccountRole.Owner])(
      'still accepts %s',
      async (newRole) => {
        const res = await setWorkspaceMemberRole(ctx, mockDb(AccountRole.User), null, ADMIN_TOKEN, {
          accountUuid: TARGET,
          workspaceUuid: WS,
          newRole
        })
        expect(res).toEqual({ ok: true })
      }
    )
  })
})
