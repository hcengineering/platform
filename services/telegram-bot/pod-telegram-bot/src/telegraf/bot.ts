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

import { Context, Markup, NarrowedContext, session, Telegraf } from 'telegraf'
import { message } from 'telegraf/filters'
import telegram from '@hcengineering/telegram'
import { htmlToMarkup, isEmptyMarkup, jsonToMarkup, MarkupNodeType } from '@hcengineering/text'
import { toHTML } from '@telegraf/entity'
import { CallbackQuery, Message, Update } from 'telegraf/typings/core/types/typegram'
import { translate } from '@hcengineering/platform'
import { AccountUuid, WorkspaceUuid } from '@hcengineering/core'

import config from '../config'
import { PlatformWorker } from '../worker'
import { TgContext, ReplyMessage } from './types'
import { toTelegramFileInfo } from '../utils'
import { Command, defineCommands } from './commands'
import { ChannelId, ChannelRecord, IntegrationInfo, MessageRecord, TelegramFileInfo, WorkspaceInfo } from '../types'
import { getAnyIntegrationByTelegramId, listIntegrationsByTelegramId } from '../account'

function encodeChannelId (channelId: string): string {
  return `@${channelId}`
}

function decodeChannelId (id: string): string | undefined {
  const [, channelId] = id.split('@')
  return channelId
}

const getNextActionId = (workspace: string, page: number): string => `next_${workspace}_${page}`
const getPrevActionId = (workspace: string, page: number): string => `prev_${workspace}_${page}`

async function findMessageRecord (
  worker: PlatformWorker,
  fromTgUser: number,
  replyTo: number,
  account: AccountUuid
): Promise<MessageRecord | undefined> {
  const record = await worker.getMessageRecordByTelegramId(account, replyTo)

  if (record !== undefined) {
    return record
  }

  const reply = await worker.getReply(fromTgUser, replyTo)

  if (reply === undefined) {
    return undefined
  }

  return await worker.getMessageRecordByRef(account, reply.messageId)
}

async function onReply (
  ctx: Context,
  fromTgUser: number,
  message: ReplyMessage,
  messageId: number,
  replyTo: number,
  worker: PlatformWorker,
  username: string
): Promise<boolean> {
  const integration = await getAnyIntegrationByTelegramId(fromTgUser)

  if (integration === undefined) {
    return false
  }

  if (integration.username !== username) {
    void worker.updateTelegramUsername(integration.socialId, username)
  }

  const messageRecord = await findMessageRecord(worker, fromTgUser, replyTo, integration.account)

  if (messageRecord === undefined) {
    return false
  }

  await worker.saveReply({
    replyId: messageId,
    telegramUserId: fromTgUser,
    messageId: messageRecord.messageId
  })

  const file = await toTelegramFileInfo(ctx, message)
  const files: TelegramFileInfo[] = file !== undefined ? [file] : []

  return await worker.reply(integration, messageRecord, htmlToMarkup(toHTML(message)), files)
}

async function handleSelectChannel (
  ctx: Context<Update.CallbackQueryUpdate<CallbackQuery>>,
  worker: PlatformWorker,
  match: string
): Promise<[string, boolean]> {
  const userMessage = (ctx.callbackQuery.message as ReplyMessage)?.reply_to_message
  if (userMessage === undefined) return ['', false]

  const id = ctx.chat?.id
  if (id === undefined) return ['', false]

  const integration = await getAnyIntegrationByTelegramId(id)
  if (integration === undefined) return ['', false]

  const channelId = decodeChannelId(match)
  if (channelId === undefined || channelId === '') return ['', false]
  const channel = await worker.getChannel(integration.account, channelId as ChannelId)

  if (channel === undefined) return ['', false]

  const file = await toTelegramFileInfo(ctx as TgContext, userMessage)
  let text = htmlToMarkup(toHTML(userMessage as Message.TextMessage))

  if (isEmptyMarkup(text) && 'caption' in userMessage) {
    text = jsonToMarkup({
      type: MarkupNodeType.text,
      text: userMessage.caption
    })
  }

  return [
    channel.name,
    await worker.sendMessage(channel, integration.account, integration.socialId, userMessage.message_id, text, file)
  ]
}

