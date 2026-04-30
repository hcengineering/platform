//
// Copyright © 2023 Hardcore Engineering Inc.
//
import { serveAccount } from '@hcengineering/account-service'
import { Analytics } from '@hcengineering/analytics'
import { configureAnalytics, createOpenTelemetryMetricsContext, SplitLogger } from '@hcengineering/analytics-service'
import { newMetrics, type Tx } from '@hcengineering/core'
import builder from '@hcengineering/model-all'
import { initStatisticsContext, loadBrandingMap } from '@hcengineering/server-core'
import { join } from 'path'

// Build the platform model once at startup.
const txes = JSON.parse(JSON.stringify(builder().getTxes())) as Tx[]

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

serveAccount(metricsContext, loadBrandingMap(brandingPath), txes, () => {})
