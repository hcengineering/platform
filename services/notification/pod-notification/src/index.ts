//
// Copyright © 2026 Hardcore Engineering Inc.
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
import { SplitLogger, configureAnalytics, createOpenTelemetryMetricsContext } from '@hcengineering/analytics-service'
import { newMetrics } from '@hcengineering/core'
import { initStatisticsContext } from '@hcengineering/server-core'
import { join } from 'path'
import { main } from './main'

configureAnalytics('notification', process.env.VERSION ?? '0.7.0')
const metricsContext = initStatisticsContext('notification', {
  factory: () =>
    createOpenTelemetryMetricsContext(
      'notification',
      {},
      {},
      newMetrics(),
      new SplitLogger('notification-service', {
        root: join(process.cwd(), 'logs'),
        enableConsole: (process.env.ENABLE_CONSOLE ?? 'true') === 'true'
      })
    )
})

Analytics.setTag('application', 'notification-service')

process.on('uncaughtException', (e) => {
  metricsContext.error('UncaughtException', { error: e })
})

process.on('unhandledRejection', (reason, promise) => {
  metricsContext.error('Unhandled Rejection at:', { promise, reason })
})

void main(metricsContext).catch((err) => {
  metricsContext.error('Failed to start', { error: err })
  process.exit(1)
})
