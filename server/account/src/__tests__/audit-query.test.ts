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
  OWNER_AUDIT_EVENTS,
  type AccountUuid,
  type MeasureContext,
  type WorkspaceUuid
} from '@hcengineering/core'
import platform from '@hcengineering/platform'
import type { AuditRecord } from '@hcengineering/server-core'
import { decodeTokenVerbose, type Token } from '@hcengineering/server-token'
import { getWorkspaceAuditEvents } from '../audit-operations'
import { getMethods } from '../operations'
import type { AccountDB, AuditEventStore, WorkspaceAuditQuery } from '../types'

jest.mock('@hcengineering/server-token', () => ({
  ...jest.requireActual('@hcengineering/server-token'),
  decodeTokenVerbose: jest.fn()
}))

const account = 'owner' as AccountUuid
const workspace = 'workspace-a' as WorkspaceUuid
const claims: Token = { account, workspace, extra: {} }
const context: Partial<MeasureContext> = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
const ctx = context as MeasureContext
const findWorkspace: jest.MockedFunction<AuditEventStore['findWorkspace']> = jest.fn()
const store: AuditEventStore = { insert: jest.fn(), findWorkspace }
const db: Partial<AccountDB> = { audit: store, getWorkspaceRole: jest.fn() }
const query: WorkspaceAuditQuery = { from: 0, to: 2000, limit: 1 }
const record: AuditRecord = {
  schemaVersion: 1,
  eventId: '00000000-0000-4000-8000-000000000002',
  occurredAt: 1000,
  sourceService: 'account',
  event: 'workspace.member.role.change',
  outcome: 'succeeded',
  workspaceUuid: workspace,
  targetAccountUuid: 'member',
  targetRole: 'ADMIN',
  subjectEmailHash: 'private-email-hash',
  targetEmailHash: 'another-private-hash',
  futurePrivateAttribute: 'private-value'
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(decodeTokenVerbose).mockReturnValue(claims)
  ;(db.getWorkspaceRole as jest.Mock).mockResolvedValue(AccountRole.Owner)
  findWorkspace.mockResolvedValue([record])
})

test.each([
  null,
  AccountRole.User,
  AccountRole.Admin,
  AccountRole.Maintainer,
  AccountRole.Guest,
  AccountRole.ReadOnlyGuest
])('rejects non-owners including instance admins with persisted role %s', async (role) => {
  const admin: Token = { ...claims, extra: { admin: 'true' } }
  jest.mocked(decodeTokenVerbose).mockReturnValue(admin)
  ;(db.getWorkspaceRole as jest.Mock).mockResolvedValue(role)
  await expect(getWorkspaceAuditEvents(ctx, db as AccountDB, null, 'token', query)).rejects.toMatchObject({
    status: { code: platform.status.Forbidden }
  })
  expect(findWorkspace).not.toHaveBeenCalled()
})

test('uses the token workspace even when the caller supplies another workspace', async () => {
  const supplied: WorkspaceAuditQuery & { workspaceUuid: string } = { ...query, workspaceUuid: 'workspace-b' }
  await getWorkspaceAuditEvents(ctx, db as AccountDB, null, 'token', supplied)
  expect(db.getWorkspaceRole).toHaveBeenCalledWith(account, workspace)
  expect(findWorkspace).toHaveBeenCalledWith(workspace, expect.objectContaining(query), OWNER_AUDIT_EVENTS)
})

test('rechecks the persisted role after ownership is revoked', async () => {
  await getWorkspaceAuditEvents(ctx, db as AccountDB, null, 'token', query)
  ;(db.getWorkspaceRole as jest.Mock).mockResolvedValue(AccountRole.Maintainer)
  await expect(getWorkspaceAuditEvents(ctx, db as AccountDB, null, 'token', query)).rejects.toBeDefined()
  expect(findWorkspace).toHaveBeenCalledTimes(1)
})

test('does not expose private hashes or arbitrary future attributes', async () => {
  const page = await getWorkspaceAuditEvents(ctx, db as AccountDB, null, 'token', query)
  expect(page.events[0].attributes).toEqual({ targetAccountUuid: 'member', targetRole: 'ADMIN' })
  expect(JSON.stringify(page)).not.toMatch(/private-|futurePrivateAttribute/)
  expect(page.nextCursor).toBeUndefined()
})

test('pages equal timestamps with event IDs and returns no speculative cursor at the end', async () => {
  const second: AuditRecord = { ...record, eventId: '00000000-0000-4000-8000-000000000001' }
  findWorkspace.mockResolvedValueOnce([record, second]).mockResolvedValueOnce([second])
  const first = await getWorkspaceAuditEvents(ctx, db as AccountDB, null, 'token', query)
  expect(first.events).toHaveLength(1)
  expect(first.nextCursor).toEqual({ occurredAt: record.occurredAt, eventId: record.eventId })
  const next = await getWorkspaceAuditEvents(ctx, db as AccountDB, null, 'token', {
    ...query,
    cursor: first.nextCursor
  })
  expect(next.events[0].eventId).toBe(second.eventId)
  expect(next.nextCursor).toBeUndefined()
})

