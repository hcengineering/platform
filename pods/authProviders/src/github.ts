import { type AccountDB } from '@hcengineering/account'
import { BrandingMap, concatLink, MeasureContext, getBranding, SocialIdType } from '@hcengineering/core'
import Router from 'koa-router'
import { Strategy as GitHubStrategy } from 'passport-github2'
import { Passport } from '.'
import { encodeState, handleProviderAuth, safeParseAuthState } from './utils'

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
    const state = encodeState(ctx, brandings)

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
      const email = ctx.state.user.emails?.[0]?.value
      const [first, last] = ctx.state.user.displayName?.split(' ') ?? [ctx.state.user.username, '']
      const db = await dbPromise

      const redirectUrl = await handleProviderAuth(
        measureCtx,
        db,
        brandings,
        frontUrl,
        'github',
        ctx.query?.state,
        ctx.state?.user,
        email,
        first,
        last,
        { type: SocialIdType.GITHUB, value: ctx.state.user.username },
        signUpDisabled
      )

      if (redirectUrl !== '') {
        ctx.redirect(redirectUrl)
      }

      await next()
    }
  )

  return 'github'
}
