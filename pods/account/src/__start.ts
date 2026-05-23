//
// Copyright © 2023 Hardcore Engineering Inc.
//
import { serveAccount } from '@hcengineering/account-service'
import { Analytics } from '@hcengineering/analytics'
import { configureAnalytics, createOpenTelemetryMetricsContext, SplitLogger } from '@hcengineering/analytics-service'
import { newMetrics } from '@hcengineering/core'
import {
  initStatisticsContext,
  loadBrandingMap,
  type PlatformQueue,
  type PlatformQueueProducer,
  type QueueAccountLifecycleMessage
} from '@hcengineering/server-core'
import { getPlatformQueue } from '@hcengineering/kafka'
import { join } from 'path'

configureAnalytics('account', process.env.VERSION ?? '0.7.0')
Analytics.setTag('application', 'account')

const metricsContext = initStatisticsContext('account', {
  factory: () =>
    createOpenTelemetryMetricsContext(
      'account',
      {},
      {},
      newMetrics(),
      new SplitLogger('account', {
        root: join(process.cwd(), 'logs'),
        enableConsole: (process.env.ENABLE_CONSOLE ?? 'true') === 'true'
      })
    )
})

const brandingPath = process.env.BRANDING_PATH

const queueConfig = process.env.QUEUE_CONFIG
let queue: PlatformQueue | undefined
let accountLifecycleProducer: PlatformQueueProducer<QueueAccountLifecycleMessage> | undefined

if (queueConfig != null && queueConfig.trim() !== '') {
  try {
    const region = process.env.REGION
    queue = getPlatformQueue('account', region)
    accountLifecycleProducer = queue.getProducer<QueueAccountLifecycleMessage>(
      metricsContext.newChild('account-lifecycle-producer', {}),
      'account.lifecycle'
    )
  } catch (err) {
    metricsContext.warn('account.lifecycle queue producer unavailable; relying on token-version fallback', { err })
    queue = undefined
    accountLifecycleProducer = undefined
  }
}

serveAccount(metricsContext, loadBrandingMap(brandingPath), { accountLifecycleProducer }, () => {
  void accountLifecycleProducer?.close()
  if (queue !== undefined) {
    void queue.shutdown()
  }
})
