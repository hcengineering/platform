//
// Copyright © 2026 Hardcore Engineering Inc.
//

import { type MeasureContext } from '@hcengineering/core'
import { setMetadata } from '@hcengineering/platform'
import serverToken, { decodeTokenVerbose, TokenError } from '@hcengineering/server-token'
import { generateTokenWithVersion, verifyTokenVersion } from '../utils'
import type { AccountDB } from '../types'

setMetadata(serverToken.metadata.Secret, 'test-secret')

const TEST_UUID = 'a1111111-1111-4111-9111-111111111111' as any
const ctx = { newChild: () => ctx } as unknown as MeasureContext

function mockDbWith (account: { uuid: string, tokenVersion?: number, disabledAt?: number | null }): AccountDB {
  return {
    account: {
      findOne: async (q: any) => (q.uuid === account.uuid ? account : null)
    }
  } as unknown as AccountDB
}

describe('token-version helpers', () => {
  it('issues a token without token_version claim when account.tokenVersion is 0', async () => {
    const db = mockDbWith({ uuid: TEST_UUID, tokenVersion: 0 })
    const token = await generateTokenWithVersion(ctx, db, TEST_UUID)
    expect(token).toBeTruthy()
    const decoded = decodeTokenVerbose(ctx, token)
    expect(decoded.extra?.token_version).toBeUndefined()
  })

  it('issues a token with token_version claim when account.tokenVersion is > 0', async () => {
    const db = mockDbWith({ uuid: TEST_UUID, tokenVersion: 5 })
    const token = await generateTokenWithVersion(ctx, db, TEST_UUID)
    const decoded = decodeTokenVerbose(ctx, token)
    expect(decoded.extra?.token_version).toBe('5')
  })

  it('verifyTokenVersion accepts a token whose version matches the account', async () => {
    const db = mockDbWith({ uuid: TEST_UUID, tokenVersion: 3 })
    const token = await generateTokenWithVersion(ctx, db, TEST_UUID)
    await expect(verifyTokenVersion(ctx, db, token)).resolves.toBeUndefined()
  })

  it('verifyTokenVersion rejects when account.tokenVersion is greater than token claim', async () => {
    const db = mockDbWith({ uuid: TEST_UUID, tokenVersion: 3 })
    const token = await generateTokenWithVersion(ctx, db, TEST_UUID)
    ;(db.account as any).findOne = async (): Promise<any> => ({ uuid: TEST_UUID, tokenVersion: 4 })
    await expect(verifyTokenVersion(ctx, db, token)).rejects.toThrow(TokenError)
  })

  it('verifyTokenVersion rejects when account is disabled', async () => {
    const db = mockDbWith({ uuid: TEST_UUID, tokenVersion: 0, disabledAt: 1700000000000 })
    const token = await generateTokenWithVersion(ctx, db, TEST_UUID)
    await expect(verifyTokenVersion(ctx, db, token)).rejects.toThrow(TokenError)
  })
})
