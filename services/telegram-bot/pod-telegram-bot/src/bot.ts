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

import { Context, Telegraf, NarrowedContext } from 'telegraf'
import { Update, Message } from 'telegraf/typings/core/types/typegram'
import { translate } from '@hcengineering/platform'
import telegram from '@hcengineering/telegram'
import { htmlToMarkup } from '@hcengineering/text'
import { message } from 'telegraf/filters'
import { toHTML } from '@telegraf/entity'

import config from './config'
import { PlatformWorker } from './worker'
import { getBotCommands, getCommandsHelp } from './utils'

async function onStart (ctx: Context, worker: PlatformWorker): Promise<void> {
  const id = ctx.from?.id
  const lang = ctx.from?.language_code ?? 'en'
  const record = id !== undefined ? await worker.getUserRecord(id) : undefined

  const commandsHelp = await getCommandsHelp(lang)
  const welcomeMessage = await translate(telegram.string.WelcomeMessage, { app: config.App }, lang)

  if (record !== undefined) {
    const connectedMessage = await translate(
      telegram.string.ConnectedDescriptionHtml,
      { email: record.email, app: config.App },
      lang
    )
    const message = welcomeMessage + '\n\n' + commandsHelp + '\n\n' + connectedMessage

    await ctx.replyWithHTML(message)
  } else {
    const connectMessage = await translate(telegram.string.ConnectMessage, { app: config.App }, lang)
    const message = welcomeMessage + '\n\n' + commandsHelp + '\n\n' + connectMessage

    await ctx.reply(message)
  }
}

async function onHelp (ctx: Context): Promise<void> {
  const lang = ctx.from?.language_code ?? 'en'
  const commandsHelp = await getCommandsHelp(lang)

  await ctx.reply(commandsHelp)
}

async function onStop (ctx: Context, worker: PlatformWorker): Promise<void> {
  if (ctx.from?.id !== undefined) {
    await worker.removeUserByTelegramId(ctx.from?.id)
  }
  const lang = ctx.from?.language_code ?? 'en'
  const message = await translate(telegram.string.StopMessage, { app: config.App }, lang)

  await ctx.reply(message)
}

async function onConnect (ctx: Context, worker: PlatformWorker): Promise<void> {
  const id = ctx.from?.id
  const lang = ctx.from?.language_code ?? 'en'

  if (id === undefined) {
    return
  }

  const account = await worker.getUserRecord(id)

  if (account !== undefined) {
    const reply = await translate(
      telegram.string.AccountAlreadyConnectedHtml,
      { email: account.email, app: config.App },
      lang
    )
    await ctx.replyWithHTML(reply)
    return
  }

  const code = await worker.generateCode(id)
  await ctx.reply(`*${code}*`, { parse_mode: 'MarkdownV2' })
}

type TextMessage = Record<'text', any> & Message.TextMessage

async function onReply (
  ctx: NarrowedContext<Context<Update>, Update.MessageUpdate<TextMessage>>,
  worker: PlatformWorker
): Promise<void> {
  const id = ctx.chat?.id
  const message = ctx.message

  if (id === undefined || message.reply_to_message === undefined) {
    return
  }

  const replyTo = message.reply_to_message
  const userRecord = await worker.getUserRecord(id)

  if (userRecord === undefined) {
    return
  }

  const notification = await worker.getNotificationRecord(replyTo.message_id, userRecord.email)

  if (notification === undefined) {
    return
  }

  const isReplied = await worker.reply(notification, htmlToMarkup(toHTML(message)))
  if (isReplied) {
    await ctx.react('👍')
  }
}

export async function setUpBot (worker: PlatformWorker): Promise<Telegraf> {
  const bot = new Telegraf(config.BotToken)

  await bot.telegram.setMyCommands(await getBotCommands())

  bot.start((ctx) => onStart(ctx, worker))
  bot.help(onHelp)

  bot.command('stop', (ctx) => onStop(ctx, worker))
  bot.command('connect', (ctx) => onConnect(ctx, worker))

  bot.on(message('text'), async (ctx) => {
    await onReply(ctx, worker)
  })

  const description = await translate(telegram.string.BotDescription, { app: config.App })
  const shortDescription = await translate(telegram.string.BotShortDescription, { app: config.App })

  await bot.telegram.setMyDescription(description, 'en')
  await bot.telegram.setMyShortDescription(shortDescription, 'en')

  return bot
}
