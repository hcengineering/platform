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

import { type MeasureContext, readOnlyGuestAccountUuid, systemAccountUuid } from '@hcengineering/core'
import { setMetadata } from '@hcengineering/platform'
import serverToken, { decodeTokenVerbose, generateToken, TokenError } from '@hcengineering/server-token'
import {
  checkTokenVersionClaim,
  generateTokenWithVersion,
  GUEST_ACCOUNT,
  isGatedPrincipal,
  isVersionedSessionToken,
  verifyTokenVersion
} from '../utils'
import type { AccountDB } from '../types'

setMetadata(serverToken.metadata.Secret, 'test-secret')

const TEST_UUID = 'a1111111-1111-4111-9111-111111111111' as any
const ctx = { newChild: () => ctx } as unknown as MeasureContext

function mockDbWith (account: { uuid: string, tokenVersion?: number, disabledAt?: number | null }): AccountDB {
  return {
    account: {
      findOne: jest.fn(async (q: any) => (q.uuid === account.uuid ? account : null))
    }
  } as unknown as AccountDB
}

describe('isGatedPrincipal', () => {
  it('exempts guest, system, read-only guest and non-UUID principals', () => {
    expect(isGatedPrincipal(GUEST_ACCOUNT)).toBe(false)
    expect(isGatedPrincipal(systemAccountUuid)).toBe(false)
    expect(isGatedPrincipal(readOnlyGuestAccountUuid)).toBe(false)
    expect(isGatedPrincipal('not-a-uuid')).toBe(false)
    expect(isGatedPrincipal(undefined)).toBe(false)
    expect(isGatedPrincipal(TEST_UUID)).toBe(true)
  })
})

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
    const token = await generateTokenWithVersion(ctx, db, TEST_UUID, undefined, { admin: 'true' })
    const decoded = decodeTokenVerbose(ctx, token)
    expect(decoded.extra?.token_version).toBe('5')
    expect(decoded.extra?.admin).toBe('true')
  })

  it('uses a preloaded account row of the same principal instead of reading it', async () => {
    const db = mockDbWith({ uuid: TEST_UUID, tokenVersion: 1 })
    const token = await generateTokenWithVersion(ctx, db, TEST_UUID, undefined, undefined, undefined, {
      uuid: TEST_UUID,
      tokenVersion: 7
    })
    expect(db.account.findOne).not.toHaveBeenCalled()
    expect(decodeTokenVerbose(ctx, token).extra?.token_version).toBe('7')
  })

  it('ignores a preloaded row of a different principal', async () => {
    const db = mockDbWith({ uuid: TEST_UUID, tokenVersion: 2 })
    const token = await generateTokenWithVersion(ctx, db, TEST_UUID, undefined, undefined, undefined, {
      uuid: 'b2222222-2222-4222-9222-222222222222' as any,
      tokenVersion: 9
    })
    expect(decodeTokenVerbose(ctx, token).extra?.token_version).toBe('2')
  })

  it('does not read the account for exempt principals', async () => {
    const db = mockDbWith({ uuid: TEST_UUID, tokenVersion: 2 })
    await generateTokenWithVersion(ctx, db, systemAccountUuid)
    await generateTokenWithVersion(ctx, db, GUEST_ACCOUNT, undefined, { guest: 'true' })
    expect(db.account.findOne).not.toHaveBeenCalled()
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

  it('verifyTokenVersion rejects a legacy token (no claim) after the first bump', async () => {
    const db = mockDbWith({ uuid: TEST_UUID, tokenVersion: 1 })
    const legacy = generateToken(TEST_UUID)
    await expect(verifyTokenVersion(ctx, db, legacy)).rejects.toThrow('Token version invalidated')
  })

  it('verifyTokenVersion rejects when account is disabled', async () => {
    const db = mockDbWith({ uuid: TEST_UUID, tokenVersion: 0, disabledAt: 1700000000000 })
    const token = await generateTokenWithVersion(ctx, db, TEST_UUID)
    await expect(verifyTokenVersion(ctx, db, token)).rejects.toThrow('Account disabled')
  })

  it('verifyTokenVersion uses the preloaded principal row from wrap', async () => {
    const db = mockDbWith({ uuid: TEST_UUID, tokenVersion: 0 })
    const token = generateToken(TEST_UUID)
    await expect(verifyTokenVersion(ctx, db, token, { uuid: TEST_UUID, tokenVersion: 2 })).rejects.toThrow(TokenError)
    expect(db.account.findOne).not.toHaveBeenCalled()
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

  it('accepts a claim equal to or newer than the row version', () => {
    expect(() => {
      checkTokenVersionClaim(TEST_UUID, { token_version: '1' }, { tokenVersion: 1 })
    }).not.toThrow()
    expect(() => {
      checkTokenVersionClaim(TEST_UUID, { token_version: '2' }, { tokenVersion: 1 })
    }).not.toThrow()
  })

  it('treats a malformed claim as version 0', () => {
    expect(() => {
      checkTokenVersionClaim(TEST_UUID, { token_version: 'abc' }, { tokenVersion: 1 })
    }).toThrow(TokenError)
    expect(() => {
      checkTokenVersionClaim(TEST_UUID, { token_version: 'abc' }, { tokenVersion: 0 })
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

describe('checkTokenVersionClaim: version enforcement is limited to session tokens', () => {
  const bumped = { tokenVersion: 2 }
  const disabledRow = { tokenVersion: 2, disabledAt: 1700000000000 }

  it('classifies session, API and service tokens', () => {
    expect(isVersionedSessionToken(undefined)).toBe(true)
    expect(isVersionedSessionToken({})).toBe(true)
    expect(isVersionedSessionToken({ token_version: '1', admin: 'true' })).toBe(true)
    expect(isVersionedSessionToken({ apiTokenId: 'x' })).toBe(false)
    expect(isVersionedSessionToken({ service: 'telegram-bot' })).toBe(false)
  })

  it('does not version-check an API token without claim on a bumped account', () => {
    expect(() => {
      checkTokenVersionClaim(TEST_UUID, { apiTokenId: 'x' }, bumped)
    }).not.toThrow()
  })

  it('does not version-check a user-scoped service token without claim on a bumped account', () => {
    expect(() => {
      checkTokenVersionClaim(TEST_UUID, { service: 'telegram-bot' }, bumped)
    }).not.toThrow()
  })

  it('still rejects API and service tokens of a disabled account', () => {
    expect(() => {
      checkTokenVersionClaim(TEST_UUID, { apiTokenId: 'x' }, disabledRow)
    }).toThrow('Account disabled')
    expect(() => {
      checkTokenVersionClaim(TEST_UUID, { service: 'telegram-bot' }, disabledRow)
    }).toThrow('Account disabled')
  })

  it('rejects a stale session token and accepts a fresh one', () => {
    expect(() => {
      checkTokenVersionClaim(TEST_UUID, { token_version: '1' }, bumped)
    }).toThrow('Token version invalidated')
    expect(() => {
      checkTokenVersionClaim(TEST_UUID, { token_version: '2' }, bumped)
    }).not.toThrow()
  })

  it('verifyTokenVersion applies the same rules to decoded API and service tokens', async () => {
    const db = mockDbWith({ uuid: TEST_UUID, tokenVersion: 2 })
    await expect(
      verifyTokenVersion(ctx, db, generateToken(TEST_UUID, undefined, { apiTokenId: 'x' }))
    ).resolves.toBeUndefined()
    await expect(
      verifyTokenVersion(ctx, db, generateToken(TEST_UUID, undefined, { service: 'telegram-bot' }))
    ).resolves.toBeUndefined()
    await expect(verifyTokenVersion(ctx, db, generateToken(TEST_UUID))).rejects.toThrow('Token version invalidated')

    const disabledDb = mockDbWith({ uuid: TEST_UUID, tokenVersion: 2, disabledAt: 1700000000000 })
    await expect(
      verifyTokenVersion(ctx, disabledDb, generateToken(TEST_UUID, undefined, { apiTokenId: 'x' }))
    ).rejects.toThrow('Account disabled')
    await expect(
      verifyTokenVersion(ctx, disabledDb, generateToken(TEST_UUID, undefined, { service: 'telegram-bot' }))
    ).rejects.toThrow('Account disabled')
  })
})
