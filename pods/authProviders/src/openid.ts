//
// Copyright © 2024 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//
import { type AccountDB, LoginInfo, joinWithProvider, loginOrSignUpWithProvider } from '@hcengineering/account'
import { BrandingMap, concatLink, MeasureContext, getBranding, SocialIdType } from '@hcengineering/core'
import Router from 'koa-router'
import { Issuer, Strategy } from 'openid-client'
import qs from 'querystringify'

import { Passport } from '.'
import { getHost, safeParseAuthState } from './utils'

export function registerOpenid (
  measureCtx: MeasureContext,
  passport: Passport,
  router: Router<any, any>,
  accountsUrl: string,
  dbPromise: Promise<AccountDB>,
  frontUrl: string,
  brandings: BrandingMap,
  signUpDisabled?: boolean
): string | undefined {
  const openidClientId = process.env.OPENID_CLIENT_ID
  const openidClientSecret = process.env.OPENID_CLIENT_SECRET
  const issuer = process.env.OPENID_ISSUER

  const redirectURL = '/auth/openid/callback'
  if (openidClientId === undefined || openidClientSecret === undefined || issuer === undefined) return

  Issuer.discover(issuer)
    .then((issuerObj) => {
      measureCtx.info('Discovered issuer', { issuer: issuerObj })

      const client = new issuerObj.Client({
        client_id: openidClientId,
        client_secret: openidClientSecret,
        redirect_uris: [concatLink(accountsUrl, redirectURL)],
        response_types: ['code']
      })
      measureCtx.info('Created OIDC client')

      passport.use(
        'oidc',
        new Strategy({ client, passReqToCallback: true }, (req: any, tokenSet: any, userinfo: any, done: any) => {
          return done(null, userinfo)
        })
      )
      measureCtx.info('Registered OIDC strategy')
    })
    .catch((err) => {
      measureCtx.error('Failed to create OIDC client for IdP with the provided configuration', { err })
    })

  router.get('/auth/openid', async (ctx, next) => {
    measureCtx.info('try auth via', { provider: 'openid' })
    const host = getHost(ctx.request.headers)
    const brandingKey = host !== undefined ? brandings[host]?.key ?? undefined : undefined
    const state = encodeURIComponent(
      JSON.stringify({
        inviteId: ctx.query?.inviteId,
        branding: brandingKey
      })
    )

    await passport.authenticate('oidc', {
      scope: 'openid profile email',
      state
    })(ctx, next)
  })

  router.get(
    redirectURL,
    async (ctx, next) => {
      const state = safeParseAuthState(ctx.query?.state)
      const branding = getBranding(brandings, state?.branding)

      await passport.authenticate('oidc', {
        failureRedirect: concatLink(branding?.front ?? frontUrl, '/login')
      })(ctx, next)
    },
    async (ctx, next) => {
      try {
        const email = ctx.state.user.email
        const verifiedEmail = (ctx.state.user.email_verified as boolean) ? email : ''
        const [first, last] = ctx.state.user.name?.split(' ') ?? [ctx.state.user.username, '']
        measureCtx.info('Provider auth handler', { email, verifiedEmail, type: 'openid' })

        let loginInfo: LoginInfo | null
        const state = safeParseAuthState(ctx.query?.state)
        const branding = getBranding(brandings, state?.branding)
        const db = await dbPromise
        const socialKey = { type: SocialIdType.OIDC, value: ctx.state.user.sub }

        if (state.inviteId != null && state.inviteId !== '') {
          loginInfo = await joinWithProvider(
            measureCtx,
            db,
            null,
            verifiedEmail,
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
            verifiedEmail,
            first,
            last,
            socialKey,
            signUpDisabled
          )
        }

        if (loginInfo === null) {
          measureCtx.info('Failed to auth: no associated account found', {
            email,
            verifiedEmail,
            type: 'openid',
            user: ctx.state?.user
          })
          ctx.redirect(concatLink(branding?.front ?? frontUrl, '/login'))
        } else {
          const origin = concatLink(branding?.front ?? frontUrl, '/login/auth')
          const query = encodeURIComponent(qs.stringify({ token: loginInfo.token }))

          measureCtx.info('Success auth, redirect', { email, type: 'openid', target: origin })
          // Successful authentication, redirect to your application
          ctx.redirect(`${origin}?${query}`)
        }
      } catch (err: any) {
        measureCtx.error('failed to auth', { err, type: 'openid', user: ctx.state?.user })
      }
      await next()
    }
  )

  return 'openid'
}
