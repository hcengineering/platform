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
import { configureAnalytics, createOpenTelemetryMetricsContext, SplitLogger } from '@hcengineering/analytics-service'
import { newMetrics } from '@hcengineering/core'
import { getPlatformQueue } from '@hcengineering/kafka'
import { setMetadata } from '@hcengineering/platform'
import { initStatisticsContext, QueueTopic } from '@hcengineering/server-core'
import { ProcessMessage } from '@hcengineering/server-process'
import serverToken from '@hcengineering/server-token'
import { join } from 'path'
import config from './config'
import { prepare } from './init'
import { messageHandler } from './main'
import { closeTemporal } from './temporal'
import { SERVICE_NAME } from './utils'

async function main (): Promise<void> {
  prepare()
  configureAnalytics(SERVICE_NAME, process.env.VERSION ?? '0.7.0')
  const ctx = initStatisticsContext(SERVICE_NAME, {
    factory: () =>
      createOpenTelemetryMetricsContext(
        SERVICE_NAME,
        {},
        {},
        newMetrics(),
        new SplitLogger(SERVICE_NAME, {
          root: join(process.cwd(), 'logs'),
          enableConsole: (process.env.ENABLE_CONSOLE ?? 'true') === 'true'
        })
      )
  })

  Analytics.setTag('application', SERVICE_NAME)
  setMetadata(serverToken.metadata.Secret, config.Secret)
  setMetadata(serverToken.metadata.Service, SERVICE_NAME)

  const queue = getPlatformQueue(SERVICE_NAME, config.QueueRegion)

  const consumer = queue.createConsumer<ProcessMessage>(
    ctx,
    QueueTopic.Process,
    queue.getClientId(),
    async (ct, message) => {
      const ws = message.workspace
      const record = message.value
      await messageHandler(record, ws, ctx)
    }
  )

  const shutdown = (): void => {
    void closeTemporal()
    void Promise.all([consumer.close()]).then(() => {
      process.exit()
    })
  }

  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
  process.on('uncaughtException', (error: any) => {
    ctx.error('Uncaught exception', { error })
  })
  process.on('unhandledRejection', (error: any) => {
    ctx.error('Unhandled rejection', { error })
  })
}

void main().catch((err) => {
  console.error(err)
})
