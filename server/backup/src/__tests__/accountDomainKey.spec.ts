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

import { isValidAccountDomainKey, shouldRescanAccountDomain, toAccountDomain } from '../utils'

const personDomain = toAccountDomain('person')
const socialIdDomain = toAccountDomain('socialId')

describe('isValidAccountDomainKey', () => {
  describe(personDomain, () => {
    it('accepts person UUID keys', () => {
      expect(isValidAccountDomainKey(personDomain, '0f2eba47-3773-4b04-a1e3-f75c3ed3e0c1')).toBe(true)
      expect(isValidAccountDomainKey(personDomain, 'F2E9A9D0-6C21-4F32-9B71-000000000001')).toBe(true)
    })

    it('rejects numeric socialId keys leaked into person digest', () => {
      expect(isValidAccountDomainKey(personDomain, '1057485760843415553')).toBe(false)
    })

    it('rejects garbage keys', () => {
      expect(isValidAccountDomainKey(personDomain, 'not-a-uuid')).toBe(false)
      expect(isValidAccountDomainKey(personDomain, '')).toBe(false)
    })
  })

  describe(socialIdDomain, () => {
    it('accepts numeric socialId keys', () => {
      expect(isValidAccountDomainKey(socialIdDomain, '1057485760843415553')).toBe(true)
      expect(isValidAccountDomainKey(socialIdDomain, '42')).toBe(true)
    })

    it('rejects UUID keys leaked into socialId digest', () => {
      expect(isValidAccountDomainKey(socialIdDomain, '0f2eba47-3773-4b04-a1e3-f75c3ed3e0c1')).toBe(false)
    })

    it('rejects garbage keys', () => {
      expect(isValidAccountDomainKey(socialIdDomain, 'abc')).toBe(false)
    })
  })
})

describe('shouldRescanAccountDomain', () => {
  it('always rescans on full check', () => {
    expect(shouldRescanAccountDomain(personDomain, true, { accountsRescan: { [personDomain]: true } })).toBe(true)
    expect(shouldRescanAccountDomain(socialIdDomain, true, { accountsRescan: { [socialIdDomain]: true } })).toBe(true)
  })

  it('rescans when initial accounts rescan was never completed', () => {
    expect(shouldRescanAccountDomain(personDomain, false, {})).toBe(true)
    expect(shouldRescanAccountDomain(socialIdDomain, false, { accountsRescan: {} })).toBe(true)
  })

  it('does not rescan when the domain is already marked as scanned', () => {
    expect(shouldRescanAccountDomain(personDomain, false, { accountsRescan: { [personDomain]: true } })).toBe(false)
    expect(shouldRescanAccountDomain(socialIdDomain, false, { accountsRescan: { [socialIdDomain]: true } })).toBe(false)
  })

  it('tracks domains independently', () => {
    const migrations = { accountsRescan: { [personDomain]: true } }
    expect(shouldRescanAccountDomain(personDomain, false, migrations)).toBe(false)
    expect(shouldRescanAccountDomain(socialIdDomain, false, migrations)).toBe(true)
  })
})
