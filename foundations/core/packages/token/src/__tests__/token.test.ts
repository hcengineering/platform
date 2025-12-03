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
import type { PersonUuid, WorkspaceUuid } from '@hcengineering/core'
import { decodeToken, generateToken } from '../token'
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
