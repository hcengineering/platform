import Koa from 'koa'
import passport from 'koa-passport'
import Router from 'koa-router'
import { Db } from 'mongodb'
import { registerGithub } from './github'
import { registerGoogle } from './google'
import { registerToken } from './token'
import { BrandingMap, MeasureContext } from '@hcengineering/core'

export type Passport = typeof passport

export type AuthProvider = (
  ctx: MeasureContext,
  passport: Passport,
  router: Router<any, any>,
  accountsUrl: string,
  db: Db,
  productId: string,
  frontUrl: string,
  brandings: BrandingMap
) => string | undefined

export function registerProviders (
  ctx: MeasureContext,
  app: Koa<Koa.DefaultState, Koa.DefaultContext>,
  router: Router<any, any>,
  db: Db,
  productId: string,
  serverSecret: string,
  frontUrl: string | undefined,
  brandings: BrandingMap
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

  app.use(passport.initialize())

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

  registerToken(ctx, passport, router, accountsUrl, db, productId, frontUrl, brandings)

  const res: string[] = []
  const providers: AuthProvider[] = [registerGoogle, registerGithub]
  for (const provider of providers) {
    const value = provider(ctx, passport, router, accountsUrl, db, productId, frontUrl, brandings)
    if (value !== undefined) res.push(value)
  }

  router.get('providers', '/providers', (ctx) => {
    ctx.body = JSON.stringify(res)
  })
}
