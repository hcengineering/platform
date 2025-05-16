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

import { join } from 'path'
import { Analytics } from '@hcengineering/analytics'
import { SplitLogger, configureAnalytics } from '@hcengineering/analytics-service'
import { MeasureMetricsContext, newMetrics, WorkspaceUuid } from '@hcengineering/core'
import { setMetadata } from '@hcengineering/platform'
import { initStatisticsContext, QueueTopic } from '@hcengineering/server-core'
import serverToken from '@hcengineering/server-token'
import { getPlatformQueue } from '@hcengineering/kafka'
import config from './config'
import { EventCUDMessage } from './types'
import { eventCreated, eventUpdated, eventDeleted, eventMixin } from './handlers'

async function main (): Promise<void> {
  const ctx = initStatisticsContext('calendar-mailer', {
    factory: () =>
      new MeasureMetricsContext(
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

  configureAnalytics(config.sentryDSN, config)
  Analytics.setTag('application', 'telegram-bot-service')
  setMetadata(serverToken.metadata.Secret, config.secret)

  const queue = getPlatformQueue('calendarMailerService', config.queueRegion)

  const consumer = queue.createConsumer<EventCUDMessage>(
    ctx,
    QueueTopic.CalendarEventCUD,
    queue.getClientId(),
    async (messages) => {
      for (const message of messages) {
        const ws = message.id as WorkspaceUuid
        const records = message.value
        for (const record of records) {
          ctx.info('Processing event', {
            ws,
            action: record.action,
            eventId: record.event.eventId,
            objectId: record.event._id,
            modiedBy: record.modifiedBy
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
