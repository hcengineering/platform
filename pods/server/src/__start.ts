//
// Copyright © 2023 Hardcore Engineering Inc
//

// Add this to the VERY top of the first file loaded in your app
import { Analytics } from '@hcengineering/analytics'
import { configureAnalytics, createOpenTelemetryMetricsContext, SplitLogger } from '@hcengineering/analytics-service'
import contactPlugin from '@hcengineering/contact'
import { newMetrics, setOperationLogProfiling } from '@hcengineering/core'
import { getPlatformQueue } from '@hcengineering/kafka'
import { setMetadata } from '@hcengineering/platform'
import { setDBExtraOptions } from '@hcengineering/postgres'
import { serverConfigFromEnv } from '@hcengineering/server'
import serverAiBot from '@hcengineering/server-ai-bot'
import serverCalendar from '@hcengineering/server-calendar'
import serverCore, {
  initStatisticsContext,
  loadBrandingMap,
  type StorageConfiguration,
  type WorkspaceStatistics
} from '@hcengineering/server-core'
import serverNotification from '@hcengineering/server-notification'
import { storageConfigFromEnv } from '@hcengineering/server-storage'
import serverToken from '@hcengineering/server-token'
import { join } from 'path'
import { start } from '.'
import { profileStart, profileStop } from './inspector'

configureAnalytics('server', process.env.VERSION ?? '0.7.0')
Analytics.setTag('application', 'transactor')

let getStats: () => WorkspaceStatistics[] = () => {
  return []
}

const queueConfig = process.env.QUEUE_CONFIG
if (queueConfig === undefined) {
  throw new Error('Please provide queue config')
}

const queue = getPlatformQueue('transactor')

void queue.createTopics(10).catch((err) => {
  console.error('Failed to create required topics', err)
})

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

setOperationLogProfiling(process.env.OPERATION_PROFILING === 'true')

const config = serverConfigFromEnv()
const storageConfig: StorageConfiguration = storageConfigFromEnv()

const usePrepare = (process.env.DB_PREPARE ?? 'true') === 'true'

setDBExtraOptions({
  prepare: usePrepare // We override defaults
})

const lastNameFirst = process.env.LAST_NAME_FIRST === 'true'
setMetadata(contactPlugin.metadata.LastNameFirst, lastNameFirst)
setMetadata(serverCore.metadata.FrontUrl, config.frontUrl)
setMetadata(serverCore.metadata.FilesUrl, config.filesUrl)
setMetadata(serverToken.metadata.Secret, config.serverSecret)
setMetadata(serverToken.metadata.Service, 'transactor')
setMetadata(serverNotification.metadata.MailUrl, config.mailUrl ?? '')
setMetadata(serverNotification.metadata.MailAuthToken, config.mailAuthToken)
setMetadata(serverNotification.metadata.WebPushUrl, config.webPushUrl)
setMetadata(serverAiBot.metadata.EndpointURL, process.env.AI_BOT_URL)
setMetadata(serverCalendar.metadata.EndpointURL, process.env.CALENDAR_URL)

const { shutdown, sessionManager } = start(metricsContext, config.dbUrl, {
  fulltextUrl: config.fulltextUrl,
  storageConfig,
  port: config.serverPort,
  brandingMap: loadBrandingMap(config.brandingPath),
  accountsUrl: config.accountsUrl,
  enableCompression: config.enableCompression,
  communicationApiEnabled: process.env.COMMUNICATION_API_ENABLED === 'true',
  profiling: {
    start: profileStart,
    stop: profileStop
  },
  mongoUrl: config.mongoUrl,
  queue
})

getStats = (): WorkspaceStatistics[] => {
  return sessionManager.getStatistics()
}

const close = (): void => {
  console.trace('Exiting from server')
  console.log('Shutdown request accepted')
  void queue.shutdown()
  void shutdown().then(() => {
    process.exit(0)
  })
}

process.on('unhandledRejection', (reason, promise) => {
  metricsContext.error('Unhandled Rejection at:', { reason, promise })
})

global.process.on('uncaughtException', (error, origin) => {
  metricsContext.error('Uncaught Exception at:', { origin, error })
})

process.on('SIGINT', close)
process.on('SIGTERM', close)
