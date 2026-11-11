//
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//

import { AccountRole, SocialIdType, type MeasureContext } from '@hcengineering/core'

import { synchronizeOidcWorkspaceRoles } from '../utils'

const account = '00000000-0000-0000-0000-000000000001' as any
const workspaceOne = '00000000-0000-0000-0000-000000000011' as any
const workspaceTwo = '00000000-0000-0000-0000-000000000012' as any
const workspaceWithoutRules = '00000000-0000-0000-0000-000000000013' as any

function createDb (roles: Map<any, AccountRole>): any {
  const db = {
    socialId: { findOne: jest.fn().mockResolvedValue({ type: SocialIdType.OIDC, personUuid: account }) },
    getWorkspaceRole: jest.fn(async (_account: any, workspace: any) => roles.get(workspace) ?? null),
    getWorkspaceMembers: jest.fn(async (workspace: any) => {
      const role = roles.get(workspace)
      return role === AccountRole.Owner
        ? [{ person: account, role }]
        : [{ person: 'another-account', role: AccountRole.Owner }]
    }),
    assignWorkspace: jest.fn(async (_account: any, workspace: any, role: AccountRole) => roles.set(workspace, role)),
    updateWorkspaceRole: jest.fn(async (_account: any, workspace: any, role: AccountRole) =>
      roles.set(workspace, role)
    ),
    unassignWorkspace: jest.fn(async (_account: any, workspace: any) => roles.delete(workspace)),
    updateOrUnassignWorkspaceOwnerIfNotLast: jest.fn(async (
      _account: any,
      workspace: any,
      role: AccountRole | null
    ) => {
      const owners = await db.getWorkspaceMembers(workspace)
      if (owners.filter((member: any) => member.role === AccountRole.Owner).length < 2) return false
      if (role == null) roles.delete(workspace)
      else roles.set(workspace, role)
      return true
    })
  }
  return db
}