async function showNoChannelsMessage (
  ctx: Context,
  worker: PlatformWorker,
  workspace: WorkspaceUuid,
  account: AccountUuid
): Promise<void> {
  const ws = await worker.getWorkspaceInfo(account, workspace)
  await ctx.editMessageText(
    `No channels found in workspace <b>${ws?.name ?? workspace}</b>.\nTo sync channels call /${Command.SyncAllChannels} or /${Command.SyncStarredChannels}`,
    { parse_mode: 'HTML' }
  )
}

async function createSelectChannelKeyboard (
  ctx: NarrowedContext<TgContext, Update.MessageUpdate>,
  worker: PlatformWorker,
  integration: IntegrationInfo,
  workspace: WorkspaceUuid
): Promise<void> {
  const channels = await worker.getChannels(integration.account, workspace)

  if (channels.length === 0) {
    const ws = await worker.getWorkspaceInfo(integration.account, workspace)
    await ctx.replyWithHTML(
      `No channels found in workspace <b>${ws?.name ?? workspace}</b>.\nTo sync channels call /${Command.SyncAllChannels} or /${Command.SyncStarredChannels}`
    )
    return
  }

  const hasNext = channels.length > channelsPerPage
  const pageChannels = getPageChannels(channels, 0)

  await ctx.reply('Please select the channel to send message', {
    reply_parameters: { message_id: ctx.message.message_id },
    ...Markup.inlineKeyboard(
      [
        ...pageChannels.map((channel) => Markup.button.callback(channel.name, encodeChannelId(channel._id.toString()))),
        ...(hasNext ? [Markup.button.callback('Next>', getNextActionId(workspace, 0))] : [])
      ],
      { columns: 1 }
    )
  })
}

async function createSelectWorkspaceKeyboard (
  ctx: NarrowedContext<TgContext, Update.MessageUpdate>,
  worker: PlatformWorker,
  workspaces: WorkspaceUuid[],
  integration: IntegrationInfo
): Promise<void> {
  const info: WorkspaceInfo[] = []

  for (const workspace of workspaces) {
    const workspaceInfo = await worker.getWorkspaceInfo(integration.account, workspace)
    if (workspaceInfo === undefined) continue
    info.push(workspaceInfo)
  }

  info.sort((a, b) => a.name.localeCompare(b.name))

  await ctx.reply('Please select workspace', {
    reply_parameters: { message_id: ctx.message.message_id },
    ...Markup.inlineKeyboard(
      info.map(({ id, name }) => Markup.button.callback(name, `workspace_${id}`)),
      { columns: 1 }
    )
  })
}

