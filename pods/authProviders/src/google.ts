import { joinWithProvider, loginWithProvider } from '@hcengineering/account'
import { BrandingMap, concatLink, MeasureContext } from '@hcengineering/core'
import Router from 'koa-router'
import { Db } from 'mongodb'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { Passport } from '.'
import { getBranding, getHost, safeParseAuthState } from './utils'

export function registerGoogle (
  measureCtx: MeasureContext,
  passport: Passport,
  router: Router<any, any>,
  accountsUrl: string,
  db: Db,
  productId: string,
  frontUrl: string,
  brandings: BrandingMap
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
    measureCtx.info('try auth via', { provider: 'google' })
    const host = getHost(ctx.request.headers)
    const branding = host !== undefined ? brandings[host]?.key ?? undefined : undefined
    const state = encodeURIComponent(
      JSON.stringify({
        inviteId: ctx.query?.inviteId,
        branding
      })
    )

    passport.authenticate('google', { scope: ['profile', 'email'], session: true, state })(ctx, next)
  })

  router.get(
    redirectURL,
    async (ctx, next) => {
      const state = safeParseAuthState(ctx.query?.state)
      measureCtx.info('Auth state', { state })
      const branding = getBranding(brandings, state?.branding)
      measureCtx.info('With branding', { branding })
      const failureRedirect = concatLink(branding?.front ?? frontUrl, '/login')
      measureCtx.info('With failure redirect', { failureRedirect })
      await passport.authenticate('google', {
        failureRedirect,
        session: true
      })(ctx, next)
    },
    async (ctx, next) => {
      measureCtx.info('Provider auth success', { type: 'google', user: ctx.state?.user })
      const email = ctx.state.user.emails?.[0]?.value
      const first = ctx.state.user.name.givenName
      const last = ctx.state.user.name.familyName
      measureCtx.info('Provider auth handler', { email, type: 'google' })
      if (email !== undefined) {
        try {
          const state = safeParseAuthState(ctx.query?.state)
          const branding = getBranding(brandings, state?.branding)
          if (state.inviteId != null && state.inviteId !== '') {
            const loginInfo = await joinWithProvider(
              measureCtx,
              db,
              productId,
              null,
              email,
              first,
              last,
              state.inviteId as any
            )
            if (ctx.session != null) {
              ctx.session.loginInfo = loginInfo
            }
          } else {
            const loginInfo = await loginWithProvider(measureCtx, db, productId, null, email, first, last)
            if (ctx.session != null) {
              ctx.session.loginInfo = loginInfo
            }
          }

          // Successful authentication, redirect to your application
          measureCtx.info('Success auth, redirect', { email, type: 'google' })
          ctx.redirect(concatLink(branding?.front ?? frontUrl, '/login/auth'))
        } catch (err: any) {
          measureCtx.error('failed to auth', { err, type: 'google', user: ctx.state?.user })
        }
      }
      await next()
    }
  )

  return 'google'
}
