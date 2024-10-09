//
// Copyright © 2022 Hardcore Engineering Inc.
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

import { Analytics } from '@hcengineering/analytics'
import { configureAnalytics, SplitLogger } from '@hcengineering/analytics-service'
import { startBackup } from '@hcengineering/backup-service'
import { MeasureMetricsContext, metricsToString, newMetrics, type Tx } from '@hcengineering/core'
import { type PipelineFactory } from '@hcengineering/server-core'
import { createBackupPipeline, getConfig } from '@hcengineering/server-pipeline'
import { writeFile } from 'fs/promises'
import { join } from 'path'

import { readFileSync } from 'node:fs'
const model = JSON.parse(readFileSync(process.env.MODEL_JSON ?? 'model.json').toString()) as Tx[]

const metricsContext = new MeasureMetricsContext(
  'backup',
  {},
  {},
  newMetrics(),
  new SplitLogger('backup-service', {
    root: join(process.cwd(), 'logs'),
    enableConsole: (process.env.ENABLE_CONSOLE ?? 'true') === 'true'
  })
)

const sentryDSN = process.env.SENTRY_DSN

configureAnalytics(sentryDSN, {})
Analytics.setTag('application', 'backup-service')

let oldMetricsValue = ''

const intTimer = setInterval(() => {
  const val = metricsToString(metricsContext.metrics, 'Backup', 140)
  if (val !== oldMetricsValue) {
    oldMetricsValue = val
    void writeFile('metrics.txt', val).catch((err) => {
      console.error(err)
    })
  }
}, 30000)

const onClose = (): void => {
  clearInterval(intTimer)
  metricsContext.info('Closed')
}

startBackup(
  metricsContext,
  (mongoUrl, storageAdapter) => {
    const factory: PipelineFactory = createBackupPipeline(metricsContext, mongoUrl, model, {
      externalStorage: storageAdapter,
      usePassedCtx: true
    })
    return factory
  },
  (ctx, dbUrls, workspace, branding, externalStorage) => {
    return getConfig(ctx, dbUrls, workspace, branding, ctx, {
      externalStorage,
      fullTextUrl: '',
      indexParallel: 0,
      indexProcessing: 0,
      rekoniUrl: '',
      disableTriggers: true
    })
  }
)

process.on('SIGINT', onClose)
process.on('SIGTERM', onClose)
