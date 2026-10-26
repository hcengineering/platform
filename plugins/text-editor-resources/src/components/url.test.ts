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

import { canParseUrl } from './url'

describe('canParseUrl', () => {
  it('accepts absolute urls', () => {
    expect(canParseUrl('https://example.com')).toBe(true)
    expect(canParseUrl('http://my.link.net/path?q=1#hash')).toBe(true)
    expect(canParseUrl('mailto:user@example.com')).toBe(true)
    expect(canParseUrl('ref://?_id=123&_class=class&label=Label')).toBe(true)
  })

  it('rejects strings that are not urls', () => {
    expect(canParseUrl('')).toBe(false)
    expect(canParseUrl('not a url')).toBe(false)
    expect(canParseUrl('example.com')).toBe(false)
    expect(canParseUrl('/relative/path')).toBe(false)
    expect(canParseUrl('http://')).toBe(false)
  })

  it('does not depend on URL.canParse', () => {
    const original = (URL as any).canParse
    ;(URL as any).canParse = undefined
    try {
      expect(canParseUrl('https://example.com')).toBe(true)
      expect(canParseUrl('not a url')).toBe(false)
    } finally {
      ;(URL as any).canParse = original
    }
  })
})
