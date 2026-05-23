//
// Copyright © 2026 Hardcore Engineering Inc.
//

import { MeasureContext, AccountRole, WorkspaceMemberInfo } from '@hcengineering/core'
import { PlatformError } from '@hcengineering/platform'

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
    adminAuditLog: { insert: async () => undefined }
  }
}

import { setWorkspaceMemberRole } from '../operations'

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
})
