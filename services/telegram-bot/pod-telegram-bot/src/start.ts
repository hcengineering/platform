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
import { Telegraf } from 'telegraf'

import config from './config'
import { createServer, listen } from './server'

export const start = async (): Promise<void> => {
  const ctx = new MeasureMetricsContext('telegram-bot', {})
  const bot = new Telegraf(config.BotToken)

  const app = createServer(bot)
  const server = listen(app, ctx, config.Port)

  void bot.launch()

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
