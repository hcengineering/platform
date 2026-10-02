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
import http from 'http'
import type { AddressInfo } from 'net'
import Koa from 'koa'
import session from 'koa-session'
import { resolveSessionCookieOptions } from '../cookieDomain'
import { installSession } from '../sessionCookie'

// The account service listens on plain HTTP behind a TLS-terminating proxy and
// never sets app.proxy, so these tests deliberately run over plain HTTP too.

type Install = (app: Koa) => void

const routes: Koa.Middleware = async (ctx) => {
  if (ctx.path === '/login') {
    // Mirrors /auth/openid: the session is populated for the first time, so
    // koa-session's commit() writes the cookie, then the IdP redirect follows.
    if (ctx.session != null) {
      ctx.session.oidc = { state: 's', nonce: 'n' }
    }
    ctx.redirect('https://idp.example/authorize')
    return
  }
  if (ctx.path === '/explicit') {
    // Mirrors PUT/DELETE /cookie, which pass `secure: ctx.request.secure`.
    ctx.cookies.set('t', 'v', { httpOnly: true, secure: false })
    ctx.status = 204
    return
  }
  if (ctx.path === '/implicit') {
    // A writer that passes no `secure` option at all.
    ctx.cookies.set('u', 'v')
    ctx.status = 204
  }
}

async function request (install: Install, path: string): Promise<{ status: number, cookies: string[] }> {
  const app = new Koa()
  app.keys = ['test-secret']
  app.silent = true
  install(app)
  app.use(routes)
  const handler = app.callback()
  const server = http.createServer((req, res) => {
    void handler(req, res)
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    const { port } = server.address() as AddressInfo
    const res = await fetch(`http://127.0.0.1:${port}${path}`, { redirect: 'manual' })
    return { status: res.status, cookies: res.headers.getSetCookie() }
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err != null) reject(err)
        else resolve()
      })
    })
  }
}

function attributes (cookies: string[], name: string): string[] {
  const cookie = cookies.find((c) => c.startsWith(`${name}=`))
  expect(cookie).toBeDefined()
  return (cookie ?? '')
    .split(';')
    .slice(1)
    .map((a) => a.trim().toLowerCase())
}

const withDecision =
  (rawDomain: string | undefined, rawSecure: string | undefined): Install =>
    (app) => {
      installSession(app, resolveSessionCookieOptions(rawDomain, rawSecure))
    }

describe('installSession over plain HTTP', () => {
  describe('SESSION_COOKIE_DOMAIN set (default)', () => {
    const install = withDecision('.uray.io', undefined)

    it('answers the login redirect with a Secure cross-subdomain session cookie', async () => {
      const { status, cookies } = await request(install, '/login')
      expect(status).toBe(302)
      for (const name of ['koa.sess', 'koa.sess.sig']) {
        const attrs = attributes(cookies, name)
        expect(attrs).toEqual(
          expect.arrayContaining(['path=/', 'domain=.uray.io', 'samesite=lax', 'secure', 'httponly'])
        )
      }
    })

    it('keeps an explicit secure: false (login cookie written by PUT/DELETE /cookie)', async () => {
      const { status, cookies } = await request(install, '/explicit')
      expect(status).toBe(204)
      const attrs = attributes(cookies, 't')
      expect(attrs).toContain('httponly')
      expect(attrs).not.toContain('secure')
    })

    it('defaults a cookie written without a secure option to Secure (documented side effect)', async () => {
      const { status, cookies } = await request(install, '/implicit')
      expect(status).toBe(204)
      expect(attributes(cookies, 'u')).toContain('secure')
    })
  })

  describe('SESSION_COOKIE_SECURE=false opt-out', () => {
    const install = withDecision('.uray.io', 'false')

    it('writes the domain cookie without Secure', async () => {
      const { status, cookies } = await request(install, '/login')
      expect(status).toBe(302)
      const attrs = attributes(cookies, 'koa.sess')
      expect(attrs).toEqual(expect.arrayContaining(['domain=.uray.io', 'samesite=lax', 'httponly']))
      expect(attrs).not.toContain('secure')
    })

    it('does not force Secure on other cookies', async () => {
      const { status, cookies } = await request(install, '/implicit')
      expect(status).toBe(204)
      expect(attributes(cookies, 'u')).not.toContain('secure')
    })
  })

  describe('SESSION_COOKIE_DOMAIN unset', () => {
    it('keeps the prior host-scoped cookie', async () => {
      const { status, cookies } = await request(withDecision(undefined, undefined), '/login')
      expect(status).toBe(302)
      const attrs = attributes(cookies, 'koa.sess')
      expect(attrs).toEqual(expect.arrayContaining(['path=/', 'httponly']))
      expect(attrs.some((a) => a.startsWith('domain='))).toBe(false)
      expect(attrs.some((a) => a.startsWith('samesite='))).toBe(false)
      expect(attrs).not.toContain('secure')
    })
  })

  describe('negative control: secure session cookie without the marker', () => {
    it('reproduces the 500 (Cannot send secure cookie over unencrypted connection)', async () => {
      const { status } = await request((app) => {
        app.use(session({ domain: '.uray.io', secure: true, sameSite: 'lax' }, app))
      }, '/login')
      expect(status).toBe(500)
    })
  })
})
