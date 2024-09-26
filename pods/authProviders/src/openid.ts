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
import { type AccountDB, joinWithProvider, loginWithProvider, type LoginInfo } from '@hcengineering/account'
import { BrandingMap, concatLink, MeasureContext, getBranding } from '@hcengineering/core'
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
  brandings: BrandingMap
): string | undefined {
  const openidClientId = process.env.OPENID_CLIENT_ID
  const openidClientSecret = process.env.OPENID_CLIENT_SECRET
  const issuer = process.env.OPENID_ISSUER

  const redirectURL = '/auth/openid/callback'
  if (openidClientId === undefined || openidClientSecret === undefined || issuer === undefined) return

  void Issuer.discover(issuer).then((issuerObj) => {
    const client = new issuerObj.Client({
      client_id: openidClientId,
      client_secret: openidClientSecret,
      redirect_uris: [concatLink(accountsUrl, redirectURL)],
      response_types: ['code']
    })

    passport.use(
      'oidc',
      new Strategy({ client, passReqToCallback: true }, (req: any, tokenSet: any, userinfo: any, done: any) => {
        return done(null, userinfo)
      })
    )
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
        const email = ctx.state.user.email ?? `openid:${ctx.state.user.sub}`
        const [first, last] = ctx.state.user.name?.split(' ') ?? [ctx.state.user.username, '']
        measureCtx.info('Provider auth handler', { email, type: 'openid' })
        if (email !== undefined) {
          let loginInfo: LoginInfo
          const state = safeParseAuthState(ctx.query?.state)
          const branding = getBranding(brandings, state?.branding)
          const db = await dbPromise
          if (state.inviteId != null && state.inviteId !== '') {
            loginInfo = await joinWithProvider(measureCtx, db, null, email, first, last, state.inviteId as any, {
              openId: ctx.state.user.sub
            })
          } else {
            loginInfo = await loginWithProvider(measureCtx, db, null, email, first, last, {
              openId: ctx.state.user.sub
            })
          }

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
