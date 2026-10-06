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
import { escapeLike } from '../util/escapeLike'

describe('escapeLike', () => {
  it('passes through plain alphanumeric strings unchanged', () => {
    expect(escapeLike('hello')).toBe('hello')
    expect(escapeLike('jane@example.com')).toBe('jane@example.com')
  })

  it('escapes the LIKE wildcards % and _', () => {
    // Without escaping, `%` matches any substring (effectively unfiltered)
    // and `_` matches a single character. After escaping, both are
    // pattern-literal — the admin search box behaves as a substring filter.
    expect(escapeLike('100%')).toBe('100\\%')
    expect(escapeLike('a_b')).toBe('a\\_b')
    expect(escapeLike('% and _')).toBe('\\% and \\_')
  })

  it('escapes the backslash escape character itself', () => {
    // A literal backslash in user input must be doubled so that PG's
    // ESCAPE '\\' clause sees `\\\\` -> `\\` -> a literal backslash, not
    // an escape for the following character.
    expect(escapeLike('a\\b')).toBe('a\\\\b')
  })

  it('leaves the empty string alone', () => {
    expect(escapeLike('')).toBe('')
  })
})
