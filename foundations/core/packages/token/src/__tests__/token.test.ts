//
// Copyright © 2025 Hardcore Engineering Inc.
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

import { setMetadata } from '@hcengineering/platform'
import type { AccountUuid, PersonUuid, WorkspaceUuid } from '@hcengineering/core'
import { decodeToken, generateToken, isTokenExpired, setApiTokenRevocationChecker, verifyToken } from '../token'
import plugin from '../plugin'

export function decodeTokenPayload (token: string): any {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch (err: any) {
    console.error(err)
    return {}
  }
}

describe('generateToken', () => {
  beforeEach(() => {
    setMetadata(plugin.metadata.Secret, undefined)
    setMetadata(plugin.metadata.Service, undefined)
  })

  it('throws TokenError for invalid account uuid', () => {
    expect(() => {
      generateToken('invalid-uuid' as PersonUuid, '' as WorkspaceUuid, {}, 'secret')
    }).toThrow('Invalid account uuid: "invalid-uuid"')
  })

  it('throws TokenError for invalid workspace uuid', () => {
    expect(() => {
      generateToken('123e4567-e89b-12d3-a456-426614174000' as PersonUuid, 'invalid-uuid' as WorkspaceUuid, {}, 'secret')
    }).toThrow('Invalid workspace uuid: "invalid-uuid"')
  })

  it('generates token without extra and workspace', () => {
    const token = generateToken('123e4567-e89b-12d3-a456-426614174000' as PersonUuid, undefined, undefined, 'secret')
    const decodedPayload = decodeTokenPayload(token)
    expect(decodedPayload).toEqual({
      account: '123e4567-e89b-12d3-a456-426614174000',
      workspace: undefined
    })
  })

  it('should generate token with only required fields', () => {
    const token = generateToken(
      '123e4567-e89b-12d3-a456-426614174000' as PersonUuid,
      '123e4567-e89b-12d3-a456-426614174001' as WorkspaceUuid,
      undefined,
      'secret'
    )
    const decodedPayload = decodeTokenPayload(token)
    expect(decodedPayload).toEqual({
      account: '123e4567-e89b-12d3-a456-426614174000',
      workspace: '123e4567-e89b-12d3-a456-426614174001'
    })
  })

  it('should generate token with extra fields', () => {
    const extra = { service: 'test' }
    const token = generateToken(
      '123e4567-e89b-12d3-a456-426614174000' as PersonUuid,
      '123e4567-e89b-12d3-a456-426614174001' as WorkspaceUuid,
      extra,
      'secret'
    )
    const decodedPayload = decodeTokenPayload(token)
    expect(decodedPayload).toEqual({
      extra,
      account: '123e4567-e89b-12d3-a456-426614174000',
      workspace: '123e4567-e89b-12d3-a456-426614174001'
    })
  })

  it('should generate token with default secret', () => {
    const token = generateToken(
      '123e4567-e89b-12d3-a456-426614174000' as PersonUuid,
      '123e4567-e89b-12d3-a456-426614174001' as WorkspaceUuid,
      undefined,
      'test'
    )
    const decodedPayload = decodeTokenPayload(token)
    expect(decodedPayload).toEqual({
      account: '123e4567-e89b-12d3-a456-426614174000',
      workspace: '123e4567-e89b-12d3-a456-426614174001'
    })
  })

  it('should generate token with default service in extra', () => {
    setMetadata(plugin.metadata.Service, 'test')
    const token = generateToken(
      '123e4567-e89b-12d3-a456-426614174000' as PersonUuid,
      '123e4567-e89b-12d3-a456-426614174001' as WorkspaceUuid,
      undefined,
      'secret'
    )
    const decodedPayload = decodeToken(token, false, 'test')
    expect(decodedPayload).toEqual({
      extra: { service: 'test' },
      account: '123e4567-e89b-12d3-a456-426614174000',
      workspace: '123e4567-e89b-12d3-a456-426614174001'
    })
  })
})

