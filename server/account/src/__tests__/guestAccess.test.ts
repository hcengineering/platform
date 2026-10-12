//
// Copyright © 2026 TraceX SAS.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import {
  AccountRole,
  docGuestAccountUuid,
  readOnlyGuestAccountUuid,
  type AccountUuid,
  type MeasureContext,
  type WorkspaceUuid
} from '@hcengineering/core'
import platform from '@hcengineering/platform'
import { decodeTokenVerbose } from '@hcengineering/server-token'

import { getMethods } from '../operations'
import { performWorkspaceOperation } from '../serviceOperations'
import type { AccountDB } from '../types'
import { getRegions, wrap } from '../utils'

jest.mock('../utils', () => ({
  ...jest.requireActual('../utils'),
  getRegions: jest.fn()
}))

jest.mock('@hcengineering/server-token', () => ({
  TokenError: jest.requireActual('@hcengineering/server-token').TokenError,
  decodeTokenVerbose: jest.fn(),
  decodeToken: jest.fn(),
  generateToken: jest.fn()
}))

const ctx = { error: jest.fn(), info: jest.fn(), warn: jest.fn() } as unknown as MeasureContext
const workspace = 'test-workspace' as WorkspaceUuid
const personalGuest = 'personal-guest' as AccountUuid
const methods = getMethods()

const db = {
  getWorkspaceRole: jest.fn(),
  getWorkspaceRoles: jest.fn(),
  person: { findOne: jest.fn(), update: jest.fn() },
  mailboxSecret: { findOne: jest.fn() },
  apiKey: { insertOne: jest.fn() },
  unassignWorkspace: jest.fn(),
  getAccountWorkspaces: jest.fn(),
  workspace: { find: jest.fn() },
  workspaceStatus: { find: jest.fn(), update: jest.fn() }
} as unknown as AccountDB

function setToken (account: AccountUuid, role: AccountRole, extra: Record<string, string> = {}): void {
  ;(decodeTokenVerbose as jest.Mock).mockReturnValue({ account, workspace, extra })
  ;(db.getWorkspaceRole as jest.Mock).mockResolvedValue(role)
}

async function call (
  method: keyof typeof methods,
  params: Record<string, unknown> = {}
): Promise<Record<string, unknown>> {
  const handler = methods[method]
  if (handler === undefined) throw new Error(`Missing account method: ${method}`)
  return await handler(ctx, db, null, { id: 1, params }, 'test-token')
}

