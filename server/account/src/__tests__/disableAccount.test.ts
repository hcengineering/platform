//
// Copyright © 2026 Hardcore Engineering Inc.
//

import { MeasureContext } from '@hcengineering/core'
import { PlatformError } from '@hcengineering/platform'

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

import { disableAccount } from '../operations'

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
    const res = await disableAccount(
      ctx,
      mockDb({ uuid: TARGET, tokenVersion: 0 }),
      null,
      {},
      ADMIN_TOKEN,
      { accountUuid: TARGET }
    )
    expect(res).toEqual({ ok: true })
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