describe('OIDC workspace role synchronization', () => {
  test.each([AccountRole.Owner, AccountRole.Maintainer, AccountRole.User, AccountRole.Guest])(
    'auto-joins %s through the invite membership primitives',
    async (role) => {
      const roles = new Map<any, AccountRole>([[workspaceWithoutRules, AccountRole.Maintainer]])
      const db = createDb(roles)
      const ctx = { info: jest.fn(), warn: jest.fn() } as unknown as MeasureContext

      await synchronizeOidcWorkspaceRoles(ctx, db, account, 'subject', [
        { workspaceUuid: workspaceOne, workspaceUrl: 'engineering', role }
      ])

      expect(db.assignWorkspace).toHaveBeenCalledWith(account, workspaceOne, role)
      expect(roles.get(workspaceWithoutRules)).toBe(AccountRole.Maintainer)
      expect(JSON.stringify((ctx.info as jest.Mock).mock.calls)).not.toContain('owners')
    }
  )

  test('aligns roles in both directions and removes membership with no matching group', async () => {
    const roles = new Map<any, AccountRole>([
      [workspaceOne, AccountRole.Maintainer],
      [workspaceTwo, AccountRole.User]
    ])
    const db = createDb(roles)
    const ctx = { info: jest.fn(), warn: jest.fn() } as unknown as MeasureContext

    await synchronizeOidcWorkspaceRoles(ctx, db, account, 'subject', [
      { workspaceUuid: workspaceOne, workspaceUrl: 'engineering', role: AccountRole.Owner },
      { workspaceUuid: workspaceTwo, workspaceUrl: 'external', role: null }
    ])

    expect(db.updateWorkspaceRole).toHaveBeenCalledWith(account, workspaceOne, AccountRole.Owner)
    expect(db.unassignWorkspace).toHaveBeenCalledWith(account, workspaceTwo)
  })

  test('demotes a non-last owner', async () => {
    const roles = new Map<any, AccountRole>([[workspaceOne, AccountRole.Owner]])
    const db = createDb(roles)
    db.getWorkspaceMembers.mockResolvedValue([
      { person: account, role: AccountRole.Owner },
      { person: 'another-account', role: AccountRole.Owner }
    ])
    const ctx = { info: jest.fn(), warn: jest.fn() } as unknown as MeasureContext

    await synchronizeOidcWorkspaceRoles(ctx, db, account, 'subject', [
      { workspaceUuid: workspaceOne, workspaceUrl: 'engineering', role: AccountRole.Guest }
    ])

    expect(db.updateOrUnassignWorkspaceOwnerIfNotLast).toHaveBeenCalledWith(account, workspaceOne, AccountRole.Guest)
  })

  test('does not change a local account without an OIDC social identity', async () => {
    const roles = new Map<any, AccountRole>([[workspaceOne, AccountRole.User]])
    const db = createDb(roles)
    db.socialId.findOne.mockResolvedValue(null)
    const ctx = { info: jest.fn(), warn: jest.fn() } as unknown as MeasureContext

    await synchronizeOidcWorkspaceRoles(ctx, db, account, 'subject', [
      { workspaceUuid: workspaceOne, workspaceUrl: 'engineering', role: AccountRole.Guest }
    ])

    expect(db.updateWorkspaceRole).not.toHaveBeenCalled()
    expect(roles.get(workspaceOne)).toBe(AccountRole.User)
  })

  test('keeps the last owner unchanged when a rule would demote or remove it', async () => {
    const roles = new Map<any, AccountRole>([[workspaceOne, AccountRole.Owner]])
    const db = createDb(roles)
    db.updateOrUnassignWorkspaceOwnerIfNotLast.mockResolvedValue(false)
    const ctx = { info: jest.fn(), warn: jest.fn() } as unknown as MeasureContext

    await synchronizeOidcWorkspaceRoles(ctx, db, account, 'subject', [
      { workspaceUuid: workspaceOne, workspaceUrl: 'engineering', role: null }
    ])

    expect(db.unassignWorkspace).not.toHaveBeenCalled()
    expect(ctx.warn).toHaveBeenCalledWith('oidc_workspace_role_sync_last_owner', {
      sub: 'subject',
      workspace: 'engineering',
      oldRole: AccountRole.Owner,
      newRole: null
    })
  })

  test('keeps one owner when two OIDC demotions interleave', async () => {
    const firstAccount = account
    const secondAccount = '00000000-0000-0000-0000-000000000002' as any
    const ownerRoles = new Map<any, AccountRole>([
      [firstAccount, AccountRole.Owner],
      [secondAccount, AccountRole.Owner]
    ])
    let previous = Promise.resolve()

    const db = {
      socialId: { findOne: jest.fn().mockResolvedValue({ type: SocialIdType.OIDC }) },
      getWorkspaceRole: jest.fn(async (candidate: any) => ownerRoles.get(candidate) ?? null),
      updateOrUnassignWorkspaceOwnerIfNotLast: jest.fn(async (
        candidate: any,
        _workspace: any,
        role: AccountRole | null
      ) => {
        // Models the database's per-workspace serialization point. Both syncs
        // enter before either mutation is released, but only the first may
        // change an OWNER row.
        const waitFor = previous
        let release: () => void = () => {}
        previous = new Promise<void>((resolve) => {
          release = resolve
        })
        await waitFor
        const hasAnotherOwner = [...ownerRoles.entries()].some(
          ([owner, ownerRole]) => owner !== candidate && ownerRole === AccountRole.Owner
        )
        if (hasAnotherOwner) {
          if (role == null) ownerRoles.delete(candidate)
          else ownerRoles.set(candidate, role)
        }
        release()
        return hasAnotherOwner
      })
    }
    const ctx = { info: jest.fn(), warn: jest.fn() } as unknown as MeasureContext

    await Promise.all([
      synchronizeOidcWorkspaceRoles(ctx, db as any, firstAccount, 'subject-one', [
        { workspaceUuid: workspaceOne, workspaceUrl: 'engineering', role: AccountRole.User }
      ]),
      synchronizeOidcWorkspaceRoles(ctx, db as any, secondAccount, 'subject-two', [
        { workspaceUuid: workspaceOne, workspaceUrl: 'engineering', role: AccountRole.Guest }
      ])
    ])

    expect([...ownerRoles.values()].filter((role) => role === AccountRole.Owner)).toHaveLength(1)
    expect(db.updateOrUnassignWorkspaceOwnerIfNotLast).toHaveBeenCalledTimes(2)
  })
})