export async function setUpBot (worker: PlatformWorker): Promise<Telegraf<TgContext>> {
  const bot = new Telegraf<TgContext>(config.BotToken)

  bot.use(session())
  bot.use((ctx, next) => {
    ctx.processingKeyboards = ctx.processingKeyboards ?? new Set()
    return next()
  })

  await defineCommands(bot, worker)

  bot.on(message('reply_to_message'), async (ctx) => {
    const id = ctx.chat?.id
    const message = ctx.message

    if (id === undefined || message.reply_to_message === undefined) {
      return
    }

    const replyTo = message.reply_to_message
    const isReplied = await onReply(
      ctx,
      id,
      message as ReplyMessage,
      message.message_id,
      replyTo.message_id,
      worker,
      ctx.from.username ?? ''
    )

    if (!isReplied) {
      await ctx.reply('Cannot reply to this message.')
    }
  })

  bot.on(message(), async (ctx) => {
    const id = ctx.chat?.id
    if (id === undefined) return
    if ('reply_to_message' in ctx.message) return

    const integrations = await listIntegrationsByTelegramId(id)
    if (integrations === undefined) return

    const workspaces: WorkspaceUuid[] = integrations
      .filter((it) => it.data?.disabled !== true)
      .map((it) => it.workspaceUuid)
    if (workspaces.length === 0) {
      await ctx.reply("You don't have any connected workspaces")
      return
    }
    if (workspaces.length === 1) {
      await createSelectChannelKeyboard(ctx, worker, integrations[0], workspaces[0])
    } else {
      await createSelectWorkspaceKeyboard(ctx, worker, workspaces, integrations[0])
    }
  })

  bot.action(/next_.+_.+/, async (ctx) => {
    const [, workspace, page] = ctx.match[0].split('_')

    if (workspace == null || page == null) return
    if (workspace === '' || page === '') return

    const newPage = parseInt(page) + 1

    await editChannelKeyboard(ctx, worker, workspace as WorkspaceUuid, newPage)
  })

  bot.action(/prev_.+_.+/, async (ctx) => {
    const [, workspace, page] = ctx.match[0].split('_')

    if (workspace == null || page == null) return
    if (workspace === '' || page === '') return

    const newPage = parseInt(page) - 1

    await editChannelKeyboard(ctx, worker, workspace as WorkspaceUuid, newPage)
  })

  bot.action(/workspace_.+/, async (ctx) => {
    const messageId = ctx.callbackQuery.message?.message_id
    if (messageId === undefined) return
    if (ctx.processingKeyboards.has(messageId)) return
    const wsId = ctx.match[0].split('_')[1] as WorkspaceUuid
    if (wsId == null || wsId === '') return
    const integration = await getAnyIntegrationByTelegramId(ctx.chat?.id ?? 0, wsId)
    if (integration === undefined) return

    ctx.processingKeyboards.add(messageId)

    try {
      const info = await worker.getWorkspaceInfo(integration.account, wsId)
      if (info === undefined) return
      await ctx.editMessageText(`Please select the channel to send message in workspace <b>${info.name}</b>`, {
        parse_mode: 'HTML'
      })
      await editChannelKeyboard(ctx, worker, wsId, 0)
    } catch (e) {
      await ctx.answerCbQuery('❌Failed to select workspace')
    }

    ctx.processingKeyboards.delete(messageId)
  })

  bot.action(/@.+/, async (ctx) => {
    const messageId = ctx.callbackQuery.message?.message_id
    if (messageId === undefined) return
    if (ctx.processingKeyboards.has(messageId)) return

    ctx.processingKeyboards.add(messageId)

    try {
      const [channel, isMessageSent] = await handleSelectChannel(ctx, worker, ctx.match[0])

      if (isMessageSent) {
        // TODO: add link to the channel
        await ctx.editMessageText(`✅Message sent to <b>${channel}</b>`, { parse_mode: 'HTML' })
      } else {
        if (channel !== '') {
          await ctx.answerCbQuery(`❌Failed to send message to ${channel}`)
        } else {
          await ctx.answerCbQuery('❌Failed to send message')
        }
      }
    } catch (e) {
      console.error('Failed to send message', e)
      await ctx.answerCbQuery('❌Failed to send message')
    }

    ctx.processingKeyboards.delete(messageId)
  })

  const description = await translate(telegram.string.BotDescription, { app: config.App })
  const shortDescription = await translate(telegram.string.BotShortDescription, { app: config.App })

  await bot.telegram.setMyDescription(description, 'en')
  await bot.telegram.setMyShortDescription(shortDescription, 'en')

  return bot
}

const channelsPerPage = 10

const getPageChannels = (channels: ChannelRecord[], page: number): ChannelRecord[] => {
  return channels.slice(page * channelsPerPage, (page + 1) * channelsPerPage)
}

const editChannelKeyboard = async (
  ctx: Context,
  worker: PlatformWorker,
  workspace: WorkspaceUuid,
  page: number
): Promise<void> => {
  const id = ctx.chat?.id
  if (id === undefined) return

  const integration = await getAnyIntegrationByTelegramId(id, workspace)
  if (integration === undefined) return

  const channels = await worker.getChannels(integration.account, workspace)

  if (channels.length === 0) {
    await showNoChannelsMessage(ctx, worker, workspace, integration.account)
    return
  }

  const pageChannels = getPageChannels(channels, page)
  const hasNext = channels.length > (page + 1) * channelsPerPage
  const hasPrev = page > 0

  await ctx.editMessageReplyMarkup({
    inline_keyboard: [
      ...pageChannels.map((channel) => [Markup.button.callback(channel.name, encodeChannelId(channel._id.toString()))]),
      [
        ...(hasPrev ? [Markup.button.callback('<Prev', getPrevActionId(workspace, page))] : []),
        ...(hasNext ? [Markup.button.callback('Next>', getNextActionId(workspace, page))] : [])
      ]
    ]
  })
}