const ACCOUNT = '123e4567-e89b-12d3-a456-426614174000' as AccountUuid
const WORKSPACE = '123e4567-e89b-12d3-a456-426614174001' as WorkspaceUuid

describe('isTokenExpired', () => {
  it('is false when exp is absent', () => {
    expect(isTokenExpired({ account: ACCOUNT, workspace: WORKSPACE })).toBe(false)
  })

  it('is false when exp is in the future', () => {
    const exp = Math.floor(Date.now() / 1000) + 3600
    expect(isTokenExpired({ account: ACCOUNT, workspace: WORKSPACE, exp })).toBe(false)
  })

  it('is true when exp is in the past', () => {
    const exp = Math.floor(Date.now() / 1000) - 1
    expect(isTokenExpired({ account: ACCOUNT, workspace: WORKSPACE, exp })).toBe(true)
  })
})

describe('verifyToken', () => {
  beforeEach(() => {
    setMetadata(plugin.metadata.Secret, undefined)
    setMetadata(plugin.metadata.Service, undefined)
    setApiTokenRevocationChecker(undefined)
  })

  afterAll(() => {
    setApiTokenRevocationChecker(undefined)
  })

  it('returns the decoded token for a valid, non-expiring token', async () => {
    const token = generateToken(ACCOUNT, WORKSPACE, undefined, 'secret')
    const decoded = await verifyToken(token, 'secret')
    expect(decoded.account).toBe(ACCOUNT)
    expect(decoded.workspace).toBe(WORKSPACE)
  })

  it('throws for an expired token', async () => {
    const exp = Math.floor(Date.now() / 1000) - 1
    const token = generateToken(ACCOUNT, WORKSPACE, undefined, 'secret', { exp })
    await expect(verifyToken(token, 'secret')).rejects.toThrow('Token expired')
  })

  it('skips revocation when no checker is registered', async () => {
    const token = generateToken(ACCOUNT, WORKSPACE, { apiTokenId: 'tok-1' }, 'secret')
    const decoded = await verifyToken(token, 'secret')
    expect(decoded.extra?.apiTokenId).toBe('tok-1')
  })

  it('throws when the registered checker reports the API token revoked', async () => {
    setApiTokenRevocationChecker(async () => true)
    const token = generateToken(ACCOUNT, WORKSPACE, { apiTokenId: 'tok-revoked' }, 'secret')
    await expect(verifyToken(token, 'secret')).rejects.toThrow('Token revoked')
  })

  it('refuses the token when revocation cannot be verified', async () => {
    // The account is the only authority on revocation. Failing open here would let
    // a revoked token survive for as long as an attacker can keep the account busy.
    setApiTokenRevocationChecker(async () => {
      throw new Error('account unreachable')
    })
    const token = generateToken(ACCOUNT, WORKSPACE, { apiTokenId: 'tok-unreachable' }, 'secret')
    await expect(verifyToken(token, 'secret')).rejects.toThrow('Token revocation could not be verified')
  })

  it('does not re-ask while a verdict is still fresh', async () => {
    let calls = 0
    setApiTokenRevocationChecker(async () => {
      calls++
      return false
    })
    const token = generateToken(ACCOUNT, WORKSPACE, { apiTokenId: 'tok-cached' }, 'secret')
    await verifyToken(token, 'secret')
    await verifyToken(token, 'secret')
    expect(calls).toBe(1)
  })

  it('only invokes the checker for revokable (API) tokens', async () => {
    let calls = 0
    setApiTokenRevocationChecker(async () => {
      calls++
      return false
    })
    const plain = generateToken(ACCOUNT, WORKSPACE, undefined, 'secret')
    await verifyToken(plain, 'secret')
    expect(calls).toBe(0)

    const api = generateToken(ACCOUNT, WORKSPACE, { apiTokenId: 'tok-2' }, 'secret')
    await verifyToken(api, 'secret')
    expect(calls).toBe(1)
  })
})
