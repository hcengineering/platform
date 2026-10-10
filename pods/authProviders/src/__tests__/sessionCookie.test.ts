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

type Install = (app: Koa) => void

const routes: Koa.Middleware = async (ctx) => {
  if (ctx.path === '/login') {
    if (ctx.session != null) ctx.session.oidc = { state: 's', nonce: 'n' }
    ctx.redirect('https://idp.example/authorize')
    return
  }
  if (ctx.path === '/implicit') {
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

describe('installSession over a plain-HTTP listener', () => {
  it('keeps domain-only cookies on koa-session defaults and uses the huly key', async () => {
    const { status, cookies } = await request(withDecision('.uray.io', undefined), '/login')
    expect(status).toBe(302)
    for (const name of ['huly.sess', 'huly.sess.sig']) {
      const attrs = attributes(cookies, name)
      expect(attrs).toEqual(expect.arrayContaining(['path=/', 'domain=.uray.io', 'httponly']))
      expect(attrs).not.toContain('secure')
      expect(attrs.some((a) => a.startsWith('samesite='))).toBe(false)
    }
  })

  it('emits a Secure session cookie when SESSION_COOKIE_SECURE=true', async () => {
    const { status, cookies } = await request(withDecision('.uray.io', 'true'), '/login')
    expect(status).toBe(302)
    expect(attributes(cookies, 'huly.sess')).toContain('secure')
  })

  it('does not force Secure on other cookies', async () => {
    const { status, cookies } = await request(withDecision('.uray.io', 'true'), '/implicit')
    expect(status).toBe(204)
    expect(attributes(cookies, 'u')).not.toContain('secure')
  })

  it('keeps the existing host-scoped koa.sess name without a domain', async () => {
    const { status, cookies } = await request(withDecision(undefined, undefined), '/login')
    expect(status).toBe(302)
    const attrs = attributes(cookies, 'koa.sess')
    expect(attrs).toEqual(expect.arrayContaining(['path=/', 'httponly']))
    expect(attrs.some((a) => a.startsWith('domain='))).toBe(false)
  })

  it('reproduces the plain-HTTP failure without the narrow Secure-cookie handler', async () => {
    const { status } = await request((app) => {
      app.use(session({ domain: '.uray.io', secure: true }, app))
    }, '/login')
    expect(status).toBe(500)
  })
})