test.each([
  { from: -1 },
  { from: NaN },
  { to: 0 },
  { limit: 101 },
  { limit: 0 },
  { event: "event' OR TRUE" },
  { event: 'account.rpc' },
  { event: 'account.login' },
  { event: 'integration.secrets.list' },
  { event: 'future.unknown.event' },
  { outcome: 'other' },
  { cursor: null },
  { cursor: { occurredAt: 1, eventId: 'invalid-uuid' } }
])('rejects malformed external filters %j before querying the store', async (patch) => {
  const supplied: { from: unknown, to: unknown } = { ...query, ...patch }
  await expect(
    getWorkspaceAuditEvents(ctx, db as AccountDB, null, 'token', supplied as WorkspaceAuditQuery)
  ).rejects.toMatchObject({ status: { code: platform.status.BadRequest } })
  expect(findWorkspace).not.toHaveBeenCalled()
})

test.each([undefined, null])('rejects missing query parameters %s as BadRequest', async (params) => {
  const result =
    params === undefined
      ? getWorkspaceAuditEvents(ctx, db as AccountDB, null, 'token')
      : getWorkspaceAuditEvents(ctx, db as AccountDB, null, 'token', params)
  await expect(result).rejects.toMatchObject({ status: { code: platform.status.BadRequest } })
  expect(findWorkspace).not.toHaveBeenCalled()
})

test.each([undefined, null])('the registered RPC returns BadRequest for missing parameters %s', async (params) => {
  const handler = getMethods().getWorkspaceAuditEvents
  if (handler === undefined) throw new Error('Missing audit query handler')
  const request: Record<string, unknown> = { id: 1, method: 'getWorkspaceAuditEvents' }
  if (params !== undefined) request.params = params
  const response = await handler(ctx, db as AccountDB, null, request, 'token')
  expect(response.error.code).toBe(platform.status.BadRequest)
  expect(findWorkspace).not.toHaveBeenCalled()
})

test('requires a workspace token and rejects API keys even for owners', async () => {
  const unscoped: Token = { ...claims, workspace: '' as WorkspaceUuid }
  jest.mocked(decodeTokenVerbose).mockReturnValueOnce(unscoped)
  await expect(getWorkspaceAuditEvents(ctx, db as AccountDB, null, 'token', query)).rejects.toBeDefined()
  const apiKey: Token = { ...claims, extra: { apiKey: 'key' } }
  jest.mocked(decodeTokenVerbose).mockReturnValueOnce(apiKey)
  await expect(getWorkspaceAuditEvents(ctx, db as AccountDB, null, 'token', query)).rejects.toBeDefined()
  expect(findWorkspace).not.toHaveBeenCalled()
})

test('the registered RPC rejects API-key access before querying the journal', async () => {
  const apiKey: Token = { ...claims, extra: { apiKey: 'key' } }
  jest.mocked(decodeTokenVerbose).mockReturnValue(apiKey)
  const handler = getMethods().getWorkspaceAuditEvents
  if (handler === undefined) throw new Error('Missing audit query handler')
  const request: Record<string, unknown> = { id: 1, method: 'getWorkspaceAuditEvents', params: query }
  const response = await handler(ctx, db as AccountDB, null, request, 'token')
  expect(response.error.code).toBe(platform.status.Forbidden)
  expect(findWorkspace).not.toHaveBeenCalled()
})

test('forces owner visibility even when the caller supplies its own event list', async () => {
  const supplied: WorkspaceAuditQuery & { events: string[] } = { ...query, events: ['account.rpc'] }
  await getWorkspaceAuditEvents(ctx, db as AccountDB, null, 'token', supplied)
  expect(findWorkspace).toHaveBeenCalledWith(workspace, expect.objectContaining(query), OWNER_AUDIT_EVENTS)
  expect(OWNER_AUDIT_EVENTS).not.toContain('account.rpc')
  expect(OWNER_AUDIT_EVENTS).not.toContain('account.login')
  expect(OWNER_AUDIT_EVENTS).toContain('workspace.member.role.change')
})

test('keeps allowlisted technical attributes in the projection without exposing arbitrary attributes', async () => {
  const technical: AuditRecord = { ...record, chunkIndex: 1, chunkCount: 2, accountIdsCount: 20 }
  findWorkspace.mockResolvedValueOnce([technical])
  const page = await getWorkspaceAuditEvents(ctx, db as AccountDB, null, 'token', query)
  expect(page.events[0].attributes).toEqual({
    targetAccountUuid: 'member',
    targetRole: 'ADMIN',
    chunkIndex: 1,
    chunkCount: 2,
    accountIdsCount: 20
  })
  expect(JSON.stringify(page)).not.toContain('futurePrivateAttribute')
})
