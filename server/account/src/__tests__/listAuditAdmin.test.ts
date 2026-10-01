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
import { type Sql } from 'postgres'

import { MongoAccountDB } from '../collections/mongo'
import { PostgresAdminAuditLogCollection } from '../collections/postgres/postgres'
import { getMethods } from '../operations'
import { accountPlugin } from '../plugin'
import { listAuditAdmin } from '../serviceOperations'
import type { AccountDB, AdminAuditLogListEntry } from '../types'

setMetadata(serverToken.metadata.Secret, 'test-secret')

const ADMIN = 'a1111111-1111-4111-9111-111111111111' as any
const TARGET = 'a2222222-2222-4222-9222-222222222222' as any
const ctx = { newChild: () => ctx, info: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as MeasureContext
const adminToken = generateToken(ADMIN, undefined, { admin: 'true' })

const entry = (overrides: Partial<AdminAuditLogListEntry> = {}): AdminAuditLogListEntry => ({
  id: 'e1',
  tsMs: 1000,
  adminAccount: ADMIN,
  targetAccount: TARGET,
  action: 'disable',
  workspaceUuid: null,
  details: { reason: 'manual_admin_action' },
  adminFirstName: 'Ad',
  adminLastName: 'Min',
  targetFirstName: 'Tar',
  targetLastName: 'Get',
  ...overrides
})

function makeDb (entries: AdminAuditLogListEntry[]): AccountDB {
  return {
    account: { findOne: jest.fn(async () => null) },
    adminAuditLog: { listAuditAdmin: jest.fn(async () => ({ entries, total: entries.length })) }
  } as unknown as AccountDB
}

describe('listAuditAdmin (service)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('maps entries to the public shape', async () => {
    const db = makeDb([entry(), entry({ id: 'e2', targetAccount: null, action: 'archive_workspace' })])
    const res = await listAuditAdmin(ctx, db, null, adminToken, { targetAccount: TARGET })
    expect(res).toEqual({
      total: 2,
      entries: [
        {
          id: 'e1',
          tsMs: 1000,
          admin: { uuid: ADMIN, firstName: 'Ad', lastName: 'Min' },
          action: 'disable',
          targetAccount: { uuid: TARGET, firstName: 'Tar', lastName: 'Get' },
          workspaceUuid: null,
          details: { reason: 'manual_admin_action' }
        },
        expect.objectContaining({ id: 'e2', targetAccount: undefined, action: 'archive_workspace' })
      ]
    })
  })

  it('passes only well-typed filters', async () => {
    const db = makeDb([])
    await listAuditAdmin(ctx, db, null, adminToken, {
      targetAccount: TARGET,
      adminAccount: { $ne: null },
      action: 'disable',
      fromMs: 1,
      toMs: '2',
      limit: 10,
      offset: 20
    } as any)
    expect(db.adminAuditLog.listAuditAdmin).toHaveBeenCalledWith({
      targetAccount: TARGET,
      adminAccount: undefined,
      action: 'disable',
      fromMs: 1,
      toMs: undefined,
      limit: 10,
      offset: 20
    })
  })

  it('requires the admin claim', async () => {
    const db = makeDb([])
    const err = await listAuditAdmin(ctx, db, null, generateToken(ADMIN), {}).catch((e) => e)
    expect(err.status.code).toBe(platform.status.Forbidden)
  })

  it('is registered and reachable through wrap()', async () => {
    const db = makeDb([entry()])
    const res = await getMethods().listAuditAdmin?.(ctx, db, null, { id: 1, params: {} }, adminToken)
    expect(res).toEqual({ id: 1, result: expect.objectContaining({ total: 1 }) })
  })

  it('reports NotSupportedOnBackend on MongoDB', async () => {
    const mongo = new MongoAccountDB({ collection: jest.fn() } as unknown as Db)
    ;(mongo as any).account = { findOne: jest.fn(async () => null) }
    const res = await getMethods().listAuditAdmin?.(ctx, mongo, null, { id: 1, params: {} }, adminToken)
    expect(res).toEqual({
      error: expect.objectContaining({
        code: accountPlugin.status.NotSupportedOnBackend,
        params: { backend: 'mongo', method: 'listAuditAdmin' }
      })
    })
  })
})

describe('PostgresAdminAuditLogCollection.listAuditAdmin', () => {
  function setup (): { client: any, collection: PostgresAdminAuditLogCollection } {
    const client: any = {
      unsafe: jest.fn(async (sql: string) =>
        sql.includes('COUNT(*)')
          ? [{ n: '3' }]
          : [
              {
                id: 'e1',
                ts_ms: '1000',
                admin_account: ADMIN,
                target_account: null,
                action: 'disable',
                workspace_uuid: null,
                details: '{"noop":true}',
                admin_first_name: 'Ad',
                admin_last_name: null,
                target_first_name: null,
                target_last_name: null
              }
            ]
      )
    }
    return { client, collection: new PostgresAdminAuditLogCollection(client as Sql, 'global_account') }
  }

  it('filters, orders newest first and paginates with bound parameters', async () => {
    const { client, collection } = setup()
    const res = await collection.listAuditAdmin({
      targetAccount: TARGET,
      adminAccount: ADMIN,
      action: 'disable',
      fromMs: 1,
      toMs: 2,
      limit: 1000,
      offset: 5
    })

    const [rowsSql, rowsArgs] = client.unsafe.mock.calls.find((c: any[]) => !(c[0] as string).includes('COUNT(*)'))
    const [countSql, countArgs] = client.unsafe.mock.calls.find((c: any[]) => (c[0] as string).includes('COUNT(*)'))
    expect(rowsSql).toContain(
      'WHERE al.target_account = $1::text AND al.admin_account = $2::text AND al.action = $3::text AND al.ts_ms >= $4::int8 AND al.ts_ms <= $5::int8'
    )
    expect(rowsSql).toContain('ORDER BY al.ts_ms DESC, al.id DESC')
    expect(rowsSql).toContain('LIMIT $6::int8 OFFSET $7::int8')
    expect(rowsArgs).toEqual([TARGET, ADMIN, 'disable', 1, 2, 200, 5])
    expect(countSql).not.toContain('LIMIT')
    expect(countArgs).toEqual([TARGET, ADMIN, 'disable', 1, 2])

    expect(res).toEqual({
      total: 3,
      entries: [
        {
          id: 'e1',
          tsMs: 1000,
          adminAccount: ADMIN,
          targetAccount: null,
          action: 'disable',
          workspaceUuid: null,
          details: { noop: true },
          adminFirstName: 'Ad',
          adminLastName: '',
          targetFirstName: '',
          targetLastName: ''
        }
      ]
    })
  })

  it('uses defaults without filters', async () => {
    const { client, collection } = setup()
    await collection.listAuditAdmin({})
    const [rowsSql, rowsArgs] = client.unsafe.mock.calls.find((c: any[]) => !(c[0] as string).includes('COUNT(*)'))
    expect(rowsSql).toContain('WHERE TRUE')
    expect(rowsArgs).toEqual([50, 0])
  })
})
