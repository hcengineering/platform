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

const DISCOVERY_INITIAL_DELAY_MS = 5_000
const DISCOVERY_MAX_DELAY_MS = 60_000
const DISCOVERY_BACKOFF_FACTOR = 2
const RETRY_WARN_FIRST_ATTEMPTS = 5
const RETRY_WARN_EVERY_NTH_ATTEMPT = 60

export interface OidcRegistrationParams {
  issuerUrl: string
  clientId: string
  clientSecret: string
  redirectUri: string
}

export interface OidcRetryOptions {
  initialDelayMs?: number
  maxDelayMs?: number
  backoffFactor?: number
  /** Injectable for tests; defaults to Issuer.discover. */
  discover?: (url: string) => Promise<Issuer<any>>
  /** Injectable for tests; defaults to a real setTimeout-based sleep. */
  sleep?: (ms: number) => Promise<void>
}

/** Structural subset of passport used by the retry loop — keeps tests free of a real passport instance. */
export interface PassportLike {
  use: (name: string, strategy: any) => unknown
}

/**
 * Log-flood gating for the unbounded retry loop (L-AUTH-2 rationale): warn on
 * the first 5 attempts, then on every 60th. At the 60s backoff cap that is
 * ~24 warn lines/day for a permanently broken configuration instead of ~1440,
 * while a real misconfiguration stays visible on an hourly cadence.
 */
export function shouldWarnOnAttempt (attempt: number): boolean {
  return attempt <= RETRY_WARN_FIRST_ATTEMPTS || attempt % RETRY_WARN_EVERY_NTH_ATTEMPT === 0
}

/**
 * Retry the ENTIRE OIDC strategy registration — discover, client construction,
 * strategy construction, passport.use — with capped exponential backoff until
 * it succeeds. The loop only ends after passport.use has run: openid-client can
 * also throw at client/strategy construction (e.g. unsupported PKCE method in
 * temporarily incomplete issuer metadata), and any of those failures must not
 * permanently disable OIDC login (incident: 10 days of 500 "Unknown
 * authentication strategy" until a manual restart). Deliberately unbounded and
 * deliberately without transient/permanent classification: misclassifying a
 * transient error would recreate the incident, the steady-state cost is
 * <= 1 attempt/min, and a truly broken configuration stays visible through the
 * gated warn cadence (shouldWarnOnAttempt). Never rejects.
 */
export async function registerOidcStrategyWithRetry (
  measureCtx: MeasureContext,
  passport: PassportLike,
  params: OidcRegistrationParams,
  options: OidcRetryOptions = {}
): Promise<{ attempts: number }> {
  const initialDelayMs = options.initialDelayMs ?? DISCOVERY_INITIAL_DELAY_MS
  const maxDelayMs = options.maxDelayMs ?? DISCOVERY_MAX_DELAY_MS
  const backoffFactor = options.backoffFactor ?? DISCOVERY_BACKOFF_FACTOR
  const discover = options.discover ?? (async (url: string) => await Issuer.discover(url))
  const sleep =
    options.sleep ??
    (async (ms: number) => {
      await new Promise<void>((resolve) => setTimeout(resolve, ms))
    })

  let delayMs = initialDelayMs
  for (let attempt = 1; ; attempt++) {
    try {
      const issuerObj = await discover(params.issuerUrl)
      measureCtx.info('Discovered issuer', { issuer: issuerObj, attempts: attempt })

      const client = new issuerObj.Client({
        client_id: params.clientId,
        client_secret: params.clientSecret,
        redirect_uris: [params.redirectUri],
        response_types: ['code']
      })
      measureCtx.info('Created OIDC client')

      passport.use(
        'oidc',
        new Strategy({ client, passReqToCallback: true }, (req: any, tokenSet: any, userinfo: any, done: any) => {
          return done(null, userinfo)
        })
      )
      // passport.use has run: the strategy is now registered exactly once. A throw
      // from the success log below must NOT re-enter the retry loop (that would
      // call passport.use a second time), so keep the log failure-safe and return
      // regardless of whether it succeeds.
      try {
        measureCtx.info('Registered OIDC strategy', { attempts: attempt })
      } catch {
        /* logging must never undo a successful registration */
      }
      return { attempts: attempt }
    } catch (err: any) {
      if (shouldWarnOnAttempt(attempt)) {
        try {
          // L-AUTH-2 convention: terse warn in normal operation, stack only with OIDC_DEBUG.
          measureCtx.warn('OIDC strategy registration failed — will retry', {
            attempt,
            nextRetryMs: delayMs,
            errName: err?.name,
            errMessage: err?.message,
            ...(process.env.OIDC_DEBUG === 'true' ? { errStack: err?.stack } : {})
          })
        } catch {
          /* the retry contract ("never rejects") outranks a warn that throws */
        }
      }
      await sleep(delayMs)
      delayMs = Math.min(delayMs * backoffFactor, maxDelayMs)
    }
  }
}

