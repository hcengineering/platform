//
// Copyright © 2024 Hardcore Engineering Inc.
//

import { Analytics } from '@hcengineering/analytics'
import { metricsAggregate, type MeasureContext } from '@hcengineering/core'
import { setMetadata } from '@hcengineering/platform'
import {
  getCPUInfo,
  getMemoryInfo,
  type CPUStatistics,
  type MemoryStatistics,
  type ServiceStatistics,
  type WorkspaceStatistics
} from '@hcengineering/server-core'
import serverToken, { decodeToken } from '@hcengineering/server-token'
import cors from '@koa/cors'
import Koa from 'koa'
import bodyParser from 'koa-bodyparser'
import Router from 'koa-router'

const serviceTimeout = 30000

interface ServiceStatisticsEx extends ServiceStatistics {
  lastUpdate: number // Last updated
}

interface OverviewStatistics {
  memory: MemoryStatistics
  cpu: CPUStatistics
  data: Record<string, Omit<ServiceStatistics, 'stats' | 'workspaces'>>
  usersTotal: number
  connectionsTotal: number

  admin: boolean
  workspaces: WorkspaceStatistics[]
}

/**
 * @public
 */
export function serveStats (ctx: MeasureContext, onClose?: () => void): void {
  const servicePort = parseInt(process.env.PORT ?? '4900')
  ctx.info('Starting stats service')

  const serverSecret = process.env.SERVER_SECRET
  if (serverSecret === undefined) {
    ctx.info('Please provide server secret')
    process.exit(1)
  }

  setMetadata(serverToken.metadata.Secret, serverSecret)

  const statistics = new Map<string, ServiceStatisticsEx>()
  const timeouts = new Map<string, number>()

  const app = new Koa()
  const router = new Router()

  app.use(
    cors({
      credentials: true
    })
  )
  app.use(
    bodyParser({
      jsonLimit: '150mb'
    })
  )

  router.get('/api/v1/overview', (req, res) => {
    try {
      const token = req.query.token as string
      const payload = decodeToken(token)
      const admin = payload.extra?.admin === 'true'
      if (!admin) {
        req.res.setHeader('Content-Type', 'application/json')
        const dta: OverviewStatistics = {
          memory: getMemoryInfo(),
          cpu: getCPUInfo(),
          data: {},
          usersTotal: 0,
          connectionsTotal: 0,
          admin: false,
          workspaces: []
        }
        req.body = dta
        return
      }

      const toClean: string[] = []

      let usersTotal: number = 0
      let connectionsTotal: number = 0

      const allWorkspaces: WorkspaceStatistics[] = []

      const json: Record<string, Omit<ServiceStatistics, 'stats' | 'workspaces'>> = {}
      for (const [k, v] of statistics.entries()) {
        if (Date.now() - v.lastUpdate > serviceTimeout) {
          timeouts.set(v.serviceName, (timeouts.get(v.serviceName) ?? 0) + 1)
          toClean.push(k)
          continue
        }
        const { stats: _, workspaces, ...data } = v

        allWorkspaces.push(...(workspaces ?? []))
        if (workspaces !== undefined) {
          for (const ws of workspaces) {
            ws.service = k
            usersTotal += ws.clientsTotal
            connectionsTotal += ws.sessionsTotal
          }
        }
        json[k] = {
          ...data
        }
      }
      for (const k of toClean) {
        statistics.delete(k)
      }

      const dta: OverviewStatistics = {
        memory: getMemoryInfo(),
        cpu: getCPUInfo(),
        data: json,
        usersTotal,
        connectionsTotal,
        admin: true,
        workspaces: allWorkspaces
      }
      req.body = dta
    } catch (err: any) {
      Analytics.handleError(err)
      console.error(err)
      req.res.writeHead(404, {})
      req.res.end()
    }
  })

  router.get('/api/v1/statistics', (req, res) => {
    try {
      const token = req.query.token as string
      const payload = decodeToken(token)
      const admin = payload.extra?.admin === 'true'
      ctx.info('get stats', { admin, service: req.query.name })
      if (admin) {
        const json = statistics.get((req.query.name as string) ?? '')
        if (json !== undefined) {
          req.res.setHeader('Content-Type', 'application/json')
          const result: ServiceStatistics = {
            ...json,
            stats: json.stats !== undefined ? metricsAggregate(json.stats) : undefined
          }
          req.body = result
          return
        }
      }
      const json = {}
      req.res.setHeader('Content-Type', 'application/json')
      req.body = json
    } catch (err: any) {
      Analytics.handleError(err)
      console.error(err)
      req.res.writeHead(404, {})
      req.res.end()
    }
  })
  router.put('/api/v1/statistics', (req, res) => {
    try {
      const token = req.query.token as string
      const payload = decodeToken(token)
      const service = payload.extra?.service === 'true'
      const serviceName = (req.query.name as string) ?? ''
      if (service) {
        ctx.info('put stats', { service: req.query.name })
        statistics.set(serviceName, {
          ...(req.request.body as ServiceStatistics),
          lastUpdate: Date.now()
        })
      }
      req.res.writeHead(200)
      req.res.end()
    } catch (err: any) {
      Analytics.handleError(err)
      console.error(err)
      req.res.writeHead(404, {})
      req.res.end()
    }
  })

  router.put('/api/v1/manage', async (req, res) => {
    try {
      const token = req.query.token as string
      const payload = decodeToken(token)
      if (payload.extra?.admin !== 'true') {
        req.res.writeHead(404, {})
        req.res.end()
        return
      }

      const operation = req.query.operation

      switch (operation) {
        case 'wipe-statistics': {
          statistics.clear()
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

  app.use(router.routes()).use(router.allowedMethods())

  const server = app.listen(servicePort, () => {
    console.log(`server started on port ${servicePort}`)
  })

  const close = (): void => {
    onClose?.()
    server.close()
  }

  process.on('uncaughtException', (e) => {
    ctx.error('uncaughtException', { error: e })
  })

  process.on('unhandledRejection', (reason, promise) => {
    ctx.error('Unhandled Rejection at:', { reason, promise })
  })
  process.on('SIGINT', close)
  process.on('SIGTERM', close)
  process.on('exit', close)
}
