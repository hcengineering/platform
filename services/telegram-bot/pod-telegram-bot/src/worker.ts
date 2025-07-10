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

import { AccountUuid, MeasureContext, PersonId, Ref, WorkspaceUuid } from '@hcengineering/core'
import { StorageAdapter, type StorageConfiguration } from '@hcengineering/server-core'
import chunter, { ChunterSpace } from '@hcengineering/chunter'
import { formatName } from '@hcengineering/contact'
import { getAccountClient } from '@hcengineering/server-client'
import { ActivityMessage } from '@hcengineering/activity'

import {
  ChannelId,
  ChannelRecord,
  IntegrationInfo,
  MessageRecord,
  PlatformFileInfo,
  ReplyRecord,
  TelegramFileInfo,
  WorkspaceInfo
} from './types'
import { WorkspaceClient } from './workspace'
import { getNewOtp, serviceToken, toMediaGroups, toTelegramHtml } from './utils'
import config from './config'
import {
  TelegramNotificationQueueMessage,
  TelegramWorkspaceSubscriptionQueueMessage
} from '@hcengineering/server-telegram'
import { generateToken } from '@hcengineering/server-token'
import { Telegraf } from 'telegraf'
import { buildStorageFromConfig, storageConfigFromEnv } from '@hcengineering/server-storage'

import { Limiter } from './limiter'
import { TgContext } from './telegraf/types'
import { getDb, PostgresDB } from './db'
import {
  addWorkspace,
  createIntegration,
  listIntegrationsByAccount,
  addSocialIdToPerson,
  disableIntegration,
  getAnyIntegrationByTelegramId,
  enableIntegration
} from './account'

export class PlatformWorker {
  private readonly otpIntervalId: NodeJS.Timeout | undefined
  private readonly clearIntervalId: NodeJS.Timeout | undefined

  private readonly channelsByWorkspace = new Map<string, ChannelRecord[]>()
  private readonly channelByRowId = new Map<ChannelId, ChannelRecord>()
  private readonly workspaceInfoById = new Map<string, WorkspaceInfo>()

  private constructor (
    readonly ctx: MeasureContext,
    readonly storage: StorageAdapter,
    readonly limiter: Limiter,
    private readonly db: PostgresDB
  ) {
    this.otpIntervalId = setInterval(
      () => {
        void db.removeExpiredOtp()
      },
      3 * 60 * 1000
    )
    this.clearIntervalId = setInterval(
      () => {
        this.channelsByWorkspace.clear()
        this.channelByRowId.clear()
      },
      60 * 60 * 1000
    )
  }

  public static async create (ctx: MeasureContext): Promise<PlatformWorker> {
    const storageConfig: StorageConfiguration = storageConfigFromEnv()
    const storage = buildStorageFromConfig(storageConfig)

    ctx.info('Connecting to database...', { dbUrl: config.DbUrl })
    const db = await getDb()
    ctx.info('Database connected')
    const limiter = new Limiter()

    return new PlatformWorker(ctx, storage, limiter, db)
  }

  async close (): Promise<void> {
    if (this.otpIntervalId !== undefined) {
      clearInterval(this.otpIntervalId)
    }
    if (this.clearIntervalId !== undefined) {
      clearInterval(this.clearIntervalId)
    }
    await this.db.close()
  }

  private async addIntegration (
    telegramId: number,
    account: AccountUuid,
    workspace: WorkspaceUuid,
    socialId: PersonId,
    username?: string
  ): Promise<IntegrationInfo | undefined> {
    const integrationByTg = await getAnyIntegrationByTelegramId(telegramId)

    if (integrationByTg != null) {
      this.ctx.error('Account is already registered', {
        telegramId,
        account: integrationByTg.account,
        requestAccount: account
      })
      return
    }

    const integration = await createIntegration(socialId, workspace)

    return {
      ...integration,
      workspaceUuid: workspace,
      account,
      telegramId,
      username
    }
  }

  async getFiles (
    workspace: WorkspaceUuid,
    message: Ref<ActivityMessage>,
    account: AccountUuid
  ): Promise<PlatformFileInfo[]> {
    const wsClient = await WorkspaceClient.create(workspace, account, this.ctx, this.storage)
    return await wsClient.getFiles(message)
  }

  async updateTelegramUsername (personId: PersonId, telegramUsername: string): Promise<void> {
    await getAccountClient(serviceToken()).updateSocialId(personId, telegramUsername)
  }

  async saveReply (record: ReplyRecord): Promise<void> {
    await this.db.insertReply(record)
  }

  async getReply (tgUserId: number, replyTo: number): Promise<ReplyRecord | undefined> {
    return await this.db.getReply(tgUserId, replyTo)
  }

