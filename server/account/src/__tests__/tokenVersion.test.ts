//
// Copyright © 2026 Hardcore Engineering Inc.
//

import { type MeasureContext, readOnlyGuestAccountUuid, systemAccountUuid } from '@hcengineering/core'
import { setMetadata } from '@hcengineering/platform'
import serverToken, { decodeTokenVerbose, TokenError } from '@hcengineering/server-token'
import {
  checkTokenVersionClaim,
  generateTokenWithVersion,
  GUEST_ACCOUNT,
  verifySessionTokenVersion,
  verifyTokenVersion
} from '../utils'
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

describe('checkTokenVersionClaim (pure part of verifyTokenVersion)', () => {
  it('throws TokenError when the row has tokenVersion 1 and the claim is missing', () => {
    expect(() => {
      checkTokenVersionClaim(TEST_UUID, {}, { tokenVersion: 1 })
    }).toThrow(TokenError)
    expect(() => {
      checkTokenVersionClaim(TEST_UUID, undefined, { tokenVersion: 1 })
    }).toThrow(TokenError)
  })

  it('throws TokenError when the row is disabled', () => {
    expect(() => {
      checkTokenVersionClaim(TEST_UUID, { token_version: '1' }, { tokenVersion: 1, disabledAt: 1700000000000 })
    }).toThrow(TokenError)
  })

  it('accepts a claim equal to the row version', () => {
    expect(() => {
      checkTokenVersionClaim(TEST_UUID, { token_version: '1' }, { tokenVersion: 1 })
    }).not.toThrow()
  })

  it('accepts a legacy token (no claim) for a row without tokenVersion', () => {
    expect(() => {
      checkTokenVersionClaim(TEST_UUID, {}, {})
    }).not.toThrow()
    expect(() => {
      checkTokenVersionClaim(TEST_UUID, {}, { tokenVersion: 0 })
    }).not.toThrow()
  })

  it('skips guest, system, read-only guest, non-UUID principals and a missing row', () => {
    const bumped = { tokenVersion: 1, disabledAt: 1700000000000 }
    expect(() => {
      checkTokenVersionClaim(GUEST_ACCOUNT, {}, bumped)
    }).not.toThrow()
    expect(() => {
      checkTokenVersionClaim(systemAccountUuid, {}, bumped)
    }).not.toThrow()
    expect(() => {
      checkTokenVersionClaim(readOnlyGuestAccountUuid, {}, bumped)
    }).not.toThrow()
    expect(() => {
      checkTokenVersionClaim('not-a-uuid', {}, bumped)
    }).not.toThrow()
    expect(() => {
      checkTokenVersionClaim(TEST_UUID, {}, null)
    }).not.toThrow()
    expect(() => {
      checkTokenVersionClaim(TEST_UUID, {}, undefined)
    }).not.toThrow()
  })
})

describe('verifySessionTokenVersion (E-API: API tokens exempt)', () => {
  it('does not throw for an API token without claim on a bumped account', () => {
    expect(() => {
      verifySessionTokenVersion(TEST_UUID, { apiTokenId: 'x' }, { tokenVersion: 1 })
    }).not.toThrow()
  })

  it('does not throw for an API token on a disabled account (left to wrap()/E-T3, behaviour unchanged)', () => {
    expect(() => {
      verifySessionTokenVersion(TEST_UUID, { apiTokenId: 'x' }, { tokenVersion: 0, disabledAt: 1700000000000 })
    }).not.toThrow()
  })

  it('throws TokenError for a session token without claim on a bumped account', () => {
    expect(() => {
      verifySessionTokenVersion(TEST_UUID, {}, { tokenVersion: 1 })
    }).toThrow(TokenError)
    expect(() => {
      verifySessionTokenVersion(TEST_UUID, undefined, { tokenVersion: 1 })
    }).toThrow(TokenError)
  })

  it('throws TokenError for a session token on a disabled account', () => {
    expect(() => {
      verifySessionTokenVersion(TEST_UUID, { token_version: '1' }, { tokenVersion: 1, disabledAt: 1700000000000 })
    }).toThrow(TokenError)
  })

  it('accepts a fresh session token', () => {
    expect(() => {
      verifySessionTokenVersion(TEST_UUID, { token_version: '1' }, { tokenVersion: 1 })
    }).not.toThrow()
  })
})
