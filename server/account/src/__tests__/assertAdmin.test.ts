//
// Copyright © 2026 Hardcore Engineering Inc.
//
import { type MeasureContext } from '@hcengineering/core'
import { PlatformError } from '@hcengineering/platform'

import { assertAdmin } from '../serviceOperations'

jest.mock('@hcengineering/server-token', () => ({
  decodeTokenVerbose: (_ctx: any, token: string) => {
    if (token === 'admin-token') return { account: 'admin', extra: { admin: 'true' } }
    if (token === 'user-token') return { account: 'user', extra: {} }
    throw new Error('bad token')
  },
  TokenError: class extends Error {}
}))

jest.mock('../utils', () => ({
  ...jest.requireActual('../utils'),
  verifyTokenVersion: jest.fn(async () => undefined)
}))

const ctx = { newChild: () => ctx, info: () => {}, error: () => {} } as unknown as MeasureContext
const fakeDb = { account: { findOne: async () => ({ tokenVersion: 1 }) } } as any

describe('assertAdmin', () => {
  it('passes for admin token', async () => {
    await expect(assertAdmin(ctx, fakeDb, 'admin-token')).resolves.toBeUndefined()
  })
  it('rejects non-admin token', async () => {
    await expect(assertAdmin(ctx, fakeDb, 'user-token')).rejects.toThrow(PlatformError)
  })
  it('L-AUD: logs pre-auth denial for non-admin token', async () => {
    const warn = jest.fn()
    const warnCtx = { newChild: () => warnCtx, info: () => {}, warn, error: () => {} } as unknown as MeasureContext
    await expect(assertAdmin(warnCtx, fakeDb, 'user-token')).rejects.toThrow(PlatformError)
    expect(warn).toHaveBeenCalledWith('admin RPC denied pre-auth', expect.objectContaining({ caller: 'user' }))
  })
})
