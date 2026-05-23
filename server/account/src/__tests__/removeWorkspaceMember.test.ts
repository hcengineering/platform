//
// Copyright © 2026 Hardcore Engineering Inc.
//

import { MeasureContext, AccountRole, WorkspaceMemberInfo } from '@hcengineering/core'
import { PlatformError } from '@hcengineering/platform'

const ADMIN_TOKEN = 'admin-token'
const TARGET = 'target-uuid' as any
const WS = 'ws-uuid' as any

jest.mock('@hcengineering/server-token', () => ({
  decodeTokenVerbose: (ctx: any, token: string) => {
    if (token === ADMIN_TOKEN) return { account: 'admin-uuid', extra: { admin: 'true' } }
    throw new Error('bad token')
  },
  TokenError: class extends Error {}
}))

const ctx = { newChild: () => ctx, info: () => {} } as unknown as MeasureContext

function mockDb (currentRole: AccountRole | null, members: WorkspaceMemberInfo[] = []): any {
  return {
    getWorkspaceRole: async () => currentRole,
    getWorkspaceMembers: async () => members,
    unassignWorkspace: async () => undefined,
    adminAuditLog: { insert: async () => undefined }
  }
}

import { removeWorkspaceMember } from '../operations'

describe('removeWorkspaceMember', () => {
  it('returns wasMember=true when target was in workspace', async () => {
    const members: WorkspaceMemberInfo[] = [
      { person: TARGET, role: AccountRole.User },
      { person: 'other-uuid' as any, role: AccountRole.Owner }
    ]
    const res = await removeWorkspaceMember(ctx, mockDb(AccountRole.User, members), null, ADMIN_TOKEN, {
      accountUuid: TARGET,
      workspaceUuid: WS
    })
    expect(res).toEqual({ ok: true, wasMember: true })
  })

  it('returns wasMember=false when target was NOT in workspace', async () => {
    const res = await removeWorkspaceMember(ctx, mockDb(null), null, ADMIN_TOKEN, {
      accountUuid: TARGET,
      workspaceUuid: WS
    })
    expect(res).toEqual({ ok: true, wasMember: false })
  })

  it('rejects removal of the last Owner', async () => {
    const members: WorkspaceMemberInfo[] = [{ person: TARGET, role: AccountRole.Owner }]
    await expect(
      removeWorkspaceMember(ctx, mockDb(AccountRole.Owner, members), null, ADMIN_TOKEN, {
        accountUuid: TARGET,
        workspaceUuid: WS
      })
    ).rejects.toThrow(PlatformError)
  })

  it('allows removing an Owner when other Owners exist', async () => {
    const members: WorkspaceMemberInfo[] = [
      { person: TARGET, role: AccountRole.Owner },
      { person: 'other-uuid' as any, role: AccountRole.Owner }
    ]
    const res = await removeWorkspaceMember(ctx, mockDb(AccountRole.Owner, members), null, ADMIN_TOKEN, {
      accountUuid: TARGET,
      workspaceUuid: WS
    })
    expect(res).toEqual({ ok: true, wasMember: true })
  })
})
