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

import { BotCommand } from 'telegraf/typings/core/types/typegram'
import { translate } from '@hcengineering/platform'
import telegram from '@hcengineering/telegram'
import { Context, Telegraf } from 'telegraf'

import config from '../config'
import { PlatformWorker } from '../worker'
import { TgContext } from './types'
import {
  listIntegrationsByTelegramId,
  getAccountPerson,
  removeIntegrationsByTg,
  getAnyIntegrationByTelegramId
} from '../account'
import { WorkspaceUuid } from '@hcengineering/core'

export enum Command {
  Start = 'start',
  Connect = 'connect',
  SyncAllChannels = 'sync_all_channels',
  SyncStarredChannels = 'sync_starred_channels',
  Help = 'help',
  Stop = 'stop'
}

export async function getBotCommands (lang: string = 'en'): Promise<BotCommand[]> {
  return [
    {
      command: Command.Start,
      description: await translate(telegram.string.StartBot, { app: config.App }, lang)
    },
    {
      command: Command.Connect,
      description: await translate(telegram.string.ConnectAccount, { app: config.App }, lang)
    },
    {
      command: Command.SyncAllChannels,
      description: await translate(telegram.string.SyncAllChannels, { app: config.App }, lang)
    },
    {
      command: Command.SyncStarredChannels,
      description: await translate(telegram.string.SyncStarredChannels, { app: config.App }, lang)
    },
    {
      command: Command.Help,
      description: await translate(telegram.string.ShowCommandsDetails, { app: config.App }, lang)
    },
    {
      command: Command.Stop,
      description: await translate(telegram.string.TurnNotificationsOff, { app: config.App }, lang)
    }
  ]
}

export async function getCommandsHelp (lang: string): Promise<string> {
  const myCommands = await getBotCommands(lang)
  return myCommands.map(({ command, description }) => `/${command} - ${description}`).join('\n')
}

async function onStart (ctx: Context, worker: PlatformWorker): Promise<void> {
  const id = ctx.from?.id
  const lang = ctx.from?.language_code ?? 'en'
  const integration = id !== undefined ? await getAnyIntegrationByTelegramId(id) : undefined

  const commandsHelp = await getCommandsHelp(lang)
  const welcomeMessage = await translate(telegram.string.WelcomeMessage, { app: config.App }, lang)

  if (integration !== undefined) {
    const person = await getAccountPerson(integration.account)
    if (person === undefined) return
    const connectedMessage = await translate(
      telegram.string.ConnectedDescriptionHtml,
      { name: `${person.firstName} ${person.lastName}`, app: config.App },
      lang
    )
    const message = welcomeMessage + '\n\n' + commandsHelp + '\n\n' + connectedMessage

    await ctx.replyWithHTML(message)
    const username = ctx.from?.username ?? ''
    if (integration.username !== username) {
      await worker.updateTelegramUsername(integration.socialId, username)
    }
  } else {
    const minutes = Math.round(config.OtpTimeToLiveSec / 60)
    const connectMessage = await translate(telegram.string.ConnectMessage, { app: config.App, minutes }, lang)
    const message = welcomeMessage + '\n\n' + commandsHelp + '\n\n' + connectMessage

    await ctx.reply(message)
  }
}

async function onHelp (ctx: Context): Promise<void> {
  const lang = ctx.from?.language_code ?? 'en'
  const commandsHelp = await getCommandsHelp(lang)
  await ctx.reply(commandsHelp)
}

async function onStop (ctx: Context): Promise<void> {
  if (ctx.from?.id !== undefined) {
    await removeIntegrationsByTg(ctx.from?.id)
  }
  const lang = ctx.from?.language_code ?? 'en'
  const message = await translate(telegram.string.StopMessage, { app: config.App }, lang)

  await ctx.reply(message)
}

async function onSyncChannels (ctx: Context, worker: PlatformWorker, onlyStarred: boolean): Promise<void> {
  const id = ctx.from?.id

  if (id === undefined) {
    return
  }

  const integrations = await listIntegrationsByTelegramId(id)

  if (integrations.length === 0) return

  const workspaces: WorkspaceUuid[] = integrations
    .filter((it) => it.data?.disabled !== true)
    .map((it) => it.workspaceUuid)

  for (const workspace of workspaces) {
    await worker.syncChannels(integrations[0].account, workspace, onlyStarred)
  }

  await ctx.reply('List of channels updated')
}

async function onConnect (ctx: Context, worker: PlatformWorker): Promise<void> {
  const id = ctx.from?.id
  const lang = ctx.from?.language_code ?? 'en'

  if (id === undefined) {
    return
  }

  const integration = await getAnyIntegrationByTelegramId(id)

  if (integration !== undefined) {
    const person = await getAccountPerson(integration.account)
    if (person === undefined) return
    const reply = await translate(
      telegram.string.AccountAlreadyConnectedHtml,
      { name: `${person.firstName} ${person.lastName}`, app: config.App },
      lang
    )
    await ctx.replyWithHTML(reply)
    return
  }

  const code = await worker.generateCode(id, ctx.from?.username ?? '')
  await ctx.reply(`*${code}*`, { parse_mode: 'MarkdownV2' })
}

export async function defineCommands (bot: Telegraf<TgContext>, worker: PlatformWorker): Promise<void> {
  await bot.telegram.setMyCommands(await getBotCommands())

  bot.start((ctx) => onStart(ctx, worker))
  bot.help(onHelp)

  bot.command(Command.Stop, (ctx) => onStop(ctx))
  bot.command(Command.Connect, (ctx) => onConnect(ctx, worker))
  bot.command(Command.SyncAllChannels, (ctx) => onSyncChannels(ctx, worker, false))
  bot.command(Command.SyncStarredChannels, (ctx) => onSyncChannels(ctx, worker, true))
}
