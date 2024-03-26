import { joinWithProvider, loginWithProvider } from '@hcengineering/account'
import { concatLink, MeasureContext } from '@hcengineering/core'
import Router from 'koa-router'
import { Db } from 'mongodb'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { Passport } from '.'

export function registerGoogle (
  ctx: MeasureContext,
  passport: Passport,
  router: Router<any, any>,
  accountsUrl: string,
  db: Db,
  productId: string,
  frontUrl: string
): string | undefined {
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

  const redirectURL = '/auth/google/callback'
  if (GOOGLE_CLIENT_ID === undefined || GOOGLE_CLIENT_SECRET === undefined) return
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: concatLink(accountsUrl, redirectURL),
        passReqToCallback: true
      },
      function (req, accessToken, refreshToken, profile, done) {
        done(null, profile)
      }
    )
  )

  router.get('/auth/google', async (ctx, next) => {
    const state = ctx.query?.inviteId
    passport.authenticate('google', { scope: ['profile', 'email'], session: true, state })(ctx, next)
  })

  router.get(
    redirectURL,
    passport.authenticate('google', { failureRedirect: concatLink(frontUrl, '/login'), session: true }),
    async (ctx, next) => {
      const email = ctx.state.user.emails?.[0]?.value
      const first = ctx.state.user.name.givenName
      const last = ctx.state.user.name.familyName
      if (email !== undefined) {
        if (ctx.query?.state != null) {
          const loginInfo = await joinWithProvider(ctx, db, productId, email, first, last, ctx.query.state)
          if (ctx.session != null) {
            ctx.session.loginInfo = loginInfo
          }
        } else {
          const loginInfo = await loginWithProvider(ctx, db, productId, email, first, last)
          if (ctx.session != null) {
            ctx.session.loginInfo = loginInfo
          }
        }
        // Successful authentication, redirect to your application
        ctx.redirect(concatLink(frontUrl, '/login/auth'))
      }
      await next()
    }
  )

  return 'google'
}
