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

import { API_TOKEN_ENV, resolveCredentials } from '../credentials'

describe('resolveCredentials', () => {
  it('uses user and password', () => {
    expect(resolveCredentials({ user: 'user1', password: '1234' }, {})).toEqual({
      kind: 'password',
      user: 'user1',
      password: '1234'
    })
  })

  it('uses --token', () => {
    expect(resolveCredentials({ token: 'abc' }, {})).toEqual({ kind: 'token', token: 'abc' })
  })

  it('uses the token from the environment', () => {
    expect(resolveCredentials({}, { [API_TOKEN_ENV]: 'env-token' })).toEqual({ kind: 'token', token: 'env-token' })
  })

  it('prefers command line credentials over the environment', () => {
    const env = { [API_TOKEN_ENV]: 'env-token' }
    expect(resolveCredentials({ token: 'abc' }, env)).toEqual({ kind: 'token', token: 'abc' })
    expect(resolveCredentials({ user: 'user1', password: '1234' }, env)).toEqual({
      kind: 'password',
      user: 'user1',
      password: '1234'
    })
  })

  it('rejects a token combined with user and password', () => {
    expect(() => resolveCredentials({ token: 'abc', user: 'user1', password: '1234' }, {})).toThrow('not both')
  })

  it('requires both user and password', () => {
    expect(() => resolveCredentials({ user: 'user1' }, {})).toThrow('both --user and --password')
    expect(() => resolveCredentials({ password: '1234' }, { [API_TOKEN_ENV]: 'env-token' })).toThrow(
      'both --user and --password'
    )
  })

  it('fails without any credentials', () => {
    expect(() => resolveCredentials({}, {})).toThrow(API_TOKEN_ENV)
    expect(() => resolveCredentials({ token: '', user: '', password: '' }, { [API_TOKEN_ENV]: '' })).toThrow(
      API_TOKEN_ENV
    )
  })
})
