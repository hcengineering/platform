import { type AccountDB, LoginInfo, joinWithProvider, loginOrSignUpWithProvider } from '@hcengineering/account'
import { BrandingMap, concatLink, MeasureContext, getBranding, SocialIdType } from '@hcengineering/core'
import Router from 'koa-router'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import qs from 'querystringify'
import { Passport } from '.'
import { getHost, safeParseAuthState } from './utils'

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
      measureCtx.info('Provider auth handler', { email, type: 'google' })

      try {
        let loginInfo: LoginInfo | null
        const state = safeParseAuthState(ctx.query?.state)
        const branding = getBranding(brandings, state?.branding)
        const db = await dbPromise
        const socialKey = { type: SocialIdType.GOOGLE, value: email }

        if (state.inviteId != null && state.inviteId !== '') {
          loginInfo = await joinWithProvider(
            measureCtx,
            db,
            null,
            email,
            first,
            last,
            state.inviteId as any,
            socialKey,
            signUpDisabled
          )
        } else {
          loginInfo = await loginOrSignUpWithProvider(
            measureCtx,
            db,
            null,
            email,
            first,
            last,
            socialKey,
            signUpDisabled
          )
        }

        if (loginInfo === null) {
          measureCtx.info('Failed to auth: no associated account found', {
            email,
            type: 'google',
            user: ctx.state?.user
          })
          ctx.redirect(concatLink(branding?.front ?? frontUrl, '/login'))
        } else {
          const origin = concatLink(branding?.front ?? frontUrl, '/login/auth')
          const query = encodeURIComponent(qs.stringify({ token: loginInfo.token }))

          // Successful authentication, redirect to your application
          measureCtx.info('Success auth, redirect', { email, type: 'google', target: origin })
          ctx.redirect(`${origin}?${query}`)
        }
      } catch (err: any) {
        measureCtx.error('failed to auth', { err, type: 'google', user: ctx.state?.user })
      }

      await next()
    }
  )

  return 'google'
}
