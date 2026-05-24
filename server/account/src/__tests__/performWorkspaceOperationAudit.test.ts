//
// Copyright © 2026 Hardcore Engineering Inc.
//

import { MeasureContext } from '@hcengineering/core'

const ADMIN_TOKEN = 'admin-token'

jest.mock('@hcengineering/server-token', () => ({
  decodeTokenVerbose: (_c: any, t: string) =>
    t === ADMIN_TOKEN
      ? { account: 'admin-uuid', extra: { admin: 'true' }, workspace: 'ws-x' }
      : { account: 'x', extra: {} },
  TokenError: class extends Error {}
}))
jest.mock('../utils', () => ({
  ...jest.requireActual('../utils'),
  verifyTokenVersion: jest.fn(async () => undefined)
}))

const ctx = { newChild: () => ctx, info: () => {}, warn: () => {}, error: () => {} } as unknown as MeasureContext

import { performWorkspaceOperation } from '../serviceOperations'

it('performWorkspaceOperation writes an audit entry per workspace operated on', async () => {
  const inserts: any[] = []
  const db = {
    account: { findOne: async () => ({ uuid: 'admin-uuid', disabledAt: null, tokenVersion: 0 }) },
    socialId: { find: async () => [] },
    workspace: {
      findOne: async () => ({ uuid: 'ws1', name: 'n1', url: 'u1' }),
      find: async () => [{ uuid: 'ws1', name: 'n1', url: 'u1' }]
    },
    workspaceStatus: {
      findOne: async () => ({ workspaceUuid: 'ws1', mode: 'active', processingAttempts: 0 }),
      find: async () => [{ workspaceUuid: 'ws1', mode: 'active', processingAttempts: 0 }],
      update: async () => undefined
    },
    adminAuditLog: { insert: async (entry: any) => { inserts.push(entry) } }
  } as any

  await performWorkspaceOperation(ctx, db, null, ADMIN_TOKEN, {
    workspaceId: 'ws1' as any,
    event: 'archive',
    params: []
  })

  expect(inserts).toHaveLength(1)
  expect(inserts[0].action).toBe('archive_workspace')
  expect(inserts[0].workspaceUuid).toBe('ws1')
  expect(inserts[0].targetAccount).toBeNull()
  expect(inserts[0].adminAccount).toBe('admin-uuid')
})

it('performWorkspaceOperation maps event names to audit action types', async () => {
  const events = [
    { event: 'archive' as const, expected: 'archive_workspace' },
    { event: 'unarchive' as const, expected: 'unarchive_workspace' },
    { event: 'reset-attempts' as const, expected: 'reset_workspace_attempts' }
  ]

  for (const { event, expected } of events) {
    const inserts: any[] = []
    const mode = event === 'unarchive' ? 'archived' : 'active'
    const db = {
      account: { findOne: async () => ({ uuid: 'admin-uuid', disabledAt: null, tokenVersion: 0 }) },
      socialId: { find: async () => [] },
      workspace: {
        findOne: async () => ({ uuid: 'wsX', name: 'n', url: 'u' }),
        find: async () => [{ uuid: 'wsX', name: 'n', url: 'u' }]
      },
      workspaceStatus: {
        findOne: async () => ({ workspaceUuid: 'wsX', mode, processingAttempts: 0 }),
        find: async () => [{ workspaceUuid: 'wsX', mode, processingAttempts: 0 }],
        update: async () => undefined
      },
      adminAuditLog: { insert: async (entry: any) => { inserts.push(entry) } }
    } as any

    await performWorkspaceOperation(ctx, db, null, ADMIN_TOKEN, {
      workspaceId: 'wsX' as any,
      event,
      params: []
    })

    expect(inserts[0]?.action).toBe(expected)
  }
})
