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

export interface SessionCookieWarning {
  message: string
  variable: 'SESSION_COOKIE_DOMAIN' | 'SESSION_COOKIE_SECURE'
  value: string | undefined
}

/**
 * Checks that a value is syntactically suitable for a cookie Domain attribute.
 * This deliberately does not try to identify public suffixes: that requires a
 * current public-suffix list, and browsers remain the authority that rejects a
 * public suffix or a domain unrelated to the request host.
 */
export function isValidCookieDomain (domain: string): boolean {
  return /^\.?[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(domain)
}

function parseBoolean (value: string | undefined): boolean | undefined {
  switch (value?.trim().toLowerCase()) {
    case 'true':
    case '1':
    case 'yes':
      return true
    case 'false':
    case '0':
    case 'no':
      return false
    default:
      return undefined
  }
}

export interface SessionCookieDecision {
  /** Options handed to koa-session. */
  opts: Partial<session.opts>
  /**
   * True only when SESSION_COOKIE_SECURE explicitly enabled Secure cookies.
   * installSession uses this to permit the session cookie on a TLS-terminating
   * proxy without changing the defaults of any other cookie writer.
   */
  forceSecureSessionCookie: boolean
  warnings: SessionCookieWarning[]
}

/**
 * Builds the koa-session options from the deployment configuration.
 *
 * SESSION_COOKIE_DOMAIN only widens the session cookie's scope. It does not
 * change Secure or SameSite defaults. SESSION_COOKIE_SECURE is independent and
 * accepts true/false, 1/0, or yes/no. An unset value preserves koa-session's
 * existing behaviour.
 */
export function resolveSessionCookieOptions (
  rawDomain: string | undefined,
  rawSecure: string | undefined
): SessionCookieDecision {
  const warnings: SessionCookieWarning[] = []
  const opts: Partial<session.opts> = {}
  const domain = rawDomain?.trim()

  if (domain !== undefined && domain.length > 0) {
    if (isValidCookieDomain(domain)) {
      // A domain-scoped cookie can collide with koa-session applications on
      // sibling subdomains. Keep the established default where no domain is set.
      opts.domain = domain
      opts.key = 'huly.sess'
    } else {
      warnings.push({
        message: 'SESSION_COOKIE_DOMAIN ignored: not a valid domain',
        variable: 'SESSION_COOKIE_DOMAIN',
        value: rawDomain
      })
    }
  }

  const secure = parseBoolean(rawSecure)
  if (rawSecure !== undefined && rawSecure.trim().length > 0 && secure === undefined) {
    warnings.push({
      message: 'SESSION_COOKIE_SECURE ignored: expected true/false, 1/0, or yes/no',
      variable: 'SESSION_COOKIE_SECURE',
      value: rawSecure
    })
  }
  if (secure !== undefined) opts.secure = secure

  return { opts, forceSecureSessionCookie: secure === true, warnings }
}
