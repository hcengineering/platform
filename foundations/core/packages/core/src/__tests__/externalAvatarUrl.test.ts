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

import { normalizeExternalAvatarUrl } from '../utils'

describe('normalizeExternalAvatarUrl', () => {
  it('accepts absolute http(s) URLs', () => {
    expect(normalizeExternalAvatarUrl('https://idp.example.com/avatar.png')).toBe('https://idp.example.com/avatar.png')
    expect(normalizeExternalAvatarUrl(' http://idp.example.com/a?s=96 ')).toBe('http://idp.example.com/a?s=96')
  })

  it('rejects non-string and empty values', () => {
    expect(normalizeExternalAvatarUrl(undefined)).toBeUndefined()
    expect(normalizeExternalAvatarUrl(null)).toBeUndefined()
    expect(normalizeExternalAvatarUrl(42)).toBeUndefined()
    expect(normalizeExternalAvatarUrl({ url: 'https://idp.example.com/a.png' })).toBeUndefined()
    expect(normalizeExternalAvatarUrl('   ')).toBeUndefined()
  })

  it('rejects relative URLs and other protocols', () => {
    expect(normalizeExternalAvatarUrl('/avatar.png')).toBeUndefined()
    expect(normalizeExternalAvatarUrl('javascript:alert(1)')).toBeUndefined()
    expect(normalizeExternalAvatarUrl('data:image/png;base64,AAAA')).toBeUndefined()
    expect(normalizeExternalAvatarUrl('file:///etc/passwd')).toBeUndefined()
    expect(normalizeExternalAvatarUrl('ftp://idp.example.com/a.png')).toBeUndefined()
  })

  it('rejects URLs with credentials or excessive length', () => {
    expect(normalizeExternalAvatarUrl('https://user:pass@idp.example.com/a.png')).toBeUndefined()
    expect(normalizeExternalAvatarUrl('https://idp.example.com/' + 'a'.repeat(3000))).toBeUndefined()
  })
})
