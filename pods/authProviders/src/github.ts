import { concatLink } from '@hcengineering/core'
import Router from 'koa-router'
import { Strategy as GitHubStrategy } from 'passport-github2'
import { joinWithProvider, loginWithProvider } from '@hcengineering/account'
import { Db } from 'mongodb'
import { Passport } from '.'

export function registerGithub (
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
      const email = ctx.state.user.email ?? `github:${ctx.state.user.username}`
      const [first, last] = ctx.state.user.displayName.split(' ')
      if (email !== undefined) {
        if (ctx.query?.state != null) {
          const loginInfo = await joinWithProvider(db, productId, email, first, last, ctx.query.state)
          if (ctx.session != null) {
            ctx.session.loginInfo = loginInfo
          }
        } else {
          const loginInfo = await loginWithProvider(db, productId, email, first, last)
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

  return 'github'
}
