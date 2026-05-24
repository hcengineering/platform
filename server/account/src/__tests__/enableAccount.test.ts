//
// Copyright © 2026 Hardcore Engineering Inc.
//

import { MeasureContext } from '@hcengineering/core'

const ADMIN_TOKEN = 'admin-token'
const TARGET = '55555555-5555-5555-5555-555555555555' as any

jest.mock('@hcengineering/server-token', () => ({
  decodeTokenVerbose: (ctx: any, token: string) => {
    if (token === ADMIN_TOKEN) return { account: 'admin-uuid', extra: { admin: 'true' } }
    throw new Error('bad token')
  },
  TokenError: class extends Error {}
}))

const ctx = { newChild: () => ctx, error: () => {} } as unknown as MeasureContext

import { enableAccount } from '../operations'

describe('enableAccount', () => {
  it('clears disabledAt and bumps tokenVersion atomically via $inc', async () => {
    let updatedTo: any = null
    const db = {
      account: {
        findOne: async () => ({ uuid: TARGET, disabledAt: 1700000000000, tokenVersion: 5 }),
        update: async (q: any, ops: any) => {
          updatedTo = ops
        }
      },
      adminAuditLog: { insert: async () => {} }
    } as any
    const res = await enableAccount(ctx, db, null, ADMIN_TOKEN, { accountUuid: TARGET })
    expect(res).toEqual({ ok: true })
    expect(updatedTo.disabledAt).toBeNull()
    expect(updatedTo.$inc).toEqual({ tokenVersion: 1 })
    // The literal computed tokenVersion must NOT be passed — that would
    // re-enable the race.
    expect(updatedTo.tokenVersion).toBeUndefined()
  })
})
