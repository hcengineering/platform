import { joinWithProvider, loginWithProvider } from '@hcengineering/account'
import { concatLink, MeasureContext } from '@hcengineering/core'
import Router from 'koa-router'
import { Db } from 'mongodb'
import { Strategy as GitHubStrategy } from 'passport-github2'
import { Passport } from '.'

export function registerGithub (
  measureCtx: MeasureContext,
  passport: Passport,
  router: Router<any, any>,
  accountsUrl: string,
  db: Db,
  productId: string,
  frontUrl: string
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
    const state = ctx.query?.inviteId
    passport.authenticate('github', { scope: ['user:email'], session: true, state })(ctx, next)
  })

  router.get(
    redirectURL,
    passport.authenticate('github', { failureRedirect: concatLink(frontUrl, '/login'), session: true }),
    async (ctx, next) => {
      try {
        const email = ctx.state.user.emails?.[0]?.value ?? `github:${ctx.state.user.username}`
        const [first, last] = ctx.state.user.displayName?.split(' ') ?? [ctx.state.user.username, '']
        if (email !== undefined) {
          if (ctx.query?.state != null) {
            const loginInfo = await joinWithProvider(
              measureCtx,
              db,
              productId,
              null,
              email,
              first,
              last,
              ctx.query.state,
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
          // Successful authentication, redirect to your application
          ctx.redirect(concatLink(frontUrl, '/login/auth'))
        }
      } catch (err: any) {
        measureCtx.error('failed to auth', err)
      }
      await next()
    }
  )

  return 'github'
}
