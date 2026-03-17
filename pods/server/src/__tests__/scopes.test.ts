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

import { hasScope, getRequiredScope } from '../rpc'

describe('hasScope', () => {
  test('returns true when scope is present', () => {
    expect(hasScope(['read:*', 'write:*'], 'read:*')).toBe(true)
    expect(hasScope(['read:*', 'write:*'], 'write:*')).toBe(true)
  })

  test('returns false when scope is missing', () => {
    expect(hasScope(['read:*'], 'write:*')).toBe(false)
    expect(hasScope(['read:*'], 'delete:*')).toBe(false)
  })

  test('returns false for empty scopes array', () => {
    expect(hasScope([], 'read:*')).toBe(false)
  })

  test('requires exact match', () => {
    expect(hasScope(['read:tracker'], 'read:*')).toBe(false)
    expect(hasScope(['read:*'], 'read:tracker')).toBe(false)
  })
})

describe('getRequiredScope', () => {
  test('ping and generateId require no scope', () => {
    expect(getRequiredScope('ping')).toBeNull()
    expect(getRequiredScope('generateId')).toBeNull()
  })

  test('read methods require read:*', () => {
    expect(getRequiredScope('findAll')).toBe('read:*')
    expect(getRequiredScope('searchFulltext')).toBe('read:*')
    expect(getRequiredScope('loadModel')).toBe('read:*')
    expect(getRequiredScope('account')).toBe('read:*')
  })

  test('write methods require write:*', () => {
    expect(getRequiredScope('tx')).toBe('write:*')
    expect(getRequiredScope('domainRequest')).toBe('write:*')
    expect(getRequiredScope('ensurePerson')).toBe('write:*')
  })

  test('unknown methods default to read:*', () => {
    expect(getRequiredScope('someUnknownMethod')).toBe('read:*')
  })
})
