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
import { synchronizeOidcWorkspaceRoles, type AccountDB } from '@hcengineering/account'
import { type ProviderInfo } from '@hcengineering/account-client'
import { BrandingMap, concatLink, MeasureContext, getBranding, SocialIdType } from '@hcengineering/core'
import Router from 'koa-router'
import { Issuer, Strategy } from 'openid-client'

import { Passport } from '.'
import { authorizeOpenidUser, type OpenidUser } from './oidcAuthorization'
import { type OidcClaims } from './oidcClaims'
import { getOidcGroups } from './oidcGroups'
import {
  getAllowedGroups,
  getOidcWorkspaceRoles,
  resolveOidcRoleGroupRules,
  warnOnEmptyAutoAllowedGroups
} from './oidcRoleGroups'
import { encodeState, handleProviderAuth, ProviderAuthenticationHookError, safeParseAuthState } from './utils'

const validOpenidPrompts = new Set(['select_account', 'login', 'consent', 'none'])

function getOpenidPrompt (measureCtx: MeasureContext): string | undefined {
  const configuredPrompt = process.env.OPENID_PROMPT?.trim()
  if (configuredPrompt === undefined || configuredPrompt === '') return

  const prompts = configuredPrompt.split(/\s+/)
  const isValid =
    prompts.every((prompt) => validOpenidPrompts.has(prompt)) &&
    new Set(prompts).size === prompts.length &&
    (!prompts.includes('none') || prompts.length === 1)

  if (!isValid) {
    measureCtx.warn('Ignoring invalid OPENID_PROMPT configuration')
    return
  }

  return prompts.join(' ')
}

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
  /** Stops retrying during graceful shutdown. */
  signal?: AbortSignal
}

