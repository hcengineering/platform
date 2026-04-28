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
import { configureAnalytics, createOpenTelemetryMetricsContext, SplitLogger } from '@hcengineering/analytics-service'
import { newMetrics } from '@hcengineering/core'
import { getPlatformQueue } from '@hcengineering/kafka'
import { setMetadata } from '@hcengineering/platform'
import serverClient from '@hcengineering/server-client'
import { initStatisticsContext, type ConsumerControl } from '@hcengineering/server-core'
import serverToken from '@hcengineering/server-token'
import { join } from 'path'
import config from './config'
import type { ScheduledNotificationMessage } from './types'
import { handleScheduledNotification } from './worker'

const scheduledNotificationTopic = 'scheduledNotification'
const isDebugLoggingEnabled = config.LogLevel === 'debug'

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
  setMetadata(serverClient.metadata.Endpoint, config.AccountsUrl)

  const queue = getPlatformQueue(config.ServiceId, config.QueueRegion)

  const consumer = queue.createConsumer<ScheduledNotificationMessage>(
    ctx,
    scheduledNotificationTopic,
    queue.getClientId(),
    async (ctx, message, control: ConsumerControl) => {
      if (isDebugLoggingEnabled) {
        ctx.info('Received scheduled notification event', {
          topic: scheduledNotificationTopic,
          workspace: message.workspace,
          kind: message.value?.kind,
          id: message.value?.id
        })
      }
      await handleScheduledNotification(ctx, message.workspace, message.value, control)
    }
  )

  const shutdown = (): void => {
    void Promise.all([consumer.close()]).then(() => process.exit())
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
  // eslint-disable-next-line no-console
  console.error(err)
})
