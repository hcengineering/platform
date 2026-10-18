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

import { getProviderAvatarUrl } from '../utils'

describe('getProviderAvatarUrl', () => {
  test('reads the OIDC picture claim', () => {
    expect(getProviderAvatarUrl({ sub: 'user', picture: 'https://idp.example.com/u/1.png' })).toBe(
      'https://idp.example.com/u/1.png'
    )
  })

  test('reads the first passport profile photo (Google, GitHub)', () => {
    expect(
      getProviderAvatarUrl({
        photos: [{ value: 'https://avatars.example.com/u/1?v=4' }, { value: 'https://other.example.com/2' }]
      })
    ).toBe('https://avatars.example.com/u/1?v=4')
  })

  test('falls back to photos when the picture claim is not a usable url', () => {
    expect(
      getProviderAvatarUrl({ picture: 'javascript:alert(1)', photos: [{ value: 'http://idp.example.com/a' }] })
    ).toBe('http://idp.example.com/a')
  })

  test('returns undefined when there is no usable avatar', () => {
    expect(getProviderAvatarUrl(undefined)).toBeUndefined()
    expect(getProviderAvatarUrl('user')).toBeUndefined()
    expect(getProviderAvatarUrl({})).toBeUndefined()
    expect(getProviderAvatarUrl({ picture: '' })).toBeUndefined()
    expect(getProviderAvatarUrl({ picture: { url: 'https://idp.example.com/a' } })).toBeUndefined()
    expect(getProviderAvatarUrl({ photos: 'https://idp.example.com/a' })).toBeUndefined()
    expect(getProviderAvatarUrl({ photos: [{ value: 'data:image/png;base64,AAAA' }] })).toBeUndefined()
  })
})