/**
 * Invariant: called exactly once per process, from registerProviders at
 * account-service startup (pods/authProviders/src/index.ts, the only caller).
 * A second invocation would duplicate routes and the retry loop; that would
 * already be a caller bug today (duplicate routes, duplicate passport.use).
 */
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

  let oidcReady = false

  // The helper never rejects (it retries forever, and both its success and its
  // failure logging are failure-safe), and the .then body is a plain boolean
  // flip that cannot throw. The trailing .catch(() => {}) is belt-and-suspenders:
  // this chain is fire-and-forget, so even a hypothetical rejection must never
  // surface as an unhandled rejection (which could crash the process). Success
  // logging happens inside the helper ('Registered OIDC strategy' { attempts }).
  void registerOidcStrategyWithRetry(measureCtx, passport, {
    issuerUrl: issuer,
    clientId: openidClientId,
    clientSecret: openidClientSecret,
    redirectUri: concatLink(accountsUrl, redirectURL)
  })
    .then(() => {
      oidcReady = true
    })
    .catch(() => {})

  router.get('/auth/openid', async (ctx, next) => {
    if (!oidcReady) {
      // Pending window: the registration retry loop has not succeeded yet.
      // Honest temporary-failure semantics: 503 + Retry-After matching the
      // retry loop's initial delay. Deliberately not a redirect to /login —
      // the login app only reads navigateUrl/token from the query
      // (LoginApp.svelte), an error param would be silently ignored, and
      // L-AUTH-4 only covers the callback path. Window is normally seconds
      // long thanks to the registration retry above.
      measureCtx.warn('OIDC login attempted before strategy registration — auth backend initializing', {})
      ctx.status = 503
      ctx.set('Retry-After', '5')
      ctx.body = 'OIDC authentication is initializing, please retry shortly'
      return
    }
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
          // L-AUTH-2: keep only a terse error line in normal operation; the
          // verbose diagnostics (errStack/sessionKeys/host/…) are enabled by
          // OIDC_DEBUG so anonymous repeated invalid callbacks cannot flood logs.
          const baseDiag = {
            stage: 'oidc_callback',
            hasErr: err != null,
            errName: err?.name,
            errMessage: err?.message,
            statusCode: status,
            hasUser: user != null
          }
          const diag =
            process.env.OIDC_DEBUG === 'true'
              ? {
                  ...baseDiag,
                  errStack: err?.stack,
                  infoSummary: info?.message ?? String(info ?? ''),
                  hasSession: ctx.session != null,
                  sessionKeys: ctx.session != null ? Object.keys(ctx.session) : [],
                  hasCookieHeader: ctx.request.headers.cookie != null,
                  host: ctx.request.headers.host,
                  forwardedProto: ctx.request.headers['x-forwarded-proto'],
                  statePresent: typeof ctx.query?.state === 'string',
                  stateLength: typeof ctx.query?.state === 'string' ? (ctx.query.state as string).length : 0,
                  codePresent: typeof ctx.query?.code === 'string'
                }
              : baseDiag
          if (err != null || user == null) {
            measureCtx.error('OIDC callback failed', diag)
          } else {
            measureCtx.info('OIDC callback succeeded — entering handleProviderAuth', {
              hasSession: ctx.session != null
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
      } else {
        // L-AUTH-4: handleProviderAuth signals an unresolvable login with '' (e.g.
        // no account + signup disabled). Terminate fail-closed with an explicit
        // 302 to /login instead of leaving a hanging/empty response.
        ctx.redirect(loginUrl + '?error=oidc_no_account')
      }

      await next()
    } catch (err: any) {
      // Permanent invalid-callback guard: ANY failure → 302 to /login, never 500.
      // L-AUTH-2: verbose fields behind OIDC_DEBUG (see the callback diag above).
      const baseDiag = {
        stage: 'oidc_callback',
        hasErr: true,
        errName: err?.name,
        errMessage: err?.message,
        statusCode: undefined,
        hasUser: ctx.state?.user != null
      }
      measureCtx.error(
        'OIDC callback failed',
        process.env.OIDC_DEBUG === 'true'
          ? {
              ...baseDiag,
              errStack: err?.stack,
              infoSummary: '',
              hasSession: ctx.session != null,
              sessionKeys: ctx.session != null ? Object.keys(ctx.session) : [],
              hasCookieHeader: ctx.request.headers.cookie != null,
              host: ctx.request.headers.host,
              forwardedProto: ctx.request.headers['x-forwarded-proto'],
              statePresent: typeof ctx.query?.state === 'string',
              stateLength: typeof ctx.query?.state === 'string' ? (ctx.query.state as string).length : 0,
              codePresent: typeof ctx.query?.code === 'string'
            }
          : baseDiag
      )
      ctx.redirect(loginUrl + '?error=oidc_callback_failed')
    }
  })

  return { name, displayName }
}
