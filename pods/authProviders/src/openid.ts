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
import { encodeState, handleProviderAuth, safeParseAuthState } from './utils'

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
    const state = encodeState(ctx, brandings)

    await passport.authenticate('oidc', {
      scope: 'openid profile email',
      state
    })(ctx, next)
  })

  router.get(redirectURL, async (ctx, next) => {
    const state = safeParseAuthState(ctx.query?.state)
    const branding = getBranding(brandings, state?.branding)
    const loginUrl = concatLink(branding?.front ?? frontUrl, '/login')

    try {
      // INSTRUMENTATION (Codex-approved): explicit-callback variant captures
      // err/info/status that would otherwise be swallowed by the strategy.
      // PRIVACY: never log raw code, raw state, tokens, or full ctx.state.user.
      await new Promise<void>((resolve) => {
        passport.authenticate('oidc', { failureRedirect: loginUrl }, (err: any, user: any, info: any, status: any) => {
          const diag = {
            stage: 'oidc_callback',
            hasErr: err != null,
            errMessage: err?.message,
            errName: err?.name,
            errStack: err?.stack,
            hasUser: user != null,
            infoSummary: info?.message ?? String(info ?? ''),
            statusCode: status,
            // session + cookie diagnostics (no raw values)
            hasSession: ctx.session != null,
            sessionKeys: ctx.session != null ? Object.keys(ctx.session) : [],
            hasCookieHeader: ctx.request.headers.cookie != null,
            // request shape
            host: ctx.request.headers.host,
            forwardedProto: ctx.request.headers['x-forwarded-proto'],
            // state presence (length only, not value)
            statePresent: typeof ctx.query?.state === 'string',
            stateLength: typeof ctx.query?.state === 'string' ? (ctx.query.state as string).length : 0,
            codePresent: typeof ctx.query?.code === 'string'
          }
          if (err != null || user == null) {
            measureCtx.error('OIDC callback failed', diag)
          } else {
            measureCtx.info('OIDC callback succeeded — entering handleProviderAuth', {
              hasSession: diag.hasSession
            })
            ctx.state.user = user
          }
          resolve()
        })(ctx, async () => {})
      })

      if (ctx.state.user == null) {
        // Strategy failed; redirect explicitly so we never bubble a 500.
        ctx.redirect(loginUrl + '?error=oidc_callback_failed')
        return
      }

      const email = ctx.state.user.email
      const verifiedEmail = (ctx.state.user.email_verified as boolean) ? email : ''
      const nameParts = (ctx.state.user.name ?? ctx.state.user.username ?? '').split(' ')
      const first: string = ctx.state.user.given_name ?? nameParts[0] ?? ''
      const last: string = ctx.state.user.family_name ?? nameParts.slice(1).join(' ')

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
    } catch (err: any) {
      // Permanent invalid-callback guard: ANY failure → 302 to /login, never 500.
      measureCtx.error('OIDC callback failed', {
        stage: 'oidc_callback',
        hasErr: true,
        errMessage: err?.message,
        errName: err?.name,
        errStack: err?.stack,
        hasUser: ctx.state?.user != null,
        infoSummary: '',
        statusCode: undefined,
        hasSession: ctx.session != null,
        sessionKeys: ctx.session != null ? Object.keys(ctx.session) : [],
        hasCookieHeader: ctx.request.headers.cookie != null,
        host: ctx.request.headers.host,
        forwardedProto: ctx.request.headers['x-forwarded-proto'],
        statePresent: typeof ctx.query?.state === 'string',
        stateLength: typeof ctx.query?.state === 'string' ? (ctx.query.state as string).length : 0,
        codePresent: typeof ctx.query?.code === 'string'
      })
      ctx.redirect(loginUrl + '?error=oidc_callback_failed')
    }
  })

  return { name, displayName }
}
