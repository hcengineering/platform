//
// Copyright © 2026 TraceX SAS.
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
//
// Copyright © 2023 Hardcore Engineering Inc.
// Copyright © 2026 TraceX SAS.
//

import account, {
  type AccountMethods,
  type Meta,
  type ClientNetworkPosition,
  EndpointKind,
  accountId,
  getAccountDB,
  getAllTransactors,
  getMethods,
  cleanExpiredOtp
} from '@hcengineering/account'
import accountCs from '@hcengineering/account/lang/cs.json'
import accountDe from '@hcengineering/account/lang/de.json'
import accountEn from '@hcengineering/account/lang/en.json'
import accountEs from '@hcengineering/account/lang/es.json'
import accountFr from '@hcengineering/account/lang/fr.json'
import accountIt from '@hcengineering/account/lang/it.json'
import accountKo from '@hcengineering/account/lang/ko.json'
import accountPl from '@hcengineering/account/lang/pl.json'
import accountPt from '@hcengineering/account/lang/pt.json'
import accountPtBr from '@hcengineering/account/lang/pt-br.json'
import accountRu from '@hcengineering/account/lang/ru.json'
import accountTr from '@hcengineering/account/lang/tr.json'
import accountZh from '@hcengineering/account/lang/zh.json'
import { Analytics } from '@hcengineering/analytics'
import { registerProviders } from '@hcengineering/auth-providers'
import { metricsAggregate, type Branding, type BrandingMap, type MeasureContext } from '@hcengineering/core'
import { getPlatformQueue } from '@hcengineering/kafka'
import { startAuditPublisher, type ConsumerHandle, type PlatformQueue } from '@hcengineering/server-core'
import platform, {
  Severity,
  Status,
  addStringsLoader,
  getMetadata,
  setMetadata,
  unknownStatus
} from '@hcengineering/platform'
import serverToken, { decodeToken, decodeTokenVerbose, generateToken } from '@hcengineering/server-token'
import cors from '@koa/cors'
import type Cookies from 'cookies'
import { type IncomingHttpHeaders } from 'http'
import Koa from 'koa'
import bodyParser from 'koa-bodyparser'
import Router from 'koa-router'
import os from 'os'
import { startAuditConsumer } from './audit'
import { startWorkspaceMemberUnreadConsumer } from './unread'

const AUTH_TOKEN_COOKIE = 'account-metadata-Token'
const DEFAULT_ACCOUNT_METRICS_INTERVAL_MS = 5 * 60 * 1000

const KEEP_ALIVE_HEADERS = {
  'Content-Type': 'application/json',
  Connection: 'keep-alive',
  'Keep-Alive': 'timeout=5, max=1000'
}

/**
 * @public
 */
