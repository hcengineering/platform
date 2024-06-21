import { joinWithProvider, loginWithProvider } from '@hcengineering/account'
import { BrandingMap, concatLink, MeasureContext } from '@hcengineering/core'
import Router from 'koa-router'
import { Db } from 'mongodb'
import { Strategy as GitHubStrategy } from 'passport-github2'
import { Passport } from '.'
import { getBranding, getHost, safeParseAuthState } from './utils'

export function registerGithub (
  measureCtx: MeasureContext,
  passport: Passport,
  router: Router<any, any>,
  accountsUrl: string,
  db: Db,
  productId: string,
  frontUrl: string,
  brandings: BrandingMap
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
        const email = ctx.state.user.emails?.[0]?.value ?? `github:${ctx.state.user.username}`
        const [first, last] = ctx.state.user.displayName?.split(' ') ?? [ctx.state.user.username, '']
        measureCtx.info('Provider auth handler', { email, type: 'github' })
        if (email !== undefined) {
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
              state.inviteId as any,
              {
                githubId: ctx.state.user.id
              }
            )
            if (ctx.session != null) {
              ctx.session.loginInfo = loginInfo
            }
          } else {
            const loginInfo = await loginWithProvider(measureCtx, db, productId, null, email, first, last, {
              githubId: ctx.state.user.id
            })
            if (ctx.session != null) {
              ctx.session.loginInfo = loginInfo
            }
          }
          measureCtx.info('Success auth, redirect', { email, type: 'github' })
          // Successful authentication, redirect to your application
          ctx.redirect(concatLink(branding?.front ?? frontUrl, '/login/auth'))
        }
      } catch (err: any) {
        measureCtx.error('failed to auth', { err, type: 'github', user: ctx.state?.user })
      }
      await next()
    }
  )

  return 'github'
}