  async getMessageRecordByRef (
    account: AccountUuid,
    messageId: Ref<ActivityMessage>
  ): Promise<MessageRecord | undefined> {
    return await this.db.getMessageByRef(account, messageId)
  }

  async getMessageRecordByTelegramId (account: AccountUuid, telegramId: number): Promise<MessageRecord | undefined> {
    return await this.db.getMessageByTgId(account, telegramId)
  }

  async reply (
    integration: IntegrationInfo,
    messageRecord: MessageRecord,
    text: string,
    files: TelegramFileInfo[]
  ): Promise<boolean> {
    const client = await WorkspaceClient.create(messageRecord.workspace, integration.account, this.ctx, this.storage)
    return await client.replyToMessage(integration.account, integration.socialId, messageRecord, text, files)
  }

  async getChannelName (client: WorkspaceClient, channel: ChunterSpace, account: AccountUuid): Promise<string> {
    if (client.hierarchy.isDerived(channel._class, chunter.class.DirectMessage)) {
      const persons = await client.getPersons(channel.members.filter((it) => it !== account))
      return persons
        .map(({ name }) => formatName(name))
        .sort((a, b) => a.localeCompare(b))
        .join(', ')
    }

    if (client.hierarchy.isDerived(channel._class, chunter.class.Channel)) {
      return `#${channel.name}`
    }

    return channel.name
  }

  async getChannels (account: AccountUuid, workspace: WorkspaceUuid): Promise<ChannelRecord[]> {
    const key = `${account}:${workspace}`

    if (this.channelsByWorkspace.has(key)) {
      return this.channelsByWorkspace.get(key) ?? []
    }
    const res = await this.db.getChannels(account, workspace)

    this.channelsByWorkspace.set(key, res)
    for (const channel of res) {
      this.channelByRowId.set(channel.rowId, channel)
    }
    return res
  }

  async getChannel (account: AccountUuid, channelId: ChannelId): Promise<ChannelRecord | undefined> {
    if (this.channelByRowId.has(channelId)) {
      const channel = this.channelByRowId.get(channelId)

      return channel !== undefined && channel.account === account ? channel : undefined
    }

    const res = await this.db.getChannel(account, channelId)

    if (res !== undefined) {
      this.channelByRowId.set(res.rowId, res)
    }
    return res
  }

  async sendMessage (
    channel: ChannelRecord,
    account: AccountUuid,
    socialId: PersonId,
    telegramId: number,
    text: string,
    file?: TelegramFileInfo
  ): Promise<boolean> {
    const client = await WorkspaceClient.create(channel.workspace, account, this.ctx, this.storage)
    const _id = await client.sendMessage(channel, account, socialId, text, file)

    if (_id === undefined) return false

    await this.db.insertMessage({
      workspace: channel.workspace,
      account: channel.account,
      messageId: _id,
      telegramMessageId: telegramId
    })

    return true
  }

  async syncChannels (account: AccountUuid, workspace: WorkspaceUuid, onlyStarred: boolean): Promise<void> {
    const client = await WorkspaceClient.create(workspace, account, this.ctx, this.storage)
    const channels = await client.getChannels(account, onlyStarred)
    const existingChannels = await this.db.getChannels(account, workspace)

    const toInsert: Omit<ChannelRecord, 'rowId'>[] = []
    const toDelete: ChannelRecord[] = []

    for (const channel of channels) {
      const existingChannel = existingChannels.find((c) => c._id === channel._id)
      const name = await this.getChannelName(client, channel, account)
      if (existingChannel === undefined) {
        toInsert.push({ workspace, account, _id: channel._id, _class: channel._class, name })
      } else if (existingChannel.name !== name) {
        await this.db.updateChannelName(existingChannel.rowId, name)
      }
    }

    for (const existingChannel of existingChannels) {
      const channel = channels.find(({ _id }) => _id === existingChannel._id)
      if (channel === undefined) {
        toDelete.push(existingChannel)
      }
    }

    if (toInsert.length > 0) {
      await Promise.all(toInsert.map((it) => this.db.insertChannel(it)))
    }

    if (toDelete.length > 0) {
      await this.db.removeChannels(toDelete.map((c) => c.rowId))
    }

    this.channelsByWorkspace.delete(`${account}:${workspace}`)
    for (const [key, channel] of this.channelByRowId.entries()) {
      if (channel.account === account) {
        this.channelByRowId.delete(key)
      }
    }
  }

