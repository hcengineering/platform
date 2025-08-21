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
import serverToken from '@hcengineering/server-token'
import { join } from 'path'
import config from './config'
import { eventCreated, eventDeleted, eventMixin, eventUpdated } from './handlers'
import { EventCUDMessage } from './types'

async function main (): Promise<void> {
  configureAnalytics('calendar-mailer', process.env.VERSION ?? '0.7.0')
  const ctx = initStatisticsContext('calendar-mailer', {
    factory: () =>
      createOpenTelemetryMetricsContext(
        'calendar-mailer',
        {},
        {},
        newMetrics(),
        new SplitLogger('calendar-mailer', {
          root: join(process.cwd(), 'logs'),
          enableConsole: (process.env.ENABLE_CONSOLE ?? 'true') === 'true'
        })
      )
  })

  Analytics.setTag('application', 'calendar-mailer')
  setMetadata(serverToken.metadata.Secret, config.secret)
  setMetadata(serverToken.metadata.Service, 'calendar-mailer')

  const queue = getPlatformQueue('calendarMailerService', config.queueRegion)

  const consumer = queue.createConsumer<EventCUDMessage>(
    ctx,
    QueueTopic.CalendarEventCUD,
    queue.getClientId(),
    async (ctx, message) => {
      const ws = message.workspace
      const record = message.value

      ctx.info('Processing event', {
        ws,
        action: record.action,
        eventId: record.event.eventId,
        objectId: record.event._id,
        modifiedBy: record.modifiedBy
      })
      try {
        let skipReason
        switch (record.action) {
          case 'create':
            skipReason = await eventCreated(ctx, ws, record)
            break
          case 'update':
            skipReason = await eventUpdated(ctx, ws, record)
            break
          case 'delete':
            skipReason = await eventDeleted(ctx, ws, record)
            break
          case 'mixin':
            skipReason = await eventMixin(ctx, ws, record)
            break
        }
        if (skipReason !== undefined) {
          ctx.info('Notification skipped', { reason: skipReason, objectId: record.event._id })
        }
      } catch (error) {
        ctx.error('Error processing event', { error, ws, record })
      }
    }
  )

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
