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
import { ObjectId, WithId } from 'mongodb'

import config from '../config'
import { PlatformWorker } from '../worker'
import { TgContext, ReplyMessage } from './types'
import { toTelegramFileInfo } from '../utils'
import { Command, defineCommands } from './commands'
import { ChannelRecord, MessageRecord, TelegramFileInfo, UserRecord, WorkspaceInfo } from '../types'
import { WorkspaceUuid } from '@hcengineering/core'

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
  from: number,
  replyTo: number,
  email: string
): Promise<MessageRecord | undefined> {
  const record = await worker.getNotificationRecord(replyTo, email)

  if (record !== undefined) {
    return record
  }

  const reply = await worker.getReply(from, replyTo)

  if (reply === undefined) {
    return undefined
  }

  return await worker.findMessageRecord(email, reply.notificationId, reply.messageId)
}

async function onReply (
  ctx: Context,
  from: number,
  message: ReplyMessage,
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

  const messageRecord = await findMessageRecord(worker, from, replyTo, userRecord.email)

  if (messageRecord === undefined) {
    return false
  }

  await worker.saveReply({
    replyId: messageId,
    telegramId: from,
    notificationId: messageRecord.notificationId,
    messageId: messageRecord.messageId
  })

  const file = await toTelegramFileInfo(ctx, message)
  const files: TelegramFileInfo[] = file !== undefined ? [file] : []

  return await worker.reply(messageRecord, htmlToMarkup(toHTML(message)), files)
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

  const userRecord = await worker.getUserRecord(id)
  if (userRecord === undefined) return ['', false]

  const channelId = decodeChannelId(match)
  if (channelId === undefined || channelId === '') return ['', false]
  const channel = await worker.getChannel(userRecord.email, new ObjectId(channelId))

  if (channel === undefined) return ['', false]

  const file = await toTelegramFileInfo(ctx as TgContext, userMessage)
  let text = htmlToMarkup(toHTML(userMessage as Message.TextMessage))

  if (isEmptyMarkup(text) && 'caption' in userMessage) {
    text = jsonToMarkup({
      type: MarkupNodeType.text,
      text: userMessage.caption
    })
  }

  return [channel.name, await worker.sendMessage(channel, userMessage.message_id, text, file)]
}

async function showNoChannelsMessage (ctx: Context, worker: PlatformWorker, workspace: WorkspaceUuid): Promise<void> {
  const ws = await worker.getWorkspaceInfo(workspace)
  await ctx.editMessageText(
    `No channels found in workspace <b>${ws?.name ?? workspace}</b>.\nTo sync channels call /${Command.SyncAllChannels} or /${Command.SyncStarredChannels}`,
    { parse_mode: 'HTML' }
  )
}

async function createSelectChannelKeyboard (
  ctx: NarrowedContext<TgContext, Update.MessageUpdate>,
  worker: PlatformWorker,
  userRecord: UserRecord,
  workspace: WorkspaceUuid
): Promise<void> {
  const channels = await worker.getChannels(userRecord.email, workspace)

  if (channels.length === 0) {
    const ws = await worker.getWorkspaceInfo(workspace)
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
  workspaces: WorkspaceUuid[]
): Promise<void> {
  const info: WorkspaceInfo[] = []

  for (const workspace of workspaces) {
    const workspaceInfo = await worker.getWorkspaceInfo(workspace)
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
      ctx.from.username
    )

    if (!isReplied) {
      await ctx.reply('Cannot reply to this message.')
    }
  })

  bot.on(message(), async (ctx) => {
    const id = ctx.chat?.id
    if (id === undefined) return
    if ('reply_to_message' in ctx.message) return

    const userRecord = await worker.getUserRecord(id)
    if (userRecord === undefined) return

    const workspaces = userRecord.workspaces as any // TODO: FIXME

    if (workspaces.length === 0) {
      await ctx.reply("You don't have any connected workspaces")
      return
    }
    if (workspaces.length === 1) {
      await createSelectChannelKeyboard(ctx, worker, userRecord, workspaces[0])
    } else {
      await createSelectWorkspaceKeyboard(ctx, worker, workspaces)
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

    ctx.processingKeyboards.add(messageId)

    try {
      const wsId = ctx.match[0].split('_')[1] as WorkspaceUuid
      if (wsId == null || wsId === '') return
      const info = await worker.getWorkspaceInfo(wsId)
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

const getPageChannels = (channels: WithId<ChannelRecord>[], page: number): WithId<ChannelRecord>[] => {
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

  const userRecord = await worker.getUserRecord(id)
  if (userRecord === undefined) return

  const channels = await worker.getChannels(userRecord.email, workspace)

  if (channels.length === 0) {
    await showNoChannelsMessage(ctx, worker, workspace)
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
