//
// Copyright © 2026 Hardcore Engineering Inc.
//

import { type MeasureContext } from '@hcengineering/core'
import { PlatformError } from '@hcengineering/platform'

import { disableAccount } from '../operations'

const ADMIN_TOKEN = 'admin-token'
const SELF_TOKEN = 'self-token'
const TARGET = '44444444-4444-4444-4444-444444444444' as any

jest.mock('@hcengineering/server-token', () => ({
  decodeTokenVerbose: (ctx: any, token: string) => {
    if (token === ADMIN_TOKEN) return { account: 'admin-uuid', extra: { admin: 'true' } }
    if (token === SELF_TOKEN) return { account: TARGET, extra: { admin: 'true' } }
    throw new Error('bad token')
  },
  TokenError: class extends Error {}
}))

const ctx = { newChild: () => ctx, info: () => {}, warn: () => {}, error: () => {} } as unknown as MeasureContext

const mockDb = (account: any): any => ({
  account: {
    findOne: async () => account,
    update: async () => undefined
  },
  socialId: { find: async () => [{ personUuid: TARGET, type: 'email', value: 'other@example.com' }] },
  adminAuditLog: { insert: async () => undefined }
})

describe('disableAccount', () => {
  beforeEach(() => {
    process.env.ADMIN_EMAILS = 'admin@example.com'
  })

  it('rejects when target is self', async () => {
    const producer = { send: async () => undefined } as any
    await expect(
      disableAccount(
        ctx,
        mockDb({ uuid: TARGET, tokenVersion: 0 }),
        null,
        { accountLifecycleProducer: producer },
        SELF_TOKEN,
        { accountUuid: TARGET }
      )
    ).rejects.toThrow(PlatformError)
  })

  it('produces a lifecycle event on success', async () => {
    const sentEvents: any[] = []
    const producer = {
      send: async (...args: any[]) => {
        sentEvents.push(args)
      }
    } as any
    const res = await disableAccount(
      ctx,
      mockDb({ uuid: TARGET, tokenVersion: 0 }),
      null,
      { accountLifecycleProducer: producer },
      ADMIN_TOKEN,
      { accountUuid: TARGET }
    )
    expect(res).toEqual({ ok: true })
    expect(sentEvents.length).toBe(1)
    const msgs = sentEvents[0][2]
    expect(msgs[0].event).toBe('disabled')
    expect(msgs[0].accountUuid).toBe(TARGET)
  })

  it('still succeeds when producer is undefined (token-version fallback)', async () => {
    const res = await disableAccount(ctx, mockDb({ uuid: TARGET, tokenVersion: 0 }), null, {}, ADMIN_TOKEN, {
      accountUuid: TARGET
    })
    expect(res).toEqual({ ok: true })
  })

  it('L-RACE: rolls back disable + throws when post-write recheck finds this was the last admin', async () => {
    // Two admins configured; the OTHER admin is active during the pre-write
    // guard but shows up disabled on the post-write recheck (simulating a
    // concurrent disable that committed in between). The write must be rolled
    // back and last_admin thrown so at least one admin stays active.
    process.env.ADMIN_EMAILS = 'admin@example.com,other@example.com'
    const OTHER = 'other-admin-uuid'
    const updates: any[] = []
    let otherLookups = 0
    const db: any = {
      account: {
        findOne: async ({ uuid }: any) => {
          if (uuid === OTHER) {
            otherLookups++
            return { uuid: OTHER, disabledAt: otherLookups >= 2 ? 123 : null, tokenVersion: 0 }
          }
          return { uuid: TARGET, disabledAt: null, tokenVersion: 0 }
        },
        update: async (query: any, ops: any) => {
          updates.push({ query, ops })
        }
      },
      socialId: {
        find: async () => [{ personUuid: TARGET, type: 'email', value: 'admin@example.com' }],
        findOne: async ({ value }: any) =>
          value === 'other@example.com' ? { personUuid: OTHER, type: 'email', value } : null
      },
      adminAuditLog: { insert: async () => undefined }
    }
    await expect(disableAccount(ctx, db, null, {}, ADMIN_TOKEN, { accountUuid: TARGET })).rejects.toThrow(/last_admin/)
    // First update = disable, second update = rollback restoring prior disabledAt (null).
    expect(updates).toHaveLength(2)
    expect(updates[0].ops.disabledAt).toBeDefined()
    expect(updates[1].ops.disabledAt).toBeNull()
  })

  it('uses $inc for tokenVersion to avoid race', async () => {
    const updateCalls: any[] = []
    const db = {
      account: {
        findOne: async () => ({ uuid: TARGET, tokenVersion: 7 }),
        update: async (query: any, ops: any) => {
          updateCalls.push({ query, ops })
        }
      },
      socialId: { find: async () => [{ personUuid: TARGET, type: 'email', value: 'other@example.com' }] },
      adminAuditLog: { insert: async () => undefined }
    } as any
    await disableAccount(ctx, db, null, {}, ADMIN_TOKEN, { accountUuid: TARGET })
    expect(updateCalls).toHaveLength(1)
    expect(updateCalls[0].ops.$inc).toEqual({ tokenVersion: 1 })
    expect(updateCalls[0].ops.disabledAt).toBeDefined()
    // The literal computed tokenVersion must NOT be passed — that would
    // re-enable the race.
    expect(updateCalls[0].ops.tokenVersion).toBeUndefined()
  })
})
