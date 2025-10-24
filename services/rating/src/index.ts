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
import { configureAnalytics, createOpenTelemetryMetricsContext, SplitLogger } from '@hcengineering/analytics-service'
import { newMetrics, type Tx } from '@hcengineering/core'
import { initStatisticsContext } from '@hcengineering/server-core'
import { join } from 'path'

import { getPlatformQueue } from '@hcengineering/kafka'
import { setMetadata } from '@hcengineering/platform'
import serverToken from '@hcengineering/server-token'
import { readFileSync } from 'fs'
import { startIndexer as startRating } from './server'
export * from './calculator'
export * from './types'

export async function start (): Promise<void> {
  const model = JSON.parse(readFileSync(process.env.MODEL_JSON ?? 'model.json').toString()) as Tx[]

  const serverSecret = process.env.SERVER_SECRET
  if (serverSecret === undefined) {
    console.info('Please provide server secret')
    process.exit(1)
  }

  setMetadata(serverToken.metadata.Secret, serverSecret)
  setMetadata(serverToken.metadata.Service, 'rating')

  configureAnalytics('rating', process.env.VERSION ?? '0.7.0')
  const metricsContext = initStatisticsContext('rating', {
    factory: () =>
      createOpenTelemetryMetricsContext(
        'rating',
        {},
        {},
        newMetrics(),
        new SplitLogger('rating', {
          root: join(process.cwd(), 'logs'),
          enableConsole: (process.env.ENABLE_CONSOLE ?? 'true') === 'true'
        })
      )
  })

  Analytics.setTag('application', 'rating')

  const dbURL = process.env.DB_URL
  if (dbURL === undefined) {
    console.error('DB_URL should be specified')
    process.exit(1)
  }

  metricsContext.info('Starting stats service')

  const accountsUrl = process.env.ACCOUNTS_URL
  if (accountsUrl === undefined) {
    console.error('please provide account url')
    process.exit(1)
  }

  const queue = getPlatformQueue('rating')

  const onClose = startRating(metricsContext, {
    queue,
    model,
    dbURL,
    serverSecret,
    accountsUrl
  })

  process.on('uncaughtException', (e) => {
    metricsContext.error('uncaughtException', { error: e })
  })

  process.on('unhandledRejection', (reason, promise) => {
    metricsContext.error('Unhandled Rejection at:', { reason, promise })
  })

  const close = (): void => {
    void onClose.then((res) => {
      res()
    })
  }

  process.on('SIGINT', close)
  process.on('SIGTERM', close)
  process.on('exit', close)
}
