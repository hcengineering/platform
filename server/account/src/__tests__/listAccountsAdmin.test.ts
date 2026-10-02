//
// Copyright © 2026 Hardcore Engineering Inc.
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

import { type MeasureContext } from '@hcengineering/core'
import platform, { setMetadata } from '@hcengineering/platform'
import serverToken, { generateToken } from '@hcengineering/server-token'
import { type Db } from 'mongodb'

import { MongoAccountDB } from '../collections/mongo'
import { getMethods } from '../operations'
import { accountPlugin } from '../plugin'
import { listAccountsAdmin } from '../serviceOperations'
import type { AccountDB } from '../types'

setMetadata(serverToken.metadata.Secret, 'test-secret')

const ADMIN = 'a1111111-1111-4111-9111-111111111111' as any
const ctx = { newChild: () => ctx, info: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as MeasureContext
const adminToken = generateToken(ADMIN, undefined, { admin: 'true' })

const row = {
  uuid: 'a2222222-2222-4222-9222-222222222222',
  firstName: 'Ada',
  lastName: 'Lovelace',
  primaryEmail: 'ada@example.com',
  authMethods: ['email'],
  hasPassword: true,
  workspaceCount: 1,
  status: 'active',
  lastActivityAt: null,
  isAdmin: false
}

function makeDb (): AccountDB {
  return {
    account: { findOne: jest.fn(async () => ({ uuid: ADMIN, tokenVersion: 0, disabledAt: null })) },
    listAccountsAdmin: jest.fn(async () => ({ rows: [row], total: 7 }))
  } as unknown as AccountDB
}

describe('listAccountsAdmin', () => {
  const envBackup = process.env.ADMIN_EMAILS

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.ADMIN_EMAILS = ' Admin@Example.com ,other@example.com'
  })

  afterAll(() => {
    process.env.ADMIN_EMAILS = envBackup
  })

  it('returns rows and total', async () => {
    const db = makeDb()
    const res = await listAccountsAdmin(ctx, db, null, adminToken, { pagination: { limit: 10, offset: 0 } })
    expect(res).toEqual({ total: 7, accounts: [row] })
  })

  it('maps the public parameters and passes the configured admin emails', async () => {
    const db = makeDb()
    await listAccountsAdmin(ctx, db, null, adminToken, {
      search: 'ada',
      statusIn: ['disabled'],
      authMethodIn: ['oidc', 'none'],
      nameContains: 'Ada',
      emailContains: 'example',
      workspaceUuidsIn: ['b1111111-1111-4111-9111-111111111111' as any],
      workspaceCountRange: { min: 1, max: 3 },
      lastActivityFilter: { kind: 'range', fromMs: 10, toMs: 20 },
      orphan: true,
      isAdmin: false,
      sort: { field: 'last_activity', direction: 'desc' },
      pagination: { limit: 25, offset: 50 }
    })
    expect(db.listAccountsAdmin).toHaveBeenCalledWith({
      search: 'ada',
      statusIn: ['disabled'],
      authMethodIn: ['oidc', 'none'],
      nameContains: 'Ada',
      emailContains: 'example',
      workspaceUuidsIn: ['b1111111-1111-4111-9111-111111111111'],
      wsMin: 1,
      wsMax: 3,
      lastActivityFilter: { kind: 'range', fromMs: 10, toMs: 20 },
      orphan: true,
      isAdmin: false,
      sort: { field: 'last_activity', direction: 'desc' },
      pagination: { limit: 25, offset: 50 },
      adminEmails: ['admin@example.com', 'other@example.com']
    })
  })

  it('drops malformed parameter values instead of passing them to the database', async () => {
    const db = makeDb()
    await listAccountsAdmin(ctx, db, null, adminToken, {
      search: 42,
      statusIn: ['active', 'bogus'],
      authMethodIn: 'oidc',
      workspaceCountRange: { min: 'x' },
      lastActivityFilter: { kind: 'before', tsMs: 1 },
      orphan: 'yes',
      sort: { field: 'password', direction: 'up' },
      pagination: { limit: '10' }
    } as any)
    expect(db.listAccountsAdmin).toHaveBeenCalledWith(
      expect.objectContaining({
        search: undefined,
        statusIn: ['active'],
        authMethodIn: undefined,
        wsMin: undefined,
        lastActivityFilter: undefined,
        orphan: undefined,
        sort: undefined,
        pagination: { limit: undefined, offset: undefined }
      })
    )
  })

  describe('rejects malformed values with BadRequest before reaching the database (RPC path)', () => {
    const call = async (params: any): Promise<any> =>
      await getMethods().listAccountsAdmin?.(ctx, makeDb(), null, { id: 1, params }, adminToken)
    const badRequest = { error: expect.objectContaining({ code: platform.status.BadRequest }) }

    it.each([
      ['a malformed workspace UUID', { workspaceUuidsIn: ['not-a-uuid'] }],
      ['a workspace UUID with trailing data', { workspaceUuidsIn: ['b1111111-1111-4111-9111-111111111111x'] }],
      ['a non-string workspace UUID', { workspaceUuidsIn: ['b1111111-1111-4111-9111-111111111111', { $ne: null }] }],
      ['a fractional limit', { pagination: { limit: 10.5, offset: 0 } }],
      ['a fractional offset', { pagination: { limit: 10, offset: 0.25 } }],
      ['an unsafe integer offset', { pagination: { limit: 10, offset: 2 ** 60 } }],
      ['a fractional workspace count bound', { workspaceCountRange: { min: 1.5 } }],
      ['a fractional last-activity bound', { lastActivityFilter: { kind: 'range', fromMs: 1.5 } }]
    ])('%s', async (_name, params) => {
      const db = makeDb()
      const res = await getMethods().listAccountsAdmin?.(ctx, db, null, { id: 1, params }, adminToken)
      expect(res).toEqual(badRequest)
      expect(db.listAccountsAdmin).not.toHaveBeenCalled()
    })

    it('accepts valid UUIDs (any case) and integer pagination', async () => {
      const res = await call({
        workspaceUuidsIn: ['B1111111-1111-4111-9111-111111111111'],
        pagination: { limit: 10, offset: 20 }
      })
      expect(res).toEqual({ id: 1, result: { total: 7, accounts: [row] } })
    })
  })

  it('requires the admin claim', async () => {
    const db = makeDb()
    const err = await listAccountsAdmin(ctx, db, null, generateToken(ADMIN), {
      pagination: { limit: 10, offset: 0 }
    }).catch((e) => e)
    expect(err.status.code).toBe(platform.status.Forbidden)
    expect(db.listAccountsAdmin).not.toHaveBeenCalled()
  })

  it('is registered and reachable through wrap()', async () => {
    const db = makeDb()
    const res = await getMethods().listAccountsAdmin?.(
      ctx,
      db,
      null,
      { id: 1, params: { pagination: { limit: 10, offset: 0 } } },
      adminToken
    )
    expect(res).toEqual({ id: 1, result: { total: 7, accounts: [row] } })
  })

  it('reports NotSupportedOnBackend (not InternalServerError) on MongoDB', async () => {
    const mongo = new MongoAccountDB({ collection: jest.fn() } as unknown as Db)
    ;(mongo as any).account = { findOne: jest.fn(async () => null) }
    const res = await getMethods().listAccountsAdmin?.(
      ctx,
      mongo,
      null,
      { id: 1, params: { pagination: { limit: 10, offset: 0 } } },
      adminToken
    )
    expect(res).toEqual({
      error: expect.objectContaining({
        code: accountPlugin.status.NotSupportedOnBackend,
        params: { backend: 'mongo', method: 'listAccountsAdmin' }
      })
    })
  })
})
