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
import { SplitLogger, configureAnalytics } from '@hcengineering/analytics-service'
import { MeasureMetricsContext, WorkspaceUuid, newMetrics } from '@hcengineering/core'
import { setMetadata, translate } from '@hcengineering/platform'
import serverClient from '@hcengineering/server-client'
import { initStatisticsContext, QueueTopic } from '@hcengineering/server-core'
import serverToken from '@hcengineering/server-token'
import { join } from 'path'
import { getPlatformQueue } from '@hcengineering/kafka'
import { TelegramQueueMessage, TelegramQueueMessageType } from '@hcengineering/server-telegram'
import telegram from '@hcengineering/telegram'

import config from './config'
import { registerLoaders } from './loaders'
import { createServer, listen } from './server'
import { setUpBot } from './telegraf/bot'
import { PlatformWorker } from './worker'
import { Telegraf } from 'telegraf'
import { TgContext } from './telegraf/types'
import { Limiter } from './limiter'
import { MongoDb } from './mongoDb'
import { Command } from './telegraf/commands'

const ctx = initStatisticsContext('telegram-bot', {
  factory: () =>
    new MeasureMetricsContext(
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

configureAnalytics(config.SentryDSN, config)
Analytics.setTag('application', 'telegram-bot-service')

export async function requestReconnect (bot: Telegraf<TgContext>, limiter: Limiter): Promise<void> {
  if (config.MongoDB === '' || config.MongoURL === '') {
    ctx.info('MongoDB is not configured, skipping reconnect')
    return
  }

  const mongoDb = await MongoDb.create()
  const toReconnect = await mongoDb.getAllUsers()

  if (toReconnect.length > 0) {
    ctx.info('Disconnecting users', { users: toReconnect.map((it) => [it.telegramUsername, it.email]) })
    const message = await translate(telegram.string.DisconnectMessage, { app: config.App, command: Command.Connect })
    for (const userRecord of toReconnect) {
      try {
        await limiter.add(userRecord.telegramId, async () => {
          await bot.telegram.sendMessage(userRecord.telegramId, message)
        })
      } catch (e) {
        ctx.error('Failed to send message', { email: userRecord.email, tg: userRecord.telegramUsername, error: e })
      }
    }
    await mongoDb.removeAllUsers()
    await mongoDb.close()
  }
}

export const start = async (): Promise<void> => {
  setMetadata(serverToken.metadata.Secret, config.Secret)
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

  ctx.info('Requesting reconnect...')
  await requestReconnect(bot, worker.limiter)
  ctx.info('Starting server...')
  const server = listen(app, ctx, config.Port)

  const consumer = queue.createConsumer<TelegramQueueMessage>(
    ctx,
    QueueTopic.TelegramBot,
    queue.getClientId(),
    async (messages) => {
      for (const message of messages) {
        const id = message.id as WorkspaceUuid
        const records = message.value
        for (const record of records) {
          switch (record.type) {
            case TelegramQueueMessageType.Notification:
              await worker.processNotification(id, record, bot)
              break
            case TelegramQueueMessageType.WorkspaceSubscription:
              await worker.processWorkspaceSubscription(id, record)
              break
          }
        }
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
