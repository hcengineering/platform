//
// Copyright © 2026 TraceX SAS.
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
import { type AccountUuid, type WorkspaceUuid } from '@hcengineering/core'
import plugin from '../plugin'
import { decodeToken, generateToken } from '../token'
import { generateReadOnlyToken } from '../readonly'

const ACCOUNT = '123e4567-e89b-12d3-a456-426614174000' as AccountUuid
const WORKSPACE = '123e4567-e89b-12d3-a456-426614174001' as WorkspaceUuid

describe('read-only token derivation', () => {
  beforeEach(() => {
    setMetadata(plugin.metadata.Secret, 'test-secret')
    setMetadata(plugin.metadata.Service, undefined)
  })

  it('retains identity, restrictions and expiry without inheriting signing-service privileges', () => {
    const exp = Math.floor(Date.now() / 1000) + 30
    const source = generateToken(ACCOUNT, WORKSPACE, { apiKey: 'key' }, undefined, {
      sub: ACCOUNT,
      exp,
      nbf: Math.floor(Date.now() / 1000) - 1
    })
    setMetadata(plugin.metadata.Service, 'print')
    const before = decodeToken(source)
    const restricted = decodeToken(generateReadOnlyToken(source, 120))
    expect(restricted).toEqual({ ...before, extra: { apiKey: 'key', readonly: 'true' } })
    expect(decodeToken(source)).toEqual(before)
  })

  it('adds a finite expiry to a token without one', () => {
    const now = Math.floor(Date.now() / 1000)
    const source = generateToken(ACCOUNT, WORKSPACE)
    const derived = decodeToken(generateReadOnlyToken(source, 120))
    expect(derived.exp).toBeGreaterThanOrEqual(now + 120)
    expect(derived.exp).toBeLessThanOrEqual(now + 121)
  })

  it('rejects invalid source tokens and invalid lifetimes', () => {
    expect(() => generateReadOnlyToken('invalid', 120)).toThrow()
    const source = generateToken(ACCOUNT, WORKSPACE)
    expect(() => generateReadOnlyToken(source, 0)).toThrow()
  })
})
