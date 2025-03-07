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

import type { Collection, ObjectId, WithId } from 'mongodb'
import { MeasureContext, Ref, SortingOrder, systemAccountUuid, WorkspaceUuid } from '@hcengineering/core'
import { InboxNotification } from '@hcengineering/notification'
import { TelegramNotificationRequest } from '@hcengineering/telegram'
import { StorageAdapter } from '@hcengineering/server-core'
import chunter, { ChunterSpace } from '@hcengineering/chunter'
import { formatName } from '@hcengineering/contact'
import { generateToken } from '@hcengineering/server-token'
import { getAccountClient } from '@hcengineering/server-client'
import { ActivityMessage } from '@hcengineering/activity'

import {
  ChannelRecord,
  MessageRecord,
  OtpRecord,
  PlatformFileInfo,
  ReplyRecord,
  TelegramFileInfo,
  UserRecord,
  WorkspaceInfo
} from './types'
import { getDB } from './storage'
import { WorkspaceClient } from './workspace'
import { getNewOtp } from './utils'
import config from './config'

const closeWorkspaceTimeout = 10 * 60 * 1000 // 10 minutes

export class PlatformWorker {
  private readonly workspacesClients = new Map<string, WorkspaceClient>()
  private readonly closeWorkspaceTimeouts: Map<string, NodeJS.Timeout> = new Map<string, NodeJS.Timeout>()
  private readonly otpIntervalId: NodeJS.Timeout | undefined
  private readonly clearIntervalId: NodeJS.Timeout | undefined

  private readonly channelsByWorkspace = new Map<string, WithId<ChannelRecord>[]>()
  private readonly channelById = new Map<ObjectId, WithId<ChannelRecord>>()
  private readonly workspaceInfoById = new Map<string, WorkspaceInfo>()

  private constructor (
    readonly ctx: MeasureContext,
    readonly storageAdapter: StorageAdapter,
    private readonly usersStorage: Collection<UserRecord>,
    private readonly messagesStorage: Collection<MessageRecord>,
    private readonly otpStorage: Collection<OtpRecord>,
    private readonly repliesStorage: Collection<ReplyRecord>,
    private readonly channelsStorage: Collection<ChannelRecord>
  ) {
    this.otpIntervalId = setInterval(
      () => {
        void otpStorage.deleteMany({ expires: { $lte: Date.now() } })
      },
      3 * 60 * 1000
    )
    this.clearIntervalId = setInterval(
      () => {
        this.channelsByWorkspace.clear()
        this.channelById.clear()
      },
      60 * 60 * 1000
    )
  }

  public async getUsersToDisconnect (): Promise<UserRecord[]> {
    return await this.usersStorage.find({ workspaces: { $exists: false } }).toArray()
  }

  public async disconnectUsers (): Promise<void> {
    await this.usersStorage.deleteMany({ workspaces: { $exists: false } })
  }

  async close (): Promise<void> {
    if (this.otpIntervalId !== undefined) {
      clearInterval(this.otpIntervalId)
    }
    if (this.clearIntervalId !== undefined) {
      clearInterval(this.clearIntervalId)
    }
  }

  async closeWorkspaceClient (workspace: WorkspaceUuid): Promise<void> {
    const timeoutId = this.closeWorkspaceTimeouts.get(workspace)

    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
      this.closeWorkspaceTimeouts.delete(workspace)
    }

    const client = this.workspacesClients.get(workspace)

