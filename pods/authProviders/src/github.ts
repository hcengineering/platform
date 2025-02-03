import { type AccountDB, LoginInfo, joinWithProvider, loginOrSignUpWithProvider } from '@hcengineering/account'
import { BrandingMap, concatLink, MeasureContext, getBranding, SocialIdType } from '@hcengineering/core'
import Router from 'koa-router'
import { Strategy as GitHubStrategy } from 'passport-github2'
import qs from 'querystringify'
import { Passport } from '.'
import { getHost, safeParseAuthState } from './utils'

export function registerGithub (
  measureCtx: MeasureContext,
  passport: Passport,
  router: Router<any, any>,
  accountsUrl: string,
  dbPromise: Promise<AccountDB>,
  frontUrl: string,
  brandings: BrandingMap,
  signUpDisabled?: boolean
): string | undefined {
  const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID
  const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET

  const redirectURL = '/auth/github/callback'
  if (GITHUB_CLIENT_ID === undefined || GITHUB_CLIENT_SECRET === undefined) return
  passport.use(
    new GitHubStrategy(
      {
        clientID: GITHUB_CLIENT_ID,
        clientSecret: GITHUB_CLIENT_SECRET,
        callbackURL: concatLink(accountsUrl, redirectURL),
        passReqToCallback: true
      },
      function (req: any, accessToken: string, refreshToken: string, profile: any, done: any) {
        done(null, profile)
      }
    )
  )

  router.get('/auth/github', async (ctx, next) => {
    measureCtx.info('try auth via', { provider: 'github' })
    const host = getHost(ctx.request.headers)
    const branding = host !== undefined ? brandings[host]?.key ?? undefined : undefined
    const state = encodeURIComponent(
      JSON.stringify({
        inviteId: ctx.query?.inviteId,
        branding
      })
    )

    passport.authenticate('github', { scope: ['user:email'], session: true, state })(ctx, next)
  })

  router.get(
    redirectURL,
    async (ctx, next) => {
      const state = safeParseAuthState(ctx.query?.state)
      const branding = getBranding(brandings, state?.branding)

      await passport.authenticate('github', {
        failureRedirect: concatLink(branding?.front ?? frontUrl, '/login'),
        session: true
      })(ctx, next)
    },
    async (ctx, next) => {
      try {
        const email = ctx.state.user.emails?.[0]?.value
        const [first, last] = ctx.state.user.displayName?.split(' ') ?? [ctx.state.user.username, '']

        measureCtx.info('Provider auth handler', { email, type: 'github' })
        let loginInfo: LoginInfo | null
        const state = safeParseAuthState(ctx.query?.state)
        const branding = getBranding(brandings, state?.branding)
        const db = await dbPromise
        const socialKey = { type: SocialIdType.GITHUB, value: ctx.state.user.username }

        if (state.inviteId != null && state.inviteId !== '') {
          loginInfo = await joinWithProvider(measureCtx, db, null, email, first, last, state.inviteId as any, socialKey, signUpDisabled)
        } else {
          loginInfo = await loginOrSignUpWithProvider(measureCtx, db, null, email, first, last, socialKey, signUpDisabled)
        }

        if (loginInfo === null) {
          measureCtx.info('Failed to auth: no associated account found', {
            email,
            type: 'github',
            user: ctx.state?.user
          })
          ctx.redirect(concatLink(branding?.front ?? frontUrl, '/login'))
        } else {
          const origin = concatLink(branding?.front ?? frontUrl, '/login/auth')
          const query = encodeURIComponent(qs.stringify({ token: loginInfo.token }))

          measureCtx.info('Success auth, redirect', { email, type: 'github', target: origin })
          // Successful authentication, redirect to your application
          ctx.redirect(`${origin}?${query}`)
        }
      } catch (err: any) {
        measureCtx.error('failed to auth', { err, type: 'github', user: ctx.state?.user })
      }
      await next()
    }
  )

  return 'github'
}