  async getWorkspaceInfo (account: AccountUuid, workspaceId: WorkspaceUuid): Promise<WorkspaceInfo | undefined> {
    if (this.workspaceInfoById.has(workspaceId)) {
      return this.workspaceInfoById.get(workspaceId)
    }

    try {
      const accountClient = getAccountClient(generateToken(account, workspaceId, { service: 'telegram-bot' }))
      const result = await accountClient.getWorkspaceInfo(false)

      if (result === undefined) {
        this.ctx.error('Failed to get workspace info', { workspaceId })
        return undefined
      }

      const info: WorkspaceInfo = {
        url: result.url,
        id: workspaceId,
        name: result.name
      }
      this.workspaceInfoById.set(workspaceId, info)
      return info
    } catch (e) {
      return undefined
    }
  }

  async authorizeUser (
    code: string,
    account: AccountUuid,
    workspace: WorkspaceUuid
  ): Promise<IntegrationInfo | undefined> {
    const otpData = await this.db.getOtpByCode(code)
    const isExpired = otpData !== undefined && otpData.expires < new Date()
    const isValid = otpData !== undefined && !isExpired && code === otpData.code

    if (!isValid || otpData === undefined) {
      throw new Error('Invalid OTP')
    }

    await this.db.removeOtp(code)

    const socialId = await addSocialIdToPerson(account, otpData.telegramId, otpData.telegramUsername)
    return await this.addIntegration(otpData.telegramId, account, workspace, socialId, otpData.telegramUsername)
  }

  async generateCode (telegramId: number, telegramUsername: string): Promise<string> {
    const now = new Date()
    const otpData = await this.db.getOtpByTelegramId(telegramId)
    const retryDelay = config.OtpRetryDelaySec * 1000
    const isValid = otpData !== undefined && otpData.expires > now
    const canRetry = otpData !== undefined && otpData.createdAt.getTime() + retryDelay < now.getTime()

    if (isValid && !canRetry) {
      return otpData.code
    }

    const newCode = await getNewOtp(this.db)
    const timeToLive = config.OtpTimeToLiveSec * 1000
    const expires = Date.now() + timeToLive

    await this.db.insertOtp({ telegramId, code: newCode, expires: new Date(expires), createdAt: now, telegramUsername })

    return newCode
  }

  async processNotification (
    workspace: WorkspaceUuid,
    record: TelegramNotificationQueueMessage,
    bot: Telegraf<TgContext>
  ): Promise<void> {
    const integrations = await listIntegrationsByAccount(record.account)

    if (integrations.length === 0) {
      this.ctx.error('Integrations not found', { account: record.account })
      return
    }

    const workspaceIntegration = integrations.find((it) => it.workspaceUuid === workspace)
    if (workspaceIntegration === undefined) {
      await addWorkspace(integrations[0], workspace)
    } else if (workspaceIntegration.data?.disabled === true) {
      await enableIntegration(workspaceIntegration)
    }

    const integration = integrations[0]

    void this.limiter.add(integration.telegramId, async () => {
      const { full: fullMessage, short: shortMessage } = toTelegramHtml(record)
      const files =
        record.attachments && record.messageId != null
          ? await this.getFiles(workspace, record.messageId, record.account)
          : []
      const tgMessageIds: number[] = []

      if (files.length === 0) {
        const message = await bot.telegram.sendMessage(integration.telegramId, fullMessage, {
          parse_mode: 'HTML'
        })

        tgMessageIds.push(message.message_id)
      } else {
        const groups = toMediaGroups(files, fullMessage, shortMessage)
        for (const group of groups) {
          const mediaGroup = await bot.telegram.sendMediaGroup(integration.telegramId, group)
          tgMessageIds.push(...mediaGroup.map((it) => it.message_id))
        }
      }

      for (const messageId of tgMessageIds) {
        if (record.messageId === undefined) continue
        await this.db.insertMessage({
          messageId: record.messageId,
          account: integration.account,
          workspace,
          telegramMessageId: messageId
        })
      }
    })
  }

  async processWorkspaceSubscription (
    workspace: WorkspaceUuid,
    record: TelegramWorkspaceSubscriptionQueueMessage
  ): Promise<void> {
    const integrations = await listIntegrationsByAccount(record.account)

    if (integrations.length === 0) {
      this.ctx.error('Integrations not found', { account: record.account })
      return
    }

    const workspaceIntegration = integrations.find((it) => it.workspaceUuid === workspace)

    if (record.subscribe && workspaceIntegration === undefined) {
      await addWorkspace(integrations[0], workspace)
    } else if (record.subscribe && workspaceIntegration?.data?.disabled === true) {
      await enableIntegration(workspaceIntegration)
    } else if (!record.subscribe && workspaceIntegration !== undefined) {
      await disableIntegration(workspaceIntegration)
    }
  }
}
