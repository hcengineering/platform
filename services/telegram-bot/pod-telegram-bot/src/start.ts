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

import { MeasureMetricsContext } from '@hcengineering/core'
import { setMetadata } from '@hcengineering/platform'
import serverToken from '@hcengineering/server-token'
import serverClient from '@hcengineering/server-client'

import config from './config'
import { createServer, listen } from './server'
import { setUpBot } from './bot'
import { PlatformWorker } from './worker'
import { registerLoaders } from './loaders'

export const start = async (): Promise<void> => {
  setMetadata(serverToken.metadata.Secret, config.Secret)
  setMetadata(serverClient.metadata.Endpoint, config.AccountsUrl)
  setMetadata(serverClient.metadata.UserAgent, config.ServiceId)
  registerLoaders()

  const ctx = new MeasureMetricsContext('telegram-bot', {})

  const worker = await PlatformWorker.create()
  const bot = await setUpBot(worker)
  const app = createServer(bot, worker)

  void bot.launch({ webhook: { domain: config.Domain, port: config.BotPort } }).then(() => {
    ctx.info('Webhook bot listening on', { port: config.BotPort, domain: config.Domain })
    void bot.telegram.getWebhookInfo().then(console.log)
  })

  app.post(`/telegraf/${bot.secretPathComponent()}`, (req, res) => {
    void bot.handleUpdate(req.body, res)
    res.status(200).send()
  })

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
