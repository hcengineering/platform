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

import { Context, Telegraf } from 'telegraf'
import { translate } from '@hcengineering/platform'
import telegram from '@hcengineering/telegram'
import { htmlToMarkup } from '@hcengineering/text'
import { message } from 'telegraf/filters'
import { toHTML } from '@telegraf/entity'
import { TextMessage } from '@telegraf/entity/types/types'

import config from './config'
import { PlatformWorker } from './worker'
import { getBotCommands, getCommandsHelp } from './utils'
import { NotificationRecord } from './types'

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
    if (record.telegramUsername !== ctx.from?.username) {
      await worker.updateTelegramUsername(record, ctx.from?.username)
    }
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

  const code = await worker.generateCode(id, ctx.from?.username)
  await ctx.reply(`*${code}*`, { parse_mode: 'MarkdownV2' })
}

async function findNotificationRecord (
  worker: PlatformWorker,
  from: number,
  replyTo: number,
  email: string
): Promise<NotificationRecord | undefined> {
  const record = await worker.getNotificationRecord(replyTo, email)

  if (record !== undefined) {
    return record
  }

  const reply = await worker.getReply(from, replyTo)

  if (reply === undefined) {
    return undefined
  }

  return await worker.getNotificationRecordById(reply.notificationId, email)
}

async function onReply (
  from: number,
  message: TextMessage,
  messageId: number,
  replyTo: number,
  worker: PlatformWorker,
  username?: string
): Promise<boolean> {
  const userRecord = await worker.getUserRecord(from)

  if (userRecord === undefined) {
    return false
  }

  if (userRecord.telegramUsername !== username) {
    await worker.updateTelegramUsername(userRecord, username)
  }

  const notification = await findNotificationRecord(worker, from, replyTo, userRecord.email)

  if (notification === undefined) {
    return false
  }

  await worker.saveReply({ replyId: messageId, telegramId: from, notificationId: notification.notificationId })

  return await worker.reply(notification, htmlToMarkup(toHTML(message)))
}

export async function setUpBot (worker: PlatformWorker): Promise<Telegraf> {
  const bot = new Telegraf(config.BotToken)

  await bot.telegram.setMyCommands(await getBotCommands())

  bot.start((ctx) => onStart(ctx, worker))
  bot.help(onHelp)

  bot.command('stop', (ctx) => onStop(ctx, worker))
  bot.command('connect', (ctx) => onConnect(ctx, worker))

  bot.on(message('reply_to_message'), async (ctx) => {
    const id = ctx.chat?.id
    const message = ctx.message

    if (id === undefined || message.reply_to_message === undefined) {
      return
    }

    const replyTo = message.reply_to_message
    const isReplied = await onReply(
      id,
      message as TextMessage,
      message.message_id,
      replyTo.message_id,
      worker,
      ctx.from.username
    )

    if (isReplied) {
      await ctx.react('👍')
    }
  })

  const description = await translate(telegram.string.BotDescription, { app: config.App })
  const shortDescription = await translate(telegram.string.BotShortDescription, { app: config.App })

  await bot.telegram.setMyDescription(description, 'en')
  await bot.telegram.setMyShortDescription(shortDescription, 'en')

  return bot
}
