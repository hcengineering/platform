//
// Copyright © 2023 Hardcore Engineering Inc
//

// Add this to the VERY top of the first file loaded in your app
import { Analytics } from '@hcengineering/analytics'
import { configureAnalytics, createOpenTelemetryMetricsContext, SplitLogger } from '@hcengineering/analytics-service'
import { newMetrics } from '@hcengineering/core'
import { initStatisticsContext, TransactorMode, type WorkspaceStatistics } from '@hcengineering/server-core'
import { hostname } from 'os'
import { join } from 'path'
import { startEndpointServer } from './endpoint'
import { startStandaloneServer } from './standalone'
import { startTransactorServer } from './transactor'

configureAnalytics('server', process.env.VERSION ?? '0.7.0')
Analytics.setTag('application', 'transactor')

let getStats: () => WorkspaceStatistics[] = () => {
  return []
}

// Force create server metrics context with proper logging
const metricsContext = initStatisticsContext('transactor', {
  getStats: (): WorkspaceStatistics[] => {
    return getStats()
  },
  factory: () =>
    createOpenTelemetryMetricsContext(
      'server',
      {},
      {},
      newMetrics(),
      new SplitLogger('server', {
        root: join(process.cwd(), 'logs'),
        enableConsole: (process.env.ENABLE_CONSOLE ?? 'true') === 'true'
      }),
      process.env.VERSION
    )
})

let sessionMode: TransactorMode = TransactorMode.standalone
const networkHost: string | undefined = process.env.NETWORK_HOST

if (networkHost !== undefined && process.env.MODE !== undefined) {
  sessionMode = TransactorMode[process.env.MODE as keyof typeof TransactorMode]
}

metricsContext.info('Network host: ' + networkHost)
metricsContext.info('Session manager mode: ' + TransactorMode[sessionMode])

switch (sessionMode) {
  case TransactorMode.standalone:
    getStats = startStandaloneServer(metricsContext)
    break
  case TransactorMode.endpoint:
    if (networkHost === undefined) {
      throw new Error('Please provide NETWORK_HOST for endpoint session manager mode')
    }
    metricsContext.info('Starting endpoint session manager')
    getStats = startEndpointServer(metricsContext, networkHost)
    break
  case TransactorMode.transactor:
    if (networkHost === undefined) {
      throw new Error('Please provide NETWORK_HOST for transactor session manager mode')
    }
    metricsContext.info('Starting transactor session manager')
    getStats = startTransactorServer(
      metricsContext,
      networkHost,
      process.env.AGENT_HOST ?? hostname() + ':' + (process.env.AGENT_PORT ?? '3738'),
      process.env.REGION ?? ''
    )
    break
  default:
    throw new Error(`Unsupported session manager mode: ${TransactorMode[sessionMode]}`)
}
