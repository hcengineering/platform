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
import type Koa from 'koa'
import session from 'koa-session'
import type { SessionCookieDecision } from './cookieDomain'

/**
 * Marks the request's cookie jar as secure.
 *
 * Koa builds ctx.cookies lazily with `secure: ctx.request.secure`
 * (koa/lib/context.js), which is false for a plain-HTTP listener without
 * app.proxy; cookies' set() then throws "Cannot send secure cookie over
 * unencrypted connection" for any cookie with `secure: true`. The operator
 * asserted TLS termination via SESSION_COOKIE_DOMAIN, so we flip the flag on
 * the (cached, per-request) Cookies instance instead of trusting
 * X-Forwarded-* headers: app.proxy stays false and ctx.secure / ctx.host /
 * ctx.ip keep their socket- and Host-derived values.
 *
 * Effect on other cookie writers: a cookie set with an explicit `secure`
 * option keeps that value (account-service PUT/DELETE /cookie pass
 * `secure: ctx.request.secure`); only cookies set WITHOUT a `secure` option
 * now default to Secure. Nothing in the account service writes such a cookie.
 */
export const forceSecureCookies: Koa.Middleware = async (ctx, next) => {
  ctx.cookies.secure = true
  await next()
}

/**
 * Registers the secure marker (when the decision asks for it) and then
 * koa-session. Order matters: the marker must be upstream of koa-session,
 * whose commit() runs in a `finally` after `await next()`.
 */
export function installSession (app: Koa, decision: SessionCookieDecision): void {
  if (decision.forceSecure) {
    app.use(forceSecureCookies)
  }
  app.use(session(decision.opts, app))
}
