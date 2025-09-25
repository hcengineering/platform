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

import { configureAnalytics, createOpenTelemetryMetricsContext, SplitLogger } from '@hcengineering/analytics-service'
import { initStatisticsContext, QueueTopic } from '@hcengineering/server-core'
import { newMetrics } from '@hcengineering/measurements'
import { join } from 'path'
import { getPlatformQueue } from '@hcengineering/kafka'
import { Analytics } from '@hcengineering/analytics'
import { setMetadata } from '@hcengineering/platform'
import serverToken from '@hcengineering/server-token'
import { Tx } from '@hcengineering/core'

import config from './config'

async function main (): Promise<void> {
  configureAnalytics(config.ServiceId, process.env.VERSION ?? '0.7.0')
  const ctx = initStatisticsContext(config.ServiceId, {
    factory: () =>
      createOpenTelemetryMetricsContext(
        config.ServiceId,
        {},
        {},
        newMetrics(),
        new SplitLogger(config.ServiceId, {
          root: join(process.cwd(), 'logs'),
          enableConsole: (process.env.ENABLE_CONSOLE ?? 'true') === 'true'
        })
      )
  })

  Analytics.setTag('application', config.ServiceId)
  setMetadata(serverToken.metadata.Secret, config.Secret)
  setMetadata(serverToken.metadata.Service, config.ServiceId)

  const queue = getPlatformQueue(config.ServiceId, config.QueueRegion)

  const consumer = queue.createConsumer<Tx>(ctx, QueueTopic.Tx, queue.getClientId(), async (ct, message) => {
    const ws = message.workspace
    const record = message.value

    console.log(ws, record)
  })

  const shutdown = (): void => {
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
