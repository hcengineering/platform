//
// Copyright © 2023 Hardcore Engineering Inc.
//

import { Analytics } from '@hcengineering/analytics'
import { SplitLogger, configureAnalytics, createOpenTelemetryMetricsContext } from '@hcengineering/analytics-service'
import { newMetrics } from '@hcengineering/core'
import { setMetadata } from '@hcengineering/platform'
import { initStatisticsContext, loadBrandingMap } from '@hcengineering/server-core'
import serverToken from '@hcengineering/server-token'
import { join } from 'path'
import config from './config'
import { start } from './server'

// Load and inc startID, to have easy logs.

setMetadata(serverToken.metadata.Secret, config.ServerSecret)
setMetadata(serverToken.metadata.Service, 'github')

configureAnalytics('github', process.env.VERSION ?? '0.7.0')
const metricsContext = initStatisticsContext('github', {
  factory: () =>
    createOpenTelemetryMetricsContext(
      'github',
      {},
      {},
      newMetrics(),
      new SplitLogger('github-service', {
        root: join(process.cwd(), 'logs'),
        enableConsole: (process.env.ENABLE_CONSOLE ?? 'true') === 'true'
      })
    )
})

Analytics.setTag('application', 'github-service')

let doOnClose: () => Promise<void> = async () => {}

void start(metricsContext, loadBrandingMap(config.BrandingPath))
  .then((r) => {
    doOnClose = r
  })
  .catch((err) => {
    metricsContext.error('Error', { error: err })
  })

const onClose = (): void => {
  metricsContext.info('Closed')
  void doOnClose()
    .then((r) => {
      process.exit(0)
    })
    .catch((err) => {
      metricsContext.error('Error', { error: err })
    })
}

process.on('uncaughtException', (e) => {
  metricsContext.error('UncaughtException', { error: e })
})

process.on('unhandledRejection', (reason, promise) => {
  metricsContext.error('Unhandled Rejection at:', { promise, reason })
})

process.on('SIGINT', onClose)
process.on('SIGTERM', onClose)
process.on('exit', onClose)
