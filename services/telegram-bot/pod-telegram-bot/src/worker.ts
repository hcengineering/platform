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

import type { Collection } from 'mongodb'
import { Account, Ref, SortingOrder } from '@hcengineering/core'
import { InboxNotification } from '@hcengineering/notification'

import { UserRecord, NotificationRecord, OtpRecord, ReplyRecord } from './types'
import { getDB } from './storage'
import { WorkspaceClient } from './workspace'
import { getNewOtp } from './utils'
import config from './config'

const closeWorkspaceTimeout = 10 * 60 * 1000 // 10 minutes

export class PlatformWorker {
  private readonly workspacesClients = new Map<string, WorkspaceClient>()
  private readonly closeWorkspaceTimeouts: Map<string, NodeJS.Timeout> = new Map<string, NodeJS.Timeout>()
  private readonly intervalId: NodeJS.Timeout | undefined

  private constructor (
    private readonly usersStorage: Collection<UserRecord>,
    private readonly notificationsStorage: Collection<NotificationRecord>,
    private readonly otpStorage: Collection<OtpRecord>,
    private readonly repliesStorage: Collection<ReplyRecord>
  ) {
    this.intervalId = setInterval(
      () => {
        void otpStorage.deleteMany({ expires: { $lte: Date.now() } })
      },
      3 * 60 * 1000
    )
  }

  async close (): Promise<void> {
    if (this.intervalId !== undefined) {
      clearInterval(this.intervalId)
    }
  }

  async closeWorkspaceClient (workspace: string): Promise<void> {
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

  async addUser (id: number, email: string, telegramUsername?: string): Promise<UserRecord | undefined> {
    const emailRes = await this.usersStorage.findOne({ email })

    if (emailRes !== null) {
      console.log('Account is already registered', { id, email })
      return
    }

    const tRes = await this.usersStorage.findOne({ telegramId: id })

    if (tRes !== null) {
      console.log('Account is already registered', { id, email })
      return
    }

    const insertResult = await this.usersStorage.insertOne({ telegramId: id, email, telegramUsername })

    return (await this.usersStorage.findOne({ _id: insertResult.insertedId })) ?? undefined
  }

  async updateTelegramUsername (userRecord: UserRecord, telegramUsername?: string): Promise<void> {
    await this.usersStorage.updateOne(
      { telegramId: userRecord.telegramId, email: userRecord.email },
      { $set: { telegramUsername } }
    )
  }

  async addNotificationRecord (record: NotificationRecord): Promise<void> {
    await this.notificationsStorage.insertOne(record)
  }

  async removeUserByTelegramId (id: number): Promise<void> {
    await this.usersStorage.deleteOne({ telegramId: id })
  }

  async removeUserByAccount (_id: Ref<Account>): Promise<void> {
    await this.usersStorage.deleteOne({ account: _id })
  }

  async saveReply (record: ReplyRecord): Promise<void> {
    await this.repliesStorage.insertOne(record)
  }

  async getReply (id: number, replyTo: number): Promise<ReplyRecord | undefined> {
    return (await this.repliesStorage.findOne({ telegramId: id, replyId: replyTo })) ?? undefined
  }

  async getNotificationRecord (id: number, email: string): Promise<NotificationRecord | undefined> {
    return (await this.notificationsStorage.findOne({ telegramId: id, email })) ?? undefined
  }

  async getNotificationRecordById (
    notificationId: Ref<InboxNotification>,
    email: string
  ): Promise<NotificationRecord | undefined> {
    return (await this.notificationsStorage.findOne({ notificationId, email })) ?? undefined
  }

  async getUserRecord (id: number): Promise<UserRecord | undefined> {
    return (await this.usersStorage.findOne({ telegramId: id })) ?? undefined
  }

  async getUserRecordByEmail (email: string): Promise<UserRecord | undefined> {
    return (await this.usersStorage.findOne({ email })) ?? undefined
  }

  async getWorkspaceClient (workspace: string): Promise<WorkspaceClient> {
    const wsClient = this.workspacesClients.get(workspace) ?? (await WorkspaceClient.create(workspace))

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

  async reply (notification: NotificationRecord, text: string): Promise<boolean> {
    const client = await this.getWorkspaceClient(notification.workspace)
    return await client.reply(notification, text)
  }

  async authorizeUser (code: string, email: string): Promise<UserRecord | undefined> {
    const otpData = (await this.otpStorage.findOne({ code })) ?? undefined
    const isExpired = otpData !== undefined && otpData.expires < Date.now()
    const isValid = otpData !== undefined && !isExpired && code === otpData.code

    if (!isValid) {
      throw new Error('Invalid OTP')
    }

    return await this.addUser(otpData.telegramId, email, otpData.telegramUsername)
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
  [Collection<UserRecord>, Collection<NotificationRecord>, Collection<OtpRecord>, Collection<ReplyRecord>]
  > {
    const db = await getDB()
    const userStorage = db.collection<UserRecord>('users')
    const notificationsStorage = db.collection<NotificationRecord>('notifications')
    const otpStorage = db.collection<OtpRecord>('otp')
    const repliesStorage = db.collection<ReplyRecord>('replies')

    return [userStorage, notificationsStorage, otpStorage, repliesStorage]
  }

  static async create (): Promise<PlatformWorker> {
    const [userStorage, notificationsStorage, otpStorage, repliesStorage] = await PlatformWorker.createStorages()

    return new PlatformWorker(userStorage, notificationsStorage, otpStorage, repliesStorage)
  }
}
