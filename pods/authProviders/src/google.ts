import { type AccountDB } from '@hcengineering/account'
import { BrandingMap, concatLink, MeasureContext, getBranding, SocialIdType } from '@hcengineering/core'
import Router from 'koa-router'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { Passport } from '.'
import { getHost, handleProviderAuth, safeParseAuthState } from './utils'

export function registerGoogle (
  measureCtx: MeasureContext,
  passport: Passport,
  router: Router<any, any>,
  accountsUrl: string,
  dbPromise: Promise<AccountDB>,
  frontUrl: string,
  brandings: BrandingMap,
  signUpDisabled?: boolean
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
      const db = await dbPromise

      const redirectUrl = await handleProviderAuth(
        measureCtx,
        db,
        brandings,
        frontUrl,
        'google',
        ctx.query?.state,
        ctx.state?.user,
        email,
        first,
        last,
        { type: SocialIdType.GOOGLE, value: email },
        signUpDisabled
      )

      if (redirectUrl !== '') {
        ctx.redirect(redirectUrl)
      }

      await next()
    }
  )

  return 'google'
}
