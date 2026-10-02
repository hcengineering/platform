import Koa from 'koa'
import passport from 'koa-passport'
import Router from 'koa-router'
import { resolveSessionCookieOptions } from './cookieDomain'
import { installSession } from './sessionCookie'
import { registerGithub } from './github'
import { registerGoogle } from './google'
import { registerOpenid } from './openid'
import { registerToken } from './token'
import { BrandingMap, MeasureContext } from '@hcengineering/core'
import { type AccountDB } from '@hcengineering/account'
import { type ProviderInfo } from '@hcengineering/account-client'

export type Passport = typeof passport

export type AuthProvider = (
  ctx: MeasureContext,
  passport: Passport,
  router: Router<any, any>,
  accountsUrl: string,
  db: Promise<AccountDB>,
  frontUrl: string,
  brandings: BrandingMap,
  signUpDisabled?: boolean
) => ProviderInfo | undefined

export function registerProviders (
  ctx: MeasureContext,
  app: Koa<Koa.DefaultState, Koa.DefaultContext>,
  router: Router<any, any>,
  db: Promise<AccountDB>,
  serverSecret: string,
  frontUrl: string | undefined,
  brandings: BrandingMap,
  signUpDisabled: boolean = false
): void {
  const accountsUrl = process.env.ACCOUNTS_URL
  if (accountsUrl === undefined) {
    console.log('Please provide ACCOUNTS_URL url for enable auth providers')
    return
  }

  if (frontUrl === undefined) {
    console.log('Please provide FRONTS_URL url for enable auth providers')
    return
  }

  app.keys = [serverSecret]
  // koa-session defaults the cookie domain to the request host, which breaks
  // OIDC flows that start on one subdomain and get the callback on another
  // (Passport then fails with "did not find expected authorization request
  // details in session"). SESSION_COOKIE_DOMAIN=.example.com spans the cookie
  // across both hosts. Setting it is also the operator's assertion that HTTPS
  // is terminated in front of this service: the widened, signed, httpOnly
  // cookie (OIDC state/nonce/PKCE verifier) is then always written with
  // Secure + SameSite=Lax, without trusting any X-Forwarded-* header (see
  // sessionCookie.ts). SESSION_COOKIE_SECURE=false opts out for local
  // plain-HTTP development only. Invalid or unset values keep prior behaviour.
  const decision = resolveSessionCookieOptions(process.env.SESSION_COOKIE_DOMAIN, process.env.SESSION_COOKIE_SECURE)
  if (decision.warning !== undefined) {
    ctx.warn(decision.warning, { value: process.env.SESSION_COOKIE_DOMAIN })
  }
  installSession(app, decision)
  app.use(passport.initialize())
  app.use(passport.session())

  passport.serializeUser(function (user: any, cb) {
    process.nextTick(function () {
      cb(null, { id: user.id, username: user.username, name: user.name })
    })
  })

  passport.deserializeUser(function (user: any, cb) {
    process.nextTick(function () {
      cb(null, user)
    })
  })

  registerToken(ctx, passport, router, accountsUrl, db, frontUrl, brandings)

  const res: ProviderInfo[] = []
  const providers: AuthProvider[] = [registerGoogle, registerGithub, registerOpenid]
  for (const provider of providers) {
    const value = provider(ctx, passport, router, accountsUrl, db, frontUrl, brandings, signUpDisabled)
    if (value !== undefined) res.push(value)
  }

  router.get('providers', '/providers', (ctx) => {
    const json = JSON.stringify(res)
    ctx.res.writeHead(200, {
      'Content-Type': 'application/json',
      'keep-alive': 'timeout=5, max=1000',
      connection: 'keep-alive'
    })
    ctx.res.end(json)
  })
}
