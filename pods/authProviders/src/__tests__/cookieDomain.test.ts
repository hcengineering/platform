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
import { isValidCookieDomain, resolveSessionCookieOptions } from '../cookieDomain'

describe('isValidCookieDomain', () => {
  it.each(['.example.com', 'example.com', '.app.example.com', 'dev.example.co.uk', 'xn--e1afmkfd.xn--p1ai'])(
    'accepts the syntactically valid domain %p',
    (domain) => {
      expect(isValidCookieDomain(domain)).toBe(true)
    }
  )

  it.each([
    'com',
    '.com',
    ' example.com',
    'example.com ',
    'exa mple.com',
    'https://example.com',
    'example.com:8080',
    'example.',
    '-example.com'
  ])('rejects the invalid domain %p', (domain) => {
    expect(isValidCookieDomain(domain)).toBe(false)
  })
})

describe('resolveSessionCookieOptions', () => {
  it.each([undefined, '', '   '])('keeps prior behaviour when the domain is %p', (rawDomain) => {
    expect(resolveSessionCookieOptions(rawDomain, undefined)).toEqual({
      opts: {},
      forceSecureSessionCookie: false,
      warnings: []
    })
  })

  it('uses a distinct key only for a valid domain-scoped session', () => {
    expect(resolveSessionCookieOptions('.uray.io', undefined)).toEqual({
      opts: { domain: '.uray.io', key: 'huly.sess' },
      forceSecureSessionCookie: false,
      warnings: []
    })
  })

  it('does not force SameSite or Secure when only the domain is set', () => {
    const { opts } = resolveSessionCookieOptions('.uray.io', undefined)
    expect(opts.sameSite).toBeUndefined()
    expect(opts.secure).toBeUndefined()
  })

  it('ignores an invalid domain and identifies that setting in the warning', () => {
    const decision = resolveSessionCookieOptions('com', undefined)
    expect(decision.opts).toEqual({})
    expect(decision.warnings).toEqual([expect.objectContaining({ variable: 'SESSION_COOKIE_DOMAIN', value: 'com' })])
  })

  it.each([
    ['true', true],
    ['1', true],
    ['yes', true],
    ['false', false],
    ['0', false],
    ['no', false]
  ])('recognises SESSION_COOKIE_SECURE=%p', (rawSecure, secure) => {
    const decision = resolveSessionCookieOptions('.uray.io', rawSecure)
    expect(decision.opts.secure).toBe(secure)
    expect(decision.forceSecureSessionCookie).toBe(secure)
    expect(decision.warnings).toEqual([])
  })

  it('keeps the cookie default for an invalid secure value and identifies that setting in the warning', () => {
    const decision = resolveSessionCookieOptions('.uray.io', 'sometimes')
    expect(decision.opts).toEqual({ domain: '.uray.io', key: 'huly.sess' })
    expect(decision.warnings).toEqual([
      expect.objectContaining({ variable: 'SESSION_COOKIE_SECURE', value: 'sometimes' })
    ])
  })

  it('trims the domain', () => {
    expect(resolveSessionCookieOptions(' .uray.io ', undefined).opts.domain).toBe('.uray.io')
  })
})
