//
// Copyright © 2023 Hardcore Engineering Inc.
//
import { Analytics } from '@hcengineering/analytics'
import { MeasureMetricsContext, metricsToString, newMetrics, type Tx } from '@hcengineering/core'
import { loadBrandingMap } from '@hcengineering/server-core'
import { configureAnalytics, SplitLogger } from '@hcengineering/analytics-service'
import builder, { getModelVersion, migrateOperations } from '@hcengineering/model-all'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { serveWorkspaceAccount } from '@hcengineering/workspace-service'

const enabled = (process.env.MODEL_ENABLED ?? '*').split(',').map((it) => it.trim())
const disabled = (process.env.MODEL_DISABLED ?? '').split(',').map((it) => it.trim())

const txes = JSON.parse(JSON.stringify(builder(enabled, disabled).getTxes())) as Tx[]

configureAnalytics(process.env.SENTRY_DSN, {})
Analytics.setTag('application', 'workspace')

const metricsContext = new MeasureMetricsContext(
  'workspace',
  {},
  {},
  newMetrics(),
  new SplitLogger('workspace', {
    root: join(process.cwd(), 'logs'),
    enableConsole: (process.env.ENABLE_CONSOLE ?? 'true') === 'true'
  })
)

let oldMetricsValue = ''

const intTimer = setInterval(() => {
  const val = metricsToString(metricsContext.metrics, 'Workspace', 140)
  if (val !== oldMetricsValue) {
    oldMetricsValue = val
    void writeFile('metrics.txt', val).catch((err) => {
      console.error(err)
    })
  }
}, 30000)

const brandingPath = process.env.BRANDING_PATH

serveWorkspaceAccount(metricsContext, getModelVersion(), txes, migrateOperations, loadBrandingMap(brandingPath), () => {
  clearInterval(intTimer)
})
