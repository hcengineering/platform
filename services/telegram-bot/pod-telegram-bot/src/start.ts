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
import { MeasureMetricsContext, newMetrics } from '@hcengineering/core'
import { setMetadata, translate } from '@hcengineering/platform'
import serverClient from '@hcengineering/server-client'
import { initStatisticsContext, type StorageConfiguration } from '@hcengineering/server-core'
import { buildStorageFromConfig, storageConfigFromEnv } from '@hcengineering/server-storage'
import serverToken from '@hcengineering/server-token'
import telegram from '@hcengineering/telegram'
import { join } from 'path'
import { Telegraf } from 'telegraf'

import config from './config'
import { Limiter } from './limiter'
import { registerLoaders } from './loaders'
import { createServer, listen } from './server'
import { setUpBot } from './telegraf/bot'
import { Command } from './telegraf/commands'
import { TgContext } from './telegraf/types'
import { PlatformWorker } from './worker'

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

export async function requestReconnect (
  bot: Telegraf<TgContext>,
  worker: PlatformWorker,
  limiter: Limiter
): Promise<void> {
  const toReconnect = await worker.getUsersToDisconnect()

  if (toReconnect.length > 0) {
    ctx.info('Disconnecting users', { users: toReconnect.map((it) => it.email) })
    const message = await translate(telegram.string.DisconnectMessage, { app: config.App, command: Command.Connect })
    for (const userRecord of toReconnect) {
      try {
        await limiter.add(userRecord.telegramId, async () => {
          await bot.telegram.sendMessage(userRecord.telegramId, message)
        })
      } catch (e) {
        ctx.error('Failed to send message', { user: userRecord.email, error: e })
      }
    }
    await worker.disconnectUsers()
  }
}

export const start = async (): Promise<void> => {
  setMetadata(serverToken.metadata.Secret, config.Secret)
  setMetadata(serverClient.metadata.Endpoint, config.AccountsUrl)
  setMetadata(serverClient.metadata.UserAgent, config.ServiceId)
  registerLoaders()

  const storageConfig: StorageConfiguration = storageConfigFromEnv()
  const storageAdapter = buildStorageFromConfig(storageConfig)

  const worker = await PlatformWorker.create(ctx, storageAdapter)
  const bot = await setUpBot(worker)
  const limiter = new Limiter()
  const app = createServer(bot, worker, ctx, limiter)

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

  await requestReconnect(bot, worker, limiter)
  const server = listen(app, ctx, config.Port)

  const onClose = (): void => {
    server.close(() => process.exit())
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
