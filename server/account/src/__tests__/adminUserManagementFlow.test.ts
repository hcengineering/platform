//
// Copyright © 2026 Hardcore Engineering Inc.
//
// End-to-end-style integration tests over a mocked AccountDB that exercise
// the full admin lifecycle: disable -> enable -> audit-log accumulation.
//
// The full real-Postgres variant lives in postgres-real.test.ts (skipped
// by default; requires a live CockroachDB instance).

import { AccountRole, WorkspaceMemberInfo, type MeasureContext } from '@hcengineering/core'

const ADMIN_TOKEN = 'admin-token'
const TARGET = '99999999-9999-4999-9999-999999999999' as any
const WS = '88888888-8888-4888-9888-888888888888' as any

jest.mock('@hcengineering/server-token', () => ({
  decodeTokenVerbose: (ctx: any, token: string) => {
    if (token === ADMIN_TOKEN) return { account: 'admin-uuid', extra: { admin: 'true' } }
    throw new Error('bad token')
  },
  TokenError: class extends Error {}
}))

const ctx = { newChild: () => ctx, info: () => {}, warn: () => {}, error: () => {} } as unknown as MeasureContext

import { disableAccount, enableAccount, setWorkspaceMemberRole } from '../operations'
import type { AdminAuditLogEntry } from '../types'

function makeDb (initialRole: AccountRole = AccountRole.User): any {
  const audit: Array<Omit<AdminAuditLogEntry, 'id' | 'tsMs'>> = []
  const state: any = {
    uuid: TARGET,
    tokenVersion: 0,
    disabledAt: null as number | null,
    role: initialRole as AccountRole | null
  }
  const members: WorkspaceMemberInfo[] = [
    { person: TARGET, role: initialRole },
    { person: 'other-uuid' as any, role: AccountRole.Owner }
  ]
  return {
    state,
    audit,
    account: {
      findOne: async (): Promise<any> => state.role == null ? null : { ...state },
      update: async (q: any, ops: any) => {
        const { $inc, ...rest } = ops
        Object.assign(state, rest)
        if ($inc != null) {
          for (const [k, v] of Object.entries($inc as Record<string, number>)) {
            state[k] = (state[k] ?? 0) + v
          }
        }
      }
    },
    socialId: {
      find: async () => [{ personUuid: TARGET, type: 'email', value: 'target@example.com' }]
    },
    getWorkspaceRole: async () => state.role,
    getWorkspaceMembers: async () => members,
    updateWorkspaceRole: async (_uuid: any, _ws: any, newRole: AccountRole) => {
      state.role = newRole
    },
    adminAuditLog: {
      insert: async (e: Omit<AdminAuditLogEntry, 'id' | 'tsMs'>) => {
        audit.push(e)
      },
      findByTarget: async () => audit.map((e, i) => ({ ...e, id: String(i), tsMs: Date.now() }))
    }
  }
}

describe('admin user management — integration flow', () => {
  beforeEach(() => {
    process.env.ADMIN_EMAILS = 'admin@example.com'
  })

  it('disable then enable round-trip bumps tokenVersion twice and clears disabledAt', async () => {
    const db = makeDb()

    await disableAccount(ctx, db, null, {}, ADMIN_TOKEN, { accountUuid: TARGET })
    expect(db.state.tokenVersion).toBe(1)
    expect(db.state.disabledAt).not.toBeNull()

    await enableAccount(ctx, db, null, ADMIN_TOKEN, { accountUuid: TARGET })
    expect(db.state.tokenVersion).toBe(2)
    expect(db.state.disabledAt).toBeNull()
  })

  it('audit-log captures role_change + disable + enable actions for the same target', async () => {
    const db = makeDb()

    await setWorkspaceMemberRole(ctx, db, null, ADMIN_TOKEN, {
      accountUuid: TARGET,
      workspaceUuid: WS,
      newRole: AccountRole.Maintainer
    })
    await disableAccount(ctx, db, null, {}, ADMIN_TOKEN, { accountUuid: TARGET })
    await enableAccount(ctx, db, null, ADMIN_TOKEN, { accountUuid: TARGET })

    const actions = db.audit.map((e: any) => e.action).sort()
    expect(actions).toEqual(['disable', 'enable', 'role_change'])
  })

  it('disable emits lifecycle event when a producer is provided', async () => {
    const db = makeDb()
    const sent: any[] = []
    const producer = { send: async (...args: any[]) => sent.push(args) }

    await disableAccount(ctx, db, null, { accountLifecycleProducer: producer as any }, ADMIN_TOKEN, {
      accountUuid: TARGET
    })

    expect(sent.length).toBe(1)
    expect(sent[0][2][0]).toMatchObject({ accountUuid: TARGET, event: 'disabled' })
  })
})
