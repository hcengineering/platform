import Koa from 'koa'
import passport from 'koa-passport'
import Router from 'koa-router'
import session from 'koa-session'
import { registerGithub } from './github'
import { registerGoogle } from './google'
import { registerOpenid } from './openid'
import { registerToken } from './token'
import { BrandingMap, MeasureContext } from '@hcengineering/core'
import { type AccountDB } from '@hcengineering/account'

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
) => string | undefined

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
  app.use(session({}, app))
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

  const res: string[] = []
  const providers: AuthProvider[] = [registerGoogle, registerGithub, registerOpenid]
  for (const provider of providers) {
    const value = provider(ctx, passport, router, accountsUrl, db, frontUrl, brandings, signUpDisabled)
    if (value !== undefined) res.push(value)
  }

  router.get('providers', '/providers', (ctx) => {
    const json = JSON.stringify(res)
    ctx.res.writeHead(200, { 'Content-Type': 'application/json', 'keep-alive': 'timeout=5, max=1000', connection: 'keep-alive' })
    ctx.res.end(json)
  })
}
