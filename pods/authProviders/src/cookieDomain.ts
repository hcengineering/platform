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

import type session from 'koa-session'

/**
 * Validates a `SESSION_COOKIE_DOMAIN` value before it is used to widen the
 * session cookie scope across subdomains.
 *
 * Accepts only plausible parent-domain values: an optional leading dot
 * followed by at least two dot-separated labels ending in a 2+ character TLD
 * (e.g. `.example.com`, `example.com`). Rejects whitespace, protocol, port
 * and single-label values like `com` — the latter would span the cookie
 * across a whole TLD and is a common misconfiguration footgun.
 */
export function isValidCookieDomain (domain: string): boolean {
  return /^\.?([a-z0-9-]+\.)+[a-z]{2,}$/i.test(domain)
}

export interface SessionCookieDecision {
  /** Options handed to koa-session. */
  opts: Partial<session.opts>
  /**
   * True when the operator asserted TLS termination via SESSION_COOKIE_DOMAIN:
   * the app must then mark every request's cookie jar as secure (see
   * forceSecureCookies) so the Secure session cookie can be written although
   * the service itself listens on plain HTTP.
   */
  forceSecure: boolean
  warning?: string
}

/**
 * Pure decision for the koa-session cookie options. No forwarded header is
 * consulted and app.proxy stays false.
 *
 * - SESSION_COOKIE_DOMAIN unset/empty  -> prior behaviour (host-scoped cookie, no Secure)
 * - invalid domain                     -> ignored with a warning
 * - valid domain                       -> cross-subdomain cookie, sameSite=lax, Secure.
 *   Setting the variable is the operator's assertion that HTTPS is terminated
 *   in front of this service.
 * - SESSION_COOKIE_SECURE=false        -> local plain-HTTP development only: the
 *   domain cookie is written without Secure and nothing is forced.
 */
export function resolveSessionCookieOptions (
  rawDomain: string | undefined,
  rawSecure: string | undefined
): SessionCookieDecision {
  const domain = rawDomain?.trim()
  const secureOptOut = rawSecure?.trim().toLowerCase() === 'false'
  if (domain === undefined || domain.length === 0) {
    return {
      opts: {},
      forceSecure: false,
      warning: secureOptOut ? 'SESSION_COOKIE_SECURE ignored: SESSION_COOKIE_DOMAIN is not set' : undefined
    }
  }
  if (!isValidCookieDomain(domain)) {
    return { opts: {}, forceSecure: false, warning: 'SESSION_COOKIE_DOMAIN ignored: not a valid domain' }
  }
  if (secureOptOut) {
    return {
      opts: { domain, sameSite: 'lax', secure: false },
      forceSecure: false,
      warning:
        'SESSION_COOKIE_SECURE=false: the cross-subdomain session cookie is NOT marked Secure. ' +
        'Use this only for local plain-HTTP development.'
    }
  }
  return { opts: { domain, sameSite: 'lax', secure: true }, forceSecure: true }
}