    if (client !== undefined) {
      await client.close()
      this.workspacesClients.delete(workspace)
    }
  }

  async addUser (
    id: number,
    email: string,
    workspace: WorkspaceUuid,
    telegramUsername?: string
  ): Promise<UserRecord | undefined> {
    const emailRes = await this.usersStorage.findOne({ email })

    if (emailRes !== null) {
      if (emailRes.workspaces.includes(workspace)) {
        return
      }
      if (!emailRes.workspaces.includes(workspace)) {
        await this.usersStorage.updateOne({ email }, { $push: { workspaces: workspace } })
      }
      return
    }

    const tRes = await this.usersStorage.findOne({ telegramId: id })

    if (tRes !== null) {
      if (tRes.email !== email) {
        this.ctx.error('Account is already registered', { id, email: tRes.email, newEmail: email })
      }
      if (tRes.email === email && !tRes.workspaces.includes(workspace)) {
        await this.usersStorage.updateOne({ email }, { $push: { workspaces: workspace } })
      }
      return
    }

    const insertResult = await this.usersStorage.insertOne({
      telegramId: id,
      email,
      workspaces: [workspace],
      telegramUsername
    })

    return (await this.usersStorage.findOne({ _id: insertResult.insertedId })) ?? undefined
  }

  async getFiles (request: TelegramNotificationRequest): Promise<PlatformFileInfo[]> {
    if (request.messageId === undefined || !request.attachments) {
      return []
    }
    const wsClient = await this.getWorkspaceClient(request.workspace as any) // TODO: FIXME
    return await wsClient.getFiles(request.messageId)
  }

  async updateTelegramUsername (userRecord: UserRecord, telegramUsername?: string): Promise<void> {
    await this.usersStorage.updateOne(
      { telegramId: userRecord.telegramId, email: userRecord.email },
      { $set: { telegramUsername } }
    )
  }

  async addNotificationRecord (record: MessageRecord): Promise<void> {
    await this.messagesStorage.insertOne(record)
  }

  async removeUserByTelegramId (id: number): Promise<void> {
    await this.usersStorage.deleteOne({ telegramId: id })
  }

  async saveReply (record: ReplyRecord): Promise<void> {
    await this.repliesStorage.insertOne(record)
  }

  async getReply (id: number, replyTo: number): Promise<ReplyRecord | undefined> {
    return (await this.repliesStorage.findOne({ telegramId: id, replyId: replyTo })) ?? undefined
  }

  async getNotificationRecord (id: number, email: string): Promise<MessageRecord | undefined> {
    return (await this.messagesStorage.findOne({ telegramId: id, email })) ?? undefined
  }

  async findMessageRecord (
    email: string,
    notificationId?: Ref<InboxNotification>,
    messageId?: Ref<ActivityMessage>
  ): Promise<MessageRecord | undefined> {
    if (notificationId !== undefined) {
      return (await this.messagesStorage.findOne({ notificationId, email })) ?? undefined
    }

    if (messageId !== undefined) {
      return (await this.messagesStorage.findOne({ messageId, email })) ?? undefined
    }

    return undefined
  }

  async getUserRecord (id: number): Promise<UserRecord | undefined> {
    return (await this.usersStorage.findOne({ telegramId: id })) ?? undefined
  }

  async getUserRecordByEmail (email: string): Promise<UserRecord | undefined> {
    return (await this.usersStorage.findOne({ email })) ?? undefined
  }

  async addWorkspace (email: string, workspace: WorkspaceUuid): Promise<void> {
    await this.usersStorage.updateOne({ email }, { $push: { workspaces: workspace } })
  }

  async removeWorkspace (email: string, workspace: WorkspaceUuid): Promise<void> {
    await this.usersStorage.updateOne({ email }, { $pull: { workspaces: workspace } })
  }

  async getWorkspaceClient (workspace: WorkspaceUuid): Promise<WorkspaceClient> {
    const wsClient =
      this.workspacesClients.get(workspace) ?? (await WorkspaceClient.create(workspace, this.ctx, this.storageAdapter))

    if (!this.workspacesClients.has(workspace)) {
      this.workspacesClients.set(workspace, wsClient)
    }

    const timeoutId = this.closeWorkspaceTimeouts.get(workspace)

    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
    }

    const newTimeoutId = setTimeout(() => {
      void this.closeWorkspaceClient(workspace)
    }, closeWorkspaceTimeout)

    this.closeWorkspaceTimeouts.set(workspace, newTimeoutId)

    return wsClient
  }

  async reply (messageRecord: MessageRecord, text: string, files: TelegramFileInfo[]): Promise<boolean> {
    const client = await this.getWorkspaceClient(messageRecord.workspace as any) // TODO: FIXME
    return await client.reply(messageRecord, text, files)
  }

  async getChannelName (client: WorkspaceClient, channel: ChunterSpace, email: string): Promise<string> {
    if (client.hierarchy.isDerived(channel._class, chunter.class.DirectMessage)) {
      const persons = await client.getPersons(channel.members, email)
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

  async getWorkspaces (email: string): Promise<string[]> {
    return (await this.usersStorage.findOne({ email }))?.workspaces ?? []
  }

  async getChannels (email: string, workspace: WorkspaceUuid): Promise<WithId<ChannelRecord>[]> {
    const key = `${email}:${workspace}`

    if (this.channelsByWorkspace.has(key)) {
      return this.channelsByWorkspace.get(key) ?? []
    }
    const res = await this.channelsStorage
      .find({ workspace, email }, { sort: { name: SortingOrder.Ascending } })
      .toArray()

    this.channelsByWorkspace.set(key, res)
    for (const channel of res) {
      this.channelById.set(channel._id, channel)
    }
    return res
  }

  async getChannel (email: string, channelId: ObjectId): Promise<WithId<ChannelRecord> | undefined> {
    if (this.channelById.has(channelId)) {
      const channel = this.channelById.get(channelId)

      return channel !== undefined && channel.email === email ? channel : undefined
    }

    const res = (await this.channelsStorage.findOne({ _id: channelId, email })) ?? undefined

    if (res !== undefined) {
      this.channelById.set(res._id, res)
    }
    return res
  }

  async sendMessage (
    channel: ChannelRecord,
    telegramId: number,
    text: string,
    file?: TelegramFileInfo
  ): Promise<boolean> {
    const client = await this.getWorkspaceClient(channel.workspace as any) // TODO: FIXME
    const _id = await client.sendMessage(channel, text, file)

    await this.messagesStorage.insertOne({
      email: channel.email,
      workspace: channel.workspace,
      telegramId,
      messageId: _id
    })

    return _id !== undefined
  }

  async syncChannels (email: string, workspace: WorkspaceUuid, onlyStarred: boolean): Promise<void> {
    const client = await this.getWorkspaceClient(workspace as any) // TODO: FIXME
    const channels = await client.getChannels(email, onlyStarred)
    const existingChannels = await this.channelsStorage.find({ workspace, email }).toArray()

    const toInsert: ChannelRecord[] = []
    const toDelete: WithId<ChannelRecord>[] = []

    for (const channel of channels) {
      const existingChannel = existingChannels.find((c) => c.channelId === channel._id)
      const name = await this.getChannelName(client, channel, email)
      if (existingChannel === undefined) {
        toInsert.push({ workspace, email, channelId: channel._id, channelClass: channel._class, name })
      } else if (existingChannel.name !== name) {
        await this.channelsStorage.updateOne({ workspace, email, _id: channel._id }, { $set: { name } })
      }
    }

    for (const existingChannel of existingChannels) {
      const channel = channels.find(({ _id }) => _id === existingChannel.channelId)
      if (channel === undefined) {
        toDelete.push(existingChannel)
      }
    }

    if (toInsert.length > 0) {
      await this.channelsStorage.insertMany(toInsert)
    }

    if (toDelete.length > 0) {
      await this.channelsStorage.deleteMany({ _id: { $in: toDelete.map((c) => c._id) } })
    }

    this.channelsByWorkspace.delete(`${email}:${workspace}`)
    for (const [key, channel] of this.channelById.entries()) {
      if (channel.email === email) {
        this.channelById.delete(key)
      }
    }
  }

  async getWorkspaceInfo (workspaceId: WorkspaceUuid): Promise<WorkspaceInfo | undefined> {
    if (this.workspaceInfoById.has(workspaceId)) {
      return this.workspaceInfoById.get(workspaceId)
    }

    try {
      const token = generateToken(systemAccountUuid, workspaceId, { service: 'telegram' })
      const accountClient = getAccountClient(token)
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

  async authorizeUser (code: string, email: string, workspace: WorkspaceUuid): Promise<UserRecord | undefined> {
    const otpData = (await this.otpStorage.findOne({ code })) ?? undefined
    const isExpired = otpData !== undefined && otpData.expires < Date.now()
    const isValid = otpData !== undefined && !isExpired && code === otpData.code

    if (!isValid) {
      throw new Error('Invalid OTP')
    }

    return await this.addUser(otpData.telegramId, email, workspace, otpData.telegramUsername)
  }

  async generateCode (telegramId: number, telegramUsername?: string): Promise<string> {
    const now = Date.now()
    const otpData = (
      await this.otpStorage.find({ telegramId }).sort({ createdOn: SortingOrder.Descending }).limit(1).toArray()
    )[0]
    const retryDelay = config.OtpRetryDelaySec * 1000
    const isValid = otpData !== undefined && otpData.expires > now
    const canRetry = otpData !== undefined && otpData.createdOn + retryDelay < now

    if (isValid && !canRetry) {
      return otpData.code
    }

    const newCode = await getNewOtp(this.otpStorage)
    const timeToLive = config.OtpTimeToLiveSec * 1000
    const expires = now + timeToLive

    await this.otpStorage.insertOne({ telegramId, code: newCode, expires, createdOn: now, telegramUsername })

    return newCode
  }

  static async createStorages (): Promise<
  [
    Collection<UserRecord>,
    Collection<MessageRecord>,
    Collection<OtpRecord>,
    Collection<ReplyRecord>,
    Collection<ChannelRecord>
  ]
  > {
    const db = await getDB()
    const userStorage = db.collection<UserRecord>('users')
    await db.dropCollection('notifications')
    const messagesStorage = db.collection<MessageRecord>('messages')
    const otpStorage = db.collection<OtpRecord>('otp')
    const repliesStorage = db.collection<ReplyRecord>('replies')
    const channelsStorage = db.collection<ChannelRecord>('channels')

    return [userStorage, messagesStorage, otpStorage, repliesStorage, channelsStorage]
  }

  static async create (ctx: MeasureContext, storageAdapter: StorageAdapter): Promise<PlatformWorker> {
    const [userStorage, messagesStorage, otpStorage, repliesStorage, channelsStorage] =
      await PlatformWorker.createStorages()

    return new PlatformWorker(
      ctx,
      storageAdapter,
      userStorage,
      messagesStorage,
      otpStorage,
      repliesStorage,
      channelsStorage
    )
  }
}
