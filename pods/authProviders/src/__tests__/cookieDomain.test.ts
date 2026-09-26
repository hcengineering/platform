//
// Copyright © 2024 Hardcore Engineering, Inc.
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
import { isValidCookieDomain } from '../cookieDomain'

describe('isValidCookieDomain', () => {
  it('accepts a leading-dot parent domain', () => {
    expect(isValidCookieDomain('.example.com')).toBe(true)
  })

  it('accepts a bare parent domain', () => {
    expect(isValidCookieDomain('example.com')).toBe(true)
  })

  it('accepts nested subdomains', () => {
    expect(isValidCookieDomain('.app.example.com')).toBe(true)
    expect(isValidCookieDomain('dev.example.co.uk')).toBe(true)
  })

  it('accepts hyphenated labels', () => {
    expect(isValidCookieDomain('.my-app.example.com')).toBe(true)
  })

  it('rejects a single-label TLD like "com"', () => {
    expect(isValidCookieDomain('com')).toBe(false)
    expect(isValidCookieDomain('.com')).toBe(false)
  })

  it('rejects values with whitespace', () => {
    expect(isValidCookieDomain(' example.com')).toBe(false)
    expect(isValidCookieDomain('example.com ')).toBe(false)
    expect(isValidCookieDomain('exa mple.com')).toBe(false)
  })

  it('rejects protocol or port', () => {
    expect(isValidCookieDomain('https://example.com')).toBe(false)
    expect(isValidCookieDomain('example.com:8080')).toBe(false)
  })

  it('rejects empty and trailing-dot values', () => {
    expect(isValidCookieDomain('')).toBe(false)
    expect(isValidCookieDomain('example.')).toBe(false)
  })
})
