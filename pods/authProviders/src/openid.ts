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
import { type AccountDB } from '@hcengineering/account'
import { type ProviderInfo } from '@hcengineering/account-client'
import { BrandingMap, concatLink, MeasureContext, getBranding, SocialIdType } from '@hcengineering/core'
import Router from 'koa-router'
import { Issuer, Strategy } from 'openid-client'

import { Passport } from '.'
import {
  encodeState,
  handleProviderAuth,
  safeParseAuthState,
  setAuthStateTokenCookie,
  validateAuthStateTokenCookie
} from './utils'

export function registerOpenid (
  measureCtx: MeasureContext,
  passport: Passport,
  router: Router<any, any>,
  accountsUrl: string,
  dbPromise: Promise<AccountDB>,
  frontUrl: string,
  brandings: BrandingMap,
  signUpDisabled?: boolean
): ProviderInfo | undefined {
  const openidClientId = process.env.OPENID_CLIENT_ID
  const openidClientSecret = process.env.OPENID_CLIENT_SECRET
  const issuer = process.env.OPENID_ISSUER
  const name = 'openid'
  const displayName = process.env.OPENID_DISPLAY_NAME

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

    const nonce = crypto.randomUUID()
    setAuthStateTokenCookie(ctx, nonce)

    const state = encodeState(ctx, brandings, nonce)

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
      const loginUrl = concatLink(branding?.front ?? frontUrl, '/login')
      const isValidState = validateAuthStateTokenCookie(ctx, state?.nonce)
      if (!isValidState) {
        ctx.redirect(loginUrl)
        return
      }

      await passport.authenticate('oidc', {
        failureRedirect: loginUrl
      })(ctx, next)
    },
    async (ctx, next) => {
      const email = ctx.state.user.email
      const verifiedEmail = (ctx.state.user.email_verified as boolean) ? email : ''
      const [first, last] = ctx.state.user.name?.split(' ') ?? [ctx.state.user.username, '']

      const db = await dbPromise
      const redirectUrl = await handleProviderAuth(
        measureCtx,
        db,
        brandings,
        frontUrl,
        'openid',
        ctx.query?.state,
        ctx.state?.user,
        verifiedEmail,
        first,
        last,
        { type: SocialIdType.OIDC, value: ctx.state.user.sub },
        signUpDisabled
      )

      if (redirectUrl !== '') {
        ctx.redirect(redirectUrl)
      }

      await next()
    }
  )

  return { name, displayName }
}
