//
// Copyright © 2025 Hardcore Engineering Inc.
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
import { MeasureMetricsContext, newMetrics } from '@hcengineering/core'
import { setMetadata } from '@hcengineering/platform'
import { initStatisticsContext } from '@hcengineering/server-core'
import serverToken from '@hcengineering/server-token'
import { join } from 'path'

import config from './config'
import { createServer, listen } from './server'

const setupMetadata = (): void => {
  setMetadata(serverToken.metadata.Secret, config.Secret)
}

export const main = async (): Promise<void> => {
  setupMetadata()

  configureAnalytics(process.env.SENTRY_DSN, {})
  Analytics.setTag('application', 'backup-api')

  const metricsContext = initStatisticsContext('backup-api', {
    factory: () =>
      new MeasureMetricsContext(
        'backup-api',
        {},
        {},
        newMetrics(),
        new SplitLogger('backup-api', {
          root: join(process.cwd(), 'logs'),
          enableConsole: (process.env.ENABLE_CONSOLE ?? 'true') === 'true'
        })
      )
  })

  const { app, close } = await createServer(metricsContext, config)
  const server = listen(app, config.Port)

  const shutdown = (): void => {
    close()
    server.close(() => process.exit())
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
  process.on('uncaughtException', (e) => {
    console.error(e)
  })
  process.on('unhandledRejection', (e) => {
    console.error(e)
  })
}