export interface OidcRegistrationResult {
  attempts: number
  registered: boolean
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

async function sleepUntilRetryOrAbort (
  sleep: (ms: number) => Promise<void>,
  delayMs: number,
  signal?: AbortSignal
): Promise<boolean> {
  if (signal == null) {
    await sleep(delayMs)
    return false
  }
  if (signal.aborted) return true

  return await new Promise<boolean>((resolve, reject) => {
    const finish = (aborted: boolean): void => {
      signal.removeEventListener('abort', onAbort)
      resolve(aborted)
    }
    const onAbort = (): void => {
      finish(true)
    }
    signal.addEventListener('abort', onAbort, { once: true })
    void Promise.resolve()
      .then(async () => {
        await sleep(delayMs)
      })
      .then(
        () => {
          finish(false)
        },
        (err) => {
          signal.removeEventListener('abort', onAbort)
          reject(err)
        }
      )
  })
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
 * gated warn cadence (shouldWarnOnAttempt). An optional AbortSignal lets the
 * caller stop waiting during graceful shutdown.
 */
export async function registerOidcStrategyWithRetry (
  measureCtx: MeasureContext,
  passport: PassportLike,
  params: OidcRegistrationParams,
  options: OidcRetryOptions = {}
): Promise<OidcRegistrationResult> {
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
  let attempts = 0
  for (let attempt = 1; options.signal == null || !options.signal.aborted; attempt++) {
    attempts = attempt
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
          const claims = tokenSet.claims()
          const idClaims: OidcClaims = {
            sub: claims.sub,
            email: claims.email,
            preferred_username: claims.preferred_username,
            upn: claims.upn,
            idp: claims.idp,
            acct: claims.acct,
            email_verified: claims.email_verified,
            xms_edov: claims.xms_edov,
            tid: claims.tid,
            iss: claims.iss,
            groups: claims.groups,
            _claim_names: claims._claim_names,
            _claim_sources: claims._claim_sources,
            hasgroups: claims.hasgroups
          }
          return done(null, { ...userinfo, sub: userinfo?.sub ?? claims.sub, _idClaims: idClaims })
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
      return { attempts: attempt, registered: true }
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
      if (await sleepUntilRetryOrAbort(sleep, delayMs, options.signal)) break
      delayMs = Math.min(delayMs * backoffFactor, maxDelayMs)
    }
  }
  return { attempts, registered: false }
}

function buildOidcCallbackDiagnostic (ctx: any, err: any, info: any, status: any, user: any): Record<string, unknown> {
  const baseDiag = {
    stage: 'oidc_callback',
    hasErr: err != null,
    errName: err?.name,
    errMessage: err?.message,
    statusCode: status,
    hasUser: user != null && user !== false
  }
  if (process.env.OIDC_DEBUG !== 'true') return baseDiag

  return {
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
}

function logOidcCallbackFailure (
  measureCtx: MeasureContext,
  level: 'warn' | 'error',
  diagnostic: Record<string, unknown>
): void {
  try {
    measureCtx[level]('OIDC callback failed', diagnostic)
  } catch {
    // Callback failure handling must still redirect if the log sink is down.
  }
}

function callbackRedirect (frontUrl: string, redirectUrl: string): string {
  return URL.canParse(redirectUrl) ? redirectUrl : concatLink(frontUrl, redirectUrl)
}

const openidRouters = new WeakSet<object>()

/**
 * Called once per router from registerProviders at account-service startup
 * (pods/authProviders/src/index.ts, the only caller). Re-registering on the
 * same router is rejected to prevent duplicate routes and retry loops.
 */
export function registerOpenid (
  measureCtx: MeasureContext,
  passport: Passport,
  router: Router<any, any>,
  accountsUrl: string,
  dbPromise: Promise<AccountDB>,
  frontUrl: string,
  brandings: BrandingMap,
  signUpDisabled?: boolean,
  shutdownSignal?: AbortSignal
): ProviderInfo | undefined {
  const openidClientId = process.env.OPENID_CLIENT_ID
  const openidClientSecret = process.env.OPENID_CLIENT_SECRET
  const issuer = process.env.OPENID_ISSUER
  const name = 'openid'
  const displayName = process.env.OPENID_DISPLAY_NAME

  const redirectURL = '/auth/openid/callback'
  if (openidClientId === undefined || openidClientSecret === undefined || issuer === undefined) return
  const prompt = getOpenidPrompt(measureCtx)
  let roleRules: Promise<Awaited<ReturnType<typeof resolveOidcRoleGroupRules>>> | undefined
  const getRoleRules = async (): Promise<Awaited<ReturnType<typeof resolveOidcRoleGroupRules>>> => {
    if (roleRules === undefined) {
      roleRules = dbPromise
        .then(async (db) => {
          const rules = await resolveOidcRoleGroupRules(measureCtx, db, process.env.OPENID_ROLE_GROUPS)
          warnOnEmptyAutoAllowedGroups(measureCtx, process.env.OPENID_ALLOWED_GROUPS, rules)
          return rules
        })
        .catch((err) => {
          // Cache successful resolution only. A transient database error must
          // not make every future OIDC callback fail until the pod restarts.
          roleRules = undefined
          measureCtx.error('OIDC role-group rules could not be resolved; retrying on the next login', { err })
          throw err
        })
    }
    return await roleRules
  }
  if (openidRouters.has(router)) {
    throw new Error('OIDC provider is already registered on this router')
  }
  openidRouters.add(router)

  let oidcReady = false

  // The helper never rejects (it retries forever, and both its success and its
  // failure logging are failure-safe), and the .then body is a plain boolean
  // flip that cannot throw. The trailing .catch(() => {}) is belt-and-suspenders:
  // this chain is fire-and-forget, so even a hypothetical rejection must never
  // surface as an unhandled rejection (which could crash the process). Success
  // logging happens inside the helper ('Registered OIDC strategy' { attempts }).
  void registerOidcStrategyWithRetry(
    measureCtx,
    passport,
    {
      issuerUrl: issuer,
      clientId: openidClientId,
      clientSecret: openidClientSecret,
      redirectUri: concatLink(accountsUrl, redirectURL)
    },
    { signal: shutdownSignal }
  )
    .then(({ registered }) => {
      oidcReady = registered
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

    const options = {
      scope: 'openid profile email',
      state,
      ...(prompt !== undefined ? { prompt } : {})
    }

    await passport.authenticate('oidc', options)(ctx, next)
  })

  router.get(redirectURL, async (ctx) => {
    const state = safeParseAuthState(ctx.query?.state)
    const branding = getBranding(brandings, state?.branding)
    const loginUrl = concatLink(branding?.front ?? frontUrl, '/login')

    try {
      // INSTRUMENTATION (Codex-approved): explicit-callback variant captures
      // err/info/status that would otherwise be swallowed by the strategy.
      // PRIVACY: never log raw code, raw state, tokens, or full ctx.state.user.
      await new Promise<void>((resolve, reject) => {
        try {
          let settled = false
          const finish = (): void => {
            if (!settled) {
              settled = true
              resolve()
            }
          }
          const middleware = passport.authenticate(
            'oidc',
            { failureRedirect: loginUrl },
            (err: any, user: any, info: any, status: any) => {
              const diag = buildOidcCallbackDiagnostic(ctx, err, info, status, user)
              if (err != null || user == null || user === false) {
                // Anonymous callback errors are expected internet-facing input;
                // keep them visible without promoting scanner noise to errors.
                logOidcCallbackFailure(measureCtx, 'warn', diag)
              } else {
                measureCtx.info('OIDC callback succeeded — entering handleProviderAuth', {
                  hasSession: ctx.session != null
                })
                ctx.state.user = user
              }
              finish()
            }
          )
          // koa-passport invokes the explicit callback above rather than next.
          // Test adapters or middleware that call next must also settle this
          // wrapper so they cannot leave the request hanging.
          void Promise.resolve(
            middleware(ctx, async () => {
              finish()
            })
          ).catch(reject)
        } catch (err) {
          reject(err)
        }
      })

      if (ctx.state.user == null || ctx.state.user === false) {
        // Strategy failed; redirect explicitly so we never bubble a 500.
        ctx.redirect(loginUrl + '?error=oidc_callback_failed')
        return
      }

      const user = ctx.state.user as OpenidUser
      const db = await dbPromise
      const resolvedRoleRules = await getRoleRules()
      const allowedGroups = getAllowedGroups(process.env.OPENID_ALLOWED_GROUPS, resolvedRoleRules)
      const oidcGroups = getOidcGroups(user._idClaims)
      const workspaceRoles = getOidcWorkspaceRoles(user._idClaims, resolvedRoleRules)
      const subject = typeof user._idClaims?.sub === 'string' ? user._idClaims.sub : undefined
      if (resolvedRoleRules.length > 0 && oidcGroups.state !== 'available') {
        measureCtx.warn(
          oidcGroups.state === 'overage'
            ? 'oidc_workspace_role_sync_groups_overage'
            : 'oidc_workspace_role_sync_groups_missing',
          { sub: subject }
        )
      }
      const redirectUrl = await authorizeOpenidUser(
        measureCtx,
        user,
        issuer,
        signUpDisabled,
        async (verifiedEmail, effectiveSignUpDisabled) => {
          const name =
            typeof user.name === 'string' ? user.name : typeof user.username === 'string' ? user.username : ''
          const nameParts = name.split(' ')
          const first = typeof user.given_name === 'string' ? user.given_name : (nameParts[0] ?? '')
          const last = typeof user.family_name === 'string' ? user.family_name : nameParts.slice(1).join(' ')
          try {
            return await handleProviderAuth(
              measureCtx,
              db,
              brandings,
              frontUrl,
              'openid',
              ctx.query?.state,
              undefined,
              verifiedEmail,
              first,
              last,
              { type: SocialIdType.OIDC, value: user.sub as string },
              effectiveSignUpDisabled,
              async (loginInfo) => {
                if (workspaceRoles !== undefined) {
                  await synchronizeOidcWorkspaceRoles(measureCtx, db, loginInfo.account, subject, workspaceRoles)
                }
              }
            )
          } catch (err) {
            if (err instanceof ProviderAuthenticationHookError) {
              measureCtx.error('OIDC workspace role synchronization failed', { err: err.cause })
              return '/login?error=oidc_role_sync_failed'
            }
            throw err
          }
        },
        allowedGroups
      )

      if (redirectUrl !== '') {
        ctx.redirect(callbackRedirect(branding?.front ?? frontUrl, redirectUrl))
      } else {
        // L-AUTH-4: handleProviderAuth signals an unresolvable login with '' (e.g.
        // no account + signup disabled). Terminate fail-closed with an explicit
        // 302 to /login instead of leaving a hanging/empty response.
        ctx.redirect(loginUrl + '?error=oidc_no_account')
      }
    } catch (err: any) {
      // Permanent invalid-callback guard: ANY failure → 302 to /login, never 500.
      logOidcCallbackFailure(
        measureCtx,
        'error',
        buildOidcCallbackDiagnostic(ctx, err, undefined, undefined, ctx.state?.user)
      )
      ctx.redirect(loginUrl + '?error=oidc_callback_failed')
    }
  })

  return { name, displayName }
}
