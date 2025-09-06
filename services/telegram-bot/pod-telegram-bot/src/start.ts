//
// Copyright © 2024 Hardcore Engineering Inc.
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
import { initStatisticsContext, QueueTopic } from '@hcengineering/server-core'
import { TelegramQueueMessage, TelegramQueueMessageType } from '@hcengineering/server-telegram'
import serverToken from '@hcengineering/server-token'
import { join } from 'path'

import config from './config'
import { registerLoaders } from './loaders'
import { createServer, listen } from './server'
import { setUpBot } from './telegraf/bot'
import { PlatformWorker } from './worker'

const ctx = initStatisticsContext('telegram-bot', {
  factory: () =>
    createOpenTelemetryMetricsContext(
      'telegram-bot-service',
      {},
      {},
      newMetrics(),
      new SplitLogger('telegram-bot-service', {
        root: join(process.cwd(), 'logs'),
        enableConsole: (process.env.ENABLE_CONSOLE ?? 'true') === 'true'
      })
    )
})

configureAnalytics('telegram-bot-service', process.env.VERSION ?? '0.7.0')
Analytics.setTag('application', 'telegram-bot-service')

export const start = async (): Promise<void> => {
  setMetadata(serverToken.metadata.Secret, config.Secret)
  setMetadata(serverToken.metadata.Service, 'telegram-bot-service')
  setMetadata(serverClient.metadata.Endpoint, config.AccountsUrl)
  setMetadata(serverClient.metadata.UserAgent, config.ServiceId)
  registerLoaders()

  ctx.info('Creating worker...')
  const worker = await PlatformWorker.create(ctx)
  ctx.info('Set up bot...')
  const bot = await setUpBot(worker)
  ctx.info('Creating server...')
  const app = createServer(bot, worker, ctx)
  ctx.info('Creating queue...')
  const queue = getPlatformQueue('telegramBotService', config.QueueRegion)
  ctx.info('queue', { clientId: queue.getClientId() })

  if (config.Domain === '') {
    ctx.info('Starting bot with polling')
    void bot.launch({ dropPendingUpdates: true })
  } else {
    ctx.info('Starting bot with webhook', { domain: config.Domain, port: config.BotPort })
    void bot.launch({ webhook: { domain: config.Domain, port: config.BotPort }, dropPendingUpdates: true }).then(() => {
      void bot.telegram.getWebhookInfo().then((info) => {
        ctx.info('Webhook info', info)
      })
    })
  }

  app.get(`/telegraf/${bot.secretPathComponent()}`, (req, res) => {
    res.status(200).send()
  })
  app.post(`/telegraf/${bot.secretPathComponent()}`, (req, res) => {
    void bot.handleUpdate(req.body, res)
    res.status(200).send()
  })

  ctx.info('Starting server...')
  const server = listen(app, ctx, config.Port)

  const consumer = queue.createConsumer<TelegramQueueMessage>(
    ctx,
    QueueTopic.TelegramBot,
    queue.getClientId(),
    async (ctx, message) => {
      const workspace = message.workspace
      const record = message.value
      switch (record.type) {
        case TelegramQueueMessageType.Notification:
          await worker.processNotification(workspace, record, bot)
          break
        case TelegramQueueMessageType.WorkspaceSubscription:
          await worker.processWorkspaceSubscription(workspace, record)
          break
      }
    }
  )

  const onClose = (): void => {
    void Promise.all([consumer.close(), worker.close(), server.close()]).then(() => {
      process.exit()
    })
  }

  process.once('SIGINT', () => {
    bot.stop('SIGINT')
    onClose()
  })
  process.once('SIGTERM', () => {
    bot.stop('SIGTERM')
    onClose()
  })
  process.on('uncaughtException', (e: Error) => {
    console.error(e)
  })
  process.on('unhandledRejection', (e: Error) => {
    console.error(e)
  })
}