describe('guest account RPC access', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('denies privileged operations to a personal guest', async () => {
    setToken(personalGuest, AccountRole.Guest)

    for (const method of ['getMailboxSecret', 'performWorkspaceOperation'] as const) {
      const result = await call(method)
      expect((result.error as { code: string }).code).toBe(platform.status.Forbidden)
    }
    expect(db.mailboxSecret.findOne).not.toHaveBeenCalled()
  })

  test('leaves workspace creation unchanged for all guest roles', async () => {
    for (const [account, role] of [
      [personalGuest, AccountRole.Guest],
      [readOnlyGuestAccountUuid, AccountRole.ReadOnlyGuest],
      [docGuestAccountUuid, AccountRole.DocGuest]
    ] as const) {
      setToken(account, role)
      const result = await call('createWorkspace')
      expect((result.error as { code: string }).code).toBe(platform.status.BadRequest)
    }
  })

  test('allows token-less getRegionInfo readiness checks from services', async () => {
    const regions = [{ region: 'eu', name: 'Europe' }]
    ;(getRegions as jest.Mock).mockReturnValue(regions)

    const result = await methods.getRegionInfo?.(ctx, db, null, { id: 1, params: {} }, undefined)

    expect(result?.error).toBeUndefined()
    expect(result?.result).toEqual(regions)
  })

  test('wrap denies an unmarked handler to a guest', async () => {
    setToken(personalGuest, AccountRole.Guest)
    const handler = jest.fn().mockResolvedValue({ id: 1, result: true })
    const guarded = wrap(handler)

    const result = await guarded(ctx, db, null, { id: 1, params: {} }, 'test-token')

    expect((result.error as { code: string }).code).toBe(platform.status.Forbidden)
    expect(handler).not.toHaveBeenCalled()
  })

  test('treats a revoked workspace role as read-only guest access', async () => {
    setToken(personalGuest, AccountRole.Guest)
    ;(db.getWorkspaceRole as jest.Mock).mockResolvedValue(null)

    for (const method of ['changeUsername', 'createApiKey'] as const) {
      const result = await call(method)
      expect((result.error as { code: string }).code).toBe(platform.status.Forbidden)
    }
    expect(db.person.update).not.toHaveBeenCalled()
    expect(db.apiKey.insertOne).not.toHaveBeenCalled()
  })

  test('treats a workspace-free account without roles as read-only guest access', async () => {
    ;(decodeTokenVerbose as jest.Mock).mockReturnValue({ account: personalGuest, extra: {} })
    ;(db.getWorkspaceRoles as jest.Mock).mockResolvedValue(new Map())

    const result = await call('changeUsername', { first: 'New' })

    expect((result.error as { code: string }).code).toBe(platform.status.Forbidden)
    expect(db.person.update).not.toHaveBeenCalled()
  })

  test('allows joining by invite for an account without workspaces and logs denials', async () => {
    ;(decodeTokenVerbose as jest.Mock).mockReturnValue({ account: personalGuest, extra: {} })
    ;(db.getWorkspaceRoles as jest.Mock).mockResolvedValue(new Map())

    for (const method of ['joinByToken', 'checkJoin'] as const) {
      const result = await call(method, { inviteId: '' })
      // reaches the handler (BadRequest for empty invite) instead of being rejected by the guest guard
      expect((result.error as { code: string }).code).toBe(platform.status.BadRequest)
    }

    for (const [account, extra] of [
      [readOnlyGuestAccountUuid, { readonly: 'true' }],
      [docGuestAccountUuid, { guest: 'true' }]
    ] as const) {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({ account, extra })
      const result = await call('joinByToken', { inviteId: 'invite' })
      expect((result.error as { code: string }).code).toBe(platform.status.Forbidden)
    }
    expect(ctx.warn).toHaveBeenCalledWith(
      'Guest access to account method denied',
      expect.objectContaining({ policy: 'joinWorkspace' })
    )
  })

  test('logs failures to determine guest access', async () => {
    setToken(personalGuest, AccountRole.Guest)
    const error = new Error('Role lookup failed')
    ;(db.getWorkspaceRole as jest.Mock).mockRejectedValueOnce(error)

    const result = await call('getMailboxSecret', { mailbox: 'private@example.com' })

    expect(ctx.error).toHaveBeenCalledWith('Failed to determine guest access', { error })
    expect((result.error as { code: string }).code).toBe(platform.status.Unauthorized)
  })

  test('keeps personal account updates available to a guest', async () => {
    setToken(personalGuest, AccountRole.Guest)
    ;(db.person.update as jest.Mock).mockResolvedValue(undefined)

    const result = await call('changeUsername', { first: 'New' })

    expect(result.error).toBeUndefined()
    expect(db.person.update).toHaveBeenCalledWith({ uuid: personalGuest }, { firstName: 'New', lastName: '' })
  })

  test('denies mutations to the shared anonymous guest and lists only anonymous workspaces', async () => {
    setToken(readOnlyGuestAccountUuid, AccountRole.ReadOnlyGuest, { readonly: 'true' })

    for (const method of ['leaveWorkspace', 'changeUsername', 'createApiKey'] as const) {
      const result = await call(method)
      expect((result.error as { code: string }).code).toBe(platform.status.Forbidden)
    }
    ;(db.getAccountWorkspaces as jest.Mock).mockResolvedValue([
      { uuid: workspace, allowReadOnlyGuest: true, status: { mode: 'active', isDisabled: false } },
      { uuid: 'closed-workspace', allowReadOnlyGuest: false, status: { mode: 'active', isDisabled: false } }
    ])
    const visible = await call('getUserWorkspaces')
    expect(visible.result).toEqual([expect.objectContaining({ uuid: workspace })])
    expect(db.unassignWorkspace).not.toHaveBeenCalled()
    expect(db.person.update).not.toHaveBeenCalled()
    expect(db.apiKey.insertOne).not.toHaveBeenCalled()
  })

  test('allows only connection methods for a document guest', async () => {
    setToken(docGuestAccountUuid, AccountRole.DocGuest, { guest: 'true' })

    const allowed = await call('isReadOnlyGuest')
    const denied = await call('getMailboxSecret', { mailbox: 'private@example.com' })

    expect(allowed.result).toBe(false)
    expect((denied.error as { code: string }).code).toBe(platform.status.Forbidden)
    expect(db.mailboxSecret.findOne).not.toHaveBeenCalled()
  })

  test('requires the mail service token for mailbox secrets even for a regular user', async () => {
    setToken('regular-user' as AccountUuid, AccountRole.User)

    const denied = await call('getMailboxSecret', { mailbox: 'private@example.com' })
    expect((denied.error as { code: string }).code).toBe(platform.status.Forbidden)

    ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
      account: 'mail-service',
      workspace,
      extra: { service: 'huly-mail' }
    })
    ;(db.mailboxSecret.findOne as jest.Mock).mockResolvedValue({ secret: 'test-secret' })

    const allowed = await call('getMailboxSecret', { mailbox: 'private@example.com' })
    expect(allowed.result).toEqual({ secret: 'test-secret' })
  })

  test('allows only an owner to restore an archived workspace', async () => {
    setToken(personalGuest, AccountRole.Guest)
    const params = { workspaceId: workspace, event: 'unarchive' as const, params: [] }

    await expect(performWorkspaceOperation(ctx, db, null, 'test-token', params)).rejects.toMatchObject({
      status: { code: platform.status.Forbidden }
    })
    expect(db.workspaceStatus.update).not.toHaveBeenCalled()

    setToken('owner' as AccountUuid, AccountRole.Owner)
    ;(db.workspace.find as jest.Mock).mockResolvedValue([{ uuid: workspace }])
    ;(db.workspaceStatus.find as jest.Mock).mockResolvedValue([{ workspaceUuid: workspace, mode: 'archived' }])

    await expect(performWorkspaceOperation(ctx, db, null, 'test-token', params)).resolves.toBe(true)
    expect(db.workspaceStatus.update).toHaveBeenCalled()
  })
})