export function serveAccount (measureCtx: MeasureContext, brandings: BrandingMap, onClose?: () => void): void {
  console.log('Starting account service with brandings: ', brandings)
  const ACCOUNT_PORT = parseInt(process.env.ACCOUNT_PORT ?? '3000')
  const dbUrl = process.env.DB_URL
  if (dbUrl === undefined) {
    console.log('Please provide DB_URL')
    process.exit(1)
  }

  const transactorUri = process.env.TRANSACTOR_URL
  if (transactorUri === undefined) {
    console.log('Please provide transactor url')
    process.exit(1)
  }

  const serverSecret = process.env.SERVER_SECRET
  if (serverSecret === undefined) {
    console.log('Please provide server secret')
    process.exit(1)
  }

  const accountStrings: Record<string, typeof accountEn> = {
    cs: accountCs,
    de: accountDe,
    en: accountEn,
    es: accountEs,
    fr: accountFr,
    it: accountIt,
    ko: accountKo,
    pl: accountPl,
    pt: accountPt,
    'pt-br': accountPtBr,
    ru: accountRu,
    tr: accountTr,
    zh: accountZh
  }
  addStringsLoader(accountId, async (lang: string) => accountStrings[lang.toLowerCase()] ?? accountEn)

  const mailUrl = process.env.MAIL_URL
  const mailAuthToken = process.env.MAIL_AUTH_TOKEN

  const frontURL = process.env.FRONT_URL
  const productName = process.env.PRODUCT_NAME
  const lang = process.env.LANGUAGE ?? 'en'

  const wsLivenessDaysRaw = process.env.WS_LIVENESS_DAYS
  let wsLivenessDays: number | undefined

  if (wsLivenessDaysRaw !== undefined) {
    try {
      wsLivenessDays = parseInt(wsLivenessDaysRaw)
    } catch (err: any) {
      // DO NOTHING
    }
  }

  setMetadata(account.metadata.Transactors, transactorUri)
  setMetadata(platform.metadata.locale, lang)
  setMetadata(account.metadata.ProductName, productName)
  setMetadata(account.metadata.OtpTimeToLiveSec, parseInt(process.env.OTP_TIME_TO_LIVE ?? '60'))
  setMetadata(account.metadata.OtpRetryDelaySec, parseInt(process.env.OTP_RETRY_DELAY ?? '60'))
  setMetadata(account.metadata.MAIL_URL, mailUrl)
  setMetadata(account.metadata.MAIL_AUTH_TOKEN, mailAuthToken)

  setMetadata(account.metadata.FrontURL, frontURL)
  setMetadata(account.metadata.WsLivenessDays, wsLivenessDays)

  setMetadata(account.metadata.DefaultBrandingKey, process.env.DEFAULT_BRANDING_KEY ?? 'huly')

  setMetadata(serverToken.metadata.Secret, serverSecret)
  // Force undefied, for user tokens do not include service
  setMetadata(serverToken.metadata.Service, undefined)

  const hasSignUp = process.env.DISABLE_SIGNUP !== 'true'
  const methods = getMethods(hasSignUp)

  const dbNs = process.env.DB_NS
  const accountsDb = getAccountDB(dbUrl, dbNs)

  let accountMetricsTimer: NodeJS.Timeout | undefined
  let isClosing = false
  const parsedAccountMetricsInterval = Number(process.env.ACCOUNT_METRICS_INTERVAL_MS)
  const accountMetricsInterval =
    Number.isSafeInteger(parsedAccountMetricsInterval) && parsedAccountMetricsInterval > 0
      ? parsedAccountMetricsInterval
      : DEFAULT_ACCOUNT_METRICS_INTERVAL_MS

  const startAccountMetrics = async (): Promise<void> => {
    const [db] = await accountsDb
    const collectAccountMetrics = async (): Promise<void> => {
      try {
        const [accounts, workspaces] = await Promise.all([db.account.count({}), db.workspace.count({})])
        measureCtx.gauge('accounts', accounts)
        measureCtx.gauge('workspaces', workspaces)
        measureCtx.info('account metrics', { accounts, workspaces })
      } catch (error) {
        measureCtx.error('Failed to collect account metrics', { error })
      }

      if (!isClosing) {
        accountMetricsTimer = setTimeout(() => {
          void collectAccountMetrics()
        }, accountMetricsInterval)
      }
    }

    if (!isClosing) {
      await collectAccountMetrics()
    }
  }

  void startAccountMetrics().catch((error) => {
    measureCtx.error('Failed to start account metrics collection', { error })
  })

  const app = new Koa()
  const router = new Router()

  app.use(
    cors({
      credentials: true
    })
  )
  app.use(bodyParser())

  registerProviders(
    measureCtx,
    app,
    router,
    new Promise((resolve) => {
      void accountsDb.then((res) => {
        const [db] = res
        resolve(db)
      })
    }),
    serverSecret,
    frontURL,
    brandings,
    !hasSignUp
  )

  void accountsDb.then((res) => {
    const [db] = res
    setInterval(
      () => {
        void cleanExpiredOtp(db)
      },
      3 * 60 * 1000
    )
  })

  // Cross-workspace unread indicator: consume the queue the notification trigger
  // publishes to and raise workspace_members.has_unread in bulk. Only when a
  // queue is configured — deployments without one simply don't light the dot.
  let unreadQueue: PlatformQueue | undefined
  let unreadConsumer: ConsumerHandle | undefined
  let closeAuditPublisher: (() => Promise<void>) | undefined
  if (process.env.QUEUE_CONFIG !== undefined) {
    unreadQueue = getPlatformQueue('account')
    closeAuditPublisher = startAuditPublisher(measureCtx, unreadQueue, 'account')
    void accountsDb
      .then((res) => {
        const [db] = res
        startAuditConsumer(measureCtx, unreadQueue as PlatformQueue, db.audit)
        unreadConsumer = startWorkspaceMemberUnreadConsumer(measureCtx, unreadQueue as PlatformQueue, db)
      })
      .catch((error) => {
        measureCtx.error('Failed to initialize account queue consumers', { error })
      })
  } else {
    measureCtx.error('QUEUE_CONFIG is not set; audit delivery is unavailable')
    measureCtx.warn('QUEUE_CONFIG is not set, cross-workspace unread indicator will not be updated')
  }

  const extractCookieToken = (headers: IncomingHttpHeaders): string | undefined => {
    if (headers.cookie != null) {
      const cookies = headers.cookie.split(';')
      const tokenCookie = cookies.find((cookie) => cookie.includes(AUTH_TOKEN_COOKIE))
      return tokenCookie?.split('=')[1]
    }

    return undefined
  }

  const extractAuthorizationToken = (headers: IncomingHttpHeaders): string | undefined => {
    try {
      return headers.authorization?.slice(7) ?? undefined
    } catch {
      return undefined
    }
  }

  const extractToken = (headers: IncomingHttpHeaders): string | undefined => {
    return extractAuthorizationToken(headers) ?? extractCookieToken(headers)
  }

  const getRequestMeta = (headers: IncomingHttpHeaders, isServiceRequest: boolean): Meta => {
    const meta: Meta = {}

    if (!isServiceRequest && headers?.['x-timezone'] !== undefined) {
      meta.timezone = headers['x-timezone'] as string
    }

    if (headers?.['x-client-network-position'] !== undefined) {
      const val = headers['x-client-network-position'] as string
      if (['internal', 'external'].includes(val)) {
        meta.clientNetworkPosition = val as ClientNetworkPosition
      }
    }

    return meta
  }

  function getBranding (ctx: Koa.Context): Branding | null {
    const origin = ctx.request.headers.origin ?? ctx.request.headers.referer ?? getMetadata(account.metadata.FrontURL)
    const host = origin !== undefined ? new URL(origin).host : undefined
    return host !== undefined ? brandings[host] : null
  }

  function getCookieOptions (ctx: Koa.Context): Cookies.SetOption[] {
    const option = {
      httpOnly: true,
      secure: ctx.request.secure,
      maxAge: 1000 * 60 * 60 * 24 * 365 // 1 year
    }

    const options = []

    const branding = getBranding(ctx)

    const origin = ctx.request.headers.origin ?? ctx.request.headers.referer
    const target = ctx.request.href

    const originDomain = origin !== undefined ? getCookieDomain(origin) : undefined
    const targetDomain = getCookieDomain(target)

    options.push({ ...option, domain: targetDomain })
    if (originDomain !== undefined && originDomain !== targetDomain && branding !== undefined) {
      options.push({ ...option, domain: originDomain })
    }

    return options
  }

  const getCookieDomain = (url: string): string => {
    const hostname = new URL(url).hostname

    if (hostname === 'localhost') {
      return hostname
    }

    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
      return hostname
    }

    const parts = hostname.split('.')
    if (parts.length > 2) {
      return '.' + parts.slice(1).join('.')
    }

    return hostname
  }

  router.get('/api/v1/statistics', (req, res) => {
    try {
      const token = (req.query.token as string) ?? extractToken(req.headers)
      const payload = decodeToken(token)
      const admin = payload.extra?.admin === 'true'
      const data: Record<string, any> = {
        metrics: admin ? metricsAggregate((measureCtx as any).metrics) : {},
        statistics: {}
      }
      data.statistics.totalClients = 0
      const mem = process.memoryUsage()
      data.statistics.memoryUsed = Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100
      data.statistics.memoryTotal = Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100
      data.statistics.memoryRSS = Math.round((mem.rss / 1024 / 1024) * 100) / 100
      data.statistics.memoryArrayBuffers = Math.round((mem.arrayBuffers / 1024 / 1024) * 100) / 100
      data.statistics.cpuUsage = Math.round(os.loadavg()[0] * 100) / 100
      data.statistics.freeMem = Math.round((os.freemem() / 1024 / 1024) * 100) / 100
      data.statistics.totalMem = Math.round((os.totalmem() / 1024 / 1024) * 100) / 100
      const json = JSON.stringify(data)
      req.res.writeHead(200, KEEP_ALIVE_HEADERS)
      req.res.end(json)
    } catch (err: any) {
      Analytics.handleError(err)
      console.error(err)
      req.res.writeHead(404, {})
      req.res.end()
    }
  })

  router.put('/cookie', async (ctx) => {
    const token = extractToken(ctx.request.headers)
    if (token === undefined) {
      ctx.res.writeHead(401, KEEP_ALIVE_HEADERS)
      ctx.res.end(JSON.stringify({ error: new Status(Severity.ERROR, platform.status.Unauthorized, {}) }))
      return
    }

    // Ensure we don't set the token with workspace to the cookie
    const { account, extra } = decodeTokenVerbose(measureCtx, token)
    const tokenWithoutWorkspace = generateToken(account, undefined, extra)

    const cookieOpts = getCookieOptions(ctx)
    for (const opt of cookieOpts) {
      ctx.cookies.set(AUTH_TOKEN_COOKIE, tokenWithoutWorkspace, opt)
    }

    ctx.res.writeHead(204)
    ctx.res.end()
  })

  router.delete('/cookie', async (ctx) => {
    const cookieOpts = getCookieOptions(ctx)
    for (const opt of cookieOpts) {
      ctx.cookies.set(AUTH_TOKEN_COOKIE, '', { ...opt, maxAge: 0 })
    }

    ctx.res.writeHead(204)
    ctx.res.end()
  })

  router.put('/api/v1/manage', async (req, res) => {
    try {
      const token = (req.query.token as string) ?? extractToken(req.headers)
      const payload = decodeToken(token)
      if (payload.extra?.admin !== 'true') {
        req.res.writeHead(404, {})
        req.res.end()
        return
      }

      const operation = req.query.operation

      switch (operation) {
        case 'maintenance': {
          const timeMinutes = parseInt((req.query.timeout as string) ?? '5')
          const transactors = getAllTransactors(EndpointKind.Internal)
          for (const tr of transactors) {
            const serverEndpoint = tr.replaceAll('wss://', 'https://').replace('ws://', 'http://')
            const jsonBody = JSON.stringify(req.request.body as any)
            await fetch(serverEndpoint + `/api/v1/manage?token=${token}&operation=maintenance&timeout=${timeMinutes}`, {
              method: 'PUT',
              body: jsonBody,
              headers: {
                'Content-Type': 'application/json;charset=utf-8'
              }
            })
          }

          req.res.writeHead(200)
          req.res.end()
          return
        }
      }

      req.res.writeHead(404, {})
      req.res.end()
    } catch (err: any) {
      Analytics.handleError(err)
      req.res.writeHead(404, {})
      req.res.end()
    }
  })

  router.post('rpc', '/', async (ctx) => {
    const token = extractToken(ctx.request.headers)

    const request = ctx.request.body as any
    const method = methods[request.method as AccountMethods]
    if (method === undefined) {
      const response = {
        id: request.id,
        error: new Status(Severity.ERROR, platform.status.UnknownMethod, { method: request.method })
      }

      const body = JSON.stringify(response)
      ctx.res.writeHead(404, KEEP_ALIVE_HEADERS)
      ctx.res.end(body)
      return
    }

    const [db] = await accountsDb

    const branding = getBranding(ctx)

    let source = ''
    let isServiceRequest = false
    try {
      const decodedToken = token != null ? decodeToken(token) : null
      const serviceName = decodedToken?.extra?.service
      source = serviceName ?? '🤦‍♂️user'
      isServiceRequest = serviceName !== undefined
    } catch (err) {
      // Ignore
    }
    const meta = getRequestMeta(ctx.request.headers, isServiceRequest)

    await measureCtx.with(
      request.method,
      { source },
      async (_ctx) => {
        if (method === undefined || typeof method !== 'function') {
          const response = {
            id: request.id,
            error: new Status(Severity.ERROR, platform.status.UnknownMethod, { method: request.method })
          }

          ctx.res.writeHead(400, KEEP_ALIVE_HEADERS)
          ctx.res.end(JSON.stringify(response))
          return
        }

        try {
          const result = await method(_ctx, db, branding, request, token, meta)

          const body = JSON.stringify(result)
          ctx.res.writeHead(200, KEEP_ALIVE_HEADERS)
          ctx.res.end(body)
        } catch (err: any) {
          const response = {
            id: request.id,
            error: unknownStatus(err.message)
          }
          ctx.res.writeHead(400, KEEP_ALIVE_HEADERS)
          ctx.res.end(JSON.stringify(response))
        }
      },
      { method: request.method }
    )
  })

  app.use(router.routes()).use(router.allowedMethods())

  const server = app.listen(ACCOUNT_PORT, () => {
    console.log(`server started on port ${ACCOUNT_PORT}`)
  })

  const close = (): void => {
    if (isClosing) return
    isClosing = true
    clearTimeout(accountMetricsTimer)
    accountMetricsTimer = undefined
    server.close(() => {
      void (async () => {
        try {
          await closeAuditPublisher?.()
          await unreadConsumer?.close()
          await unreadQueue?.shutdown()
          const [, closeAccountsDb] = await accountsDb
          closeAccountsDb()
        } finally {
          onClose?.()
        }
      })().catch((error) => {
        measureCtx.error('Account shutdown failed', { error })
      })
    })
  }

  process.on('uncaughtException', (e) => {
    measureCtx.error('uncaughtException', { error: e })
  })

  process.on('unhandledRejection', (reason, promise) => {
    measureCtx.error('Unhandled Rejection at:', { reason, promise })
  })
  process.on('SIGINT', close)
  process.on('SIGTERM', close)
  process.on('exit', close)
}
