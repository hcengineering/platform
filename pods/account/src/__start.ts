//
// Copyright © 2023 Hardcore Engineering Inc.
//
import { Analytics } from '@hcengineering/analytics'
import { MeasureMetricsContext, metricsToString, newMetrics } from '@hcengineering/core'
import { loadBrandingMap } from '@hcengineering/server-core'
import { configureAnalytics, SplitLogger } from '@hcengineering/analytics-service'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { serveAccount } from '@hcengineering/account-service'

configureAnalytics(process.env.SENTRY_DSN, {})
Analytics.setTag('application', 'account')

const metricsContext = new MeasureMetricsContext(
  'account',
  {},
  {},
  newMetrics(),
  new SplitLogger('account', {
    root: join(process.cwd(), 'logs'),
    enableConsole: (process.env.ENABLE_CONSOLE ?? 'true') === 'true'
  })
)

let oldMetricsValue = ''

const intTimer = setInterval(() => {
  const val = metricsToString(metricsContext.metrics, 'Account', 140)
  if (val !== oldMetricsValue) {
    oldMetricsValue = val
    void writeFile('metrics.txt', val).catch((err) => {
      console.error(err)
    })
  }
}, 30000)

const brandingPath = process.env.BRANDING_PATH

serveAccount(metricsContext, loadBrandingMap(brandingPath), () => {
  clearInterval(intTimer)
})
