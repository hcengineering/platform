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
import type Koa from 'koa'
import session from 'koa-session'
import type { SessionCookieDecision } from './cookieDomain'

/**
 * Allows only the session cookie to be emitted as Secure when TLS terminates
 * before this plain-HTTP service. It does not trust forwarded headers and does
 * not change how other calls to ctx.cookies.set() choose their Secure flag.
 */
export function forceSecureSessionCookie (key: string): Koa.Middleware {
  return async (ctx, next) => {
    const cookies = ctx.cookies
    type CookieSet = typeof cookies.set
    const prototype = Object.getPrototypeOf(cookies) as { set: CookieSet }
    const set = (...args: Parameters<CookieSet>): ReturnType<CookieSet> => Reflect.apply(prototype.set, cookies, args)
    cookies.set = function (...args) {
      const [name] = args
      if (name !== key && name !== `${key}.sig`) return set(...args)

      const secure = cookies.secure
      cookies.secure = true
      try {
        return set(...args)
      } finally {
        cookies.secure = secure
      }
    }
    await next()
  }
}

/** Registers session handling and the narrowly scoped Secure-cookie workaround. */
export function installSession (app: Koa, decision: SessionCookieDecision): void {
  if (decision.forceSecureSessionCookie) {
    app.use(forceSecureSessionCookie(decision.opts.key ?? 'koa.sess'))
  }
  app.use(session(decision.opts, app))
}
