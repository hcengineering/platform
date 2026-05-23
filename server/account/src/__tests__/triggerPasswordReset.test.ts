//
// Copyright © 2026 Hardcore Engineering Inc.
//

import { MeasureContext } from '@hcengineering/core'
import { PlatformError } from '@hcengineering/platform'

const ADMIN_TOKEN = 'admin-token'
const TARGET = 'target-uuid' as any

jest.mock('@hcengineering/server-token', () => ({
  decodeTokenVerbose: (ctx: any, token: string) => {
    if (token === ADMIN_TOKEN) return { account: 'admin-uuid', extra: { admin: 'true' } }
    throw new Error('bad token')
  },
  TokenError: class extends Error {}
}))

const ctx = { newChild: () => ctx, info: () => {}, warn: () => {}, error: () => {} } as unknown as MeasureContext

import { triggerPasswordReset } from '../operations'

describe('triggerPasswordReset', () => {
  it('rejects when target has no email identity', async () => {
    const db = {
      socialId: { find: async () => [] },
      account: { findOne: async () => ({ uuid: TARGET, hash: null }) },
      adminAuditLog: { insert: async () => {} }
    } as any
    await expect(triggerPasswordReset(ctx, db, null, ADMIN_TOKEN, { accountUuid: TARGET })).rejects.toThrow(
      PlatformError
    )
  })

  it('rejects when target is OIDC-only with no password', async () => {
    const db = {
      socialId: {
        find: async () => [
          { personUuid: TARGET, type: 'email', value: 'user@example.com' },
          { personUuid: TARGET, type: 'oidc', value: 'abc123' }
        ]
      },
      account: { findOne: async () => ({ uuid: TARGET, hash: null }) },
      adminAuditLog: { insert: async () => {} }
    } as any
    await expect(triggerPasswordReset(ctx, db, null, ADMIN_TOKEN, { accountUuid: TARGET })).rejects.toThrow(
      PlatformError
    )
  })

  it('succeeds for user with email + password', async () => {
    const db = {
      socialId: { find: async () => [{ personUuid: TARGET, type: 'email', value: 'user@example.com' }] },
      account: { findOne: async () => ({ uuid: TARGET, hash: Buffer.from('x') }) },
      adminAuditLog: { insert: async () => {} }
    } as any
    const res = await triggerPasswordReset(ctx, db, null, ADMIN_TOKEN, { accountUuid: TARGET })
    expect(res.ok).toBe(true)
    expect(res.emailSentTo).toBe('user@example.com')
  })
})
