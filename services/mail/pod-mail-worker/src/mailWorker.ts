//
// Copyright © 2025 Hardcore Engineering Inc.
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

import { MeasureContext, WorkspaceUuid, Doc, TxCUD, Tx } from '@hcengineering/core'
import {
  toMessageEvent,
  isNewChannelTx,
  markdownToHtml,
  getRecipients,
  getReplySubject,
  markdownToText,
  isSyncedMessage,
  getMailHeadersRecord
} from '@hcengineering/mail-common'
import { ConsumerHandle, PlatformQueue, QueueTopic } from '@hcengineering/server-core'
import { getPlatformQueue } from '@hcengineering/kafka'
import { CreateMessageEvent } from '@hcengineering/communication-sdk-types'
import chat from '@hcengineering/chat'
import { Card } from '@hcengineering/card'
import { LRUCache } from 'lru-cache'

import config from './config'
import { AccountClient, MailboxOptions } from '@hcengineering/account-client'
import { getAccountClient } from './client'
import { getClient as getWorkspaceClient, releaseClient } from './workspaceClient'
import { sendEmail } from './send'
import { HulyMessageType, MailMessage } from './types'

export class MailWorker {
  private queue: PlatformQueue | undefined
  private txConsumer: ConsumerHandle | undefined
  private mailboxOptions: MailboxOptions | undefined
  private loadingPromise: Promise<void> | undefined

  // LRU cache to track sent messages (messageId -> timestamp)
  private readonly sentMessagesCache: LRUCache<string, number>

  protected static _instance: MailWorker

  private constructor (
    private readonly ctx: MeasureContext,
    private readonly accountClient: AccountClient
  ) {
    this.sentMessagesCache = new LRUCache<string, number>({
      max: 1000, // Maximum number of message IDs to cache
      ttl: 24 * 60 * 60 * 1000, // 24 hours TTL in milliseconds
      allowStale: false
    })
  }

  static async create (ctx: MeasureContext): Promise<MailWorker> {
    if (MailWorker._instance !== undefined) {
      throw new Error('MailWorker already exists')
    }
    // Create account client for system operations
    const accountClient = getAccountClient()
    const worker = new MailWorker(ctx, accountClient)
    MailWorker._instance = worker

    // Request mailbox options after creation
    await worker.loadMailboxes()
    await worker.startQueue()

    return worker
  }

  static getMailWorker (): MailWorker {
    if (MailWorker._instance !== undefined) {
      return MailWorker._instance
    }
    throw new Error('MailWorker not exist')
  }

  private async loadMailboxes (): Promise<void> {
    // If already loading, wait for the existing promise
    if (this.loadingPromise !== undefined) {
      await this.loadingPromise
      return
    }
    this.loadingPromise = this.performLoad()

    try {
      await this.loadingPromise
    } finally {
      this.loadingPromise = undefined
    }
  }

  private async performLoad (): Promise<void> {
    try {
      this.ctx.info('Loading mailbox options...')
      this.mailboxOptions = await this.accountClient.getMailboxOptions()
      this.ctx.info('Mailbox options loaded', {
        maxMailboxCount: this.mailboxOptions.maxMailboxCount,
        availableDomainsCount: this.mailboxOptions.availableDomains.length
      })
    } catch (err: any) {
      this.ctx.error('Failed to load mailbox options', { error: err.message })
      throw err
    }
  }

  async startQueue (): Promise<void> {
    try {
      if (config.queueRegion === undefined) {
        this.ctx.info('Queue region not configured, skipping queue consumer setup')
        return
      }

      this.ctx.info('Starting queue consumer for mail worker', {
        region: config.queueRegion
      })

      this.queue = getPlatformQueue(config.serviceId, config.queueRegion)
      if (this.queue === undefined) {
        this.ctx.error('Queue not found')
        return
      }

      this.txConsumer = this.queue.createConsumer<TxCUD<Doc>>(
        this.ctx,
        QueueTopic.Tx,
        this.queue.getClientId(),
        async (ctx, msg) => {
          const workspaceUuid = msg.workspace
          const tx = msg.value

          // Check for new channel creation
          if (isNewChannelTx(tx)) {
            await this.handleNewChannelTx(workspaceUuid, tx)
            return
          }
          // Check for message events
          const messageEvent = toMessageEvent(tx)
          if (messageEvent !== undefined) {
            await this.handleNewMessage(workspaceUuid, messageEvent)
          }
        },
        {
          fromBegining: false
        }
      )

      this.ctx.info('Queue consumer started successfully', { region: config.queueRegion })
    } catch (err: any) {
      this.ctx.error('Failed to start queue consumer', { error: err.message })
    }
  }

  /**
   * Handle new channel creation transaction
   */
  private async handleNewChannelTx (workspaceUuid: WorkspaceUuid, tx: Tx): Promise<void> {
    try {
      this.ctx.info('New channel created, updating mailbox options', {
        workspaceUuid,
        txId: tx._id
      })

      // Reload mailbox options when new channels are created
      await this.loadMailboxes()
    } catch (err: any) {
      this.ctx.error('Failed to handle new channel transaction', {
        workspaceUuid,
        txId: tx._id,
        error: err.message
      })
    }
  }

  async handleNewMessage (workspaceUuid: WorkspaceUuid, message: CreateMessageEvent): Promise<void> {
    try {
      if (isSyncedMessage(message)) {
        return
      }

      if (message.date !== undefined) {
        const messageDate = message.date instanceof Date ? message.date : new Date(message.date)
        if (messageDate < config.outgoingSyncStartDate) {
          return
        }
      }

      if (message._id !== undefined && this.sentMessagesCache.has(message._id)) {
        this.ctx.info('Message already sent, skipping', {
          workspaceUuid,
          messageId: message.messageId,
          hulyMessageId: message._id
        })
        return
      }

      // Await any active load/reload promise before processing CreateMessageEvent
      if (this.loadingPromise !== undefined) {
        await this.loadingPromise
      }

      try {
        const workspaceClient = await getWorkspaceClient(workspaceUuid)
        const thread = await workspaceClient.findOne<Card>(chat.masterTag.Thread, { _id: message.cardId })
        if (thread?.parent == null) {
          return
        }
        const channel = await workspaceClient.findOne<Card>(chat.masterTag.Thread, { _id: thread.parent })
        if (channel === undefined || !this.isHulyMailChannel(channel)) {
          return
        }

        // Convert the platform message to email format and send
        await this.sendMessageAsEmail(message, thread, channel, workspaceUuid)
      } finally {
        await releaseClient(this.ctx, workspaceUuid)
      }
    } catch (err: any) {
      this.ctx.error('Failed to handle new message', {
        workspaceUuid,
        messageId: message.messageId,
        error: err.message
      })
    }
  }

  private async sendMessageAsEmail (
    message: CreateMessageEvent,
    thread: Card,
    channel: Card,
    workspaceUuid: WorkspaceUuid
  ): Promise<void> {
    try {
      this.ctx.info('Sending email message', {
        workspaceUuid,
        messageId: message.messageId,
        socialId: message.socialId
      })

      const personUuid = await this.accountClient.findPersonBySocialId(message.socialId)
      if (personUuid === undefined) {
        this.ctx.error('Person not found for social ID', { socialId: message.socialId })
        return
      }
      const socialIds = await this.accountClient.getPersonInfo(personUuid)
      const emailSocialId = socialIds.socialIds.find((id) => id.value.toLowerCase() === channel.title.toLowerCase())
      if (emailSocialId === undefined) {
        this.ctx.error('Email social ID not found for channel', {
          channelTitle: channel.title,
          personUuid,
          socialIds: socialIds.socialIds.map((id) => id.value)
        })
        return
      }
      const recipients = await getRecipients(this.ctx, this.accountClient, thread, emailSocialId._id)
      let html = markdownToHtml(message.content)
      if (config.footerMessage != null && !html.includes(config.footerMessage)) {
        html = html + config.footerMessage
      }
      const text = markdownToText(message.content)
      const subject = getReplySubject(thread.title) ?? ''
      const to = [recipients?.to, ...(recipients?.copy ?? [])].filter(
        (address) => address != null && address !== ''
      ) as string[]

      const email = emailSocialId.value
      const secret = (await this.accountClient.getMailboxSecret(email))?.secret
      if (secret === undefined) {
        this.ctx.error('Mailbox secret not found for email', { email })
        return
      }
      const mailMessage: MailMessage = {
        from: email,
        to,
        subject,
        html,
        text,
        headers: getMailHeadersRecord(HulyMessageType, message._id, email)
      }

      await sendEmail(this.ctx, mailMessage, secret)

      if (message._id !== undefined) {
        this.sentMessagesCache.set(message._id, Date.now())
      }
    } catch (err: any) {
      this.ctx.error('Failed to send message as email', {
        messageId: message.messageId,
        error: err.message
      })
      throw err
    }
  }

  async close (): Promise<void> {
    if (this.txConsumer !== undefined) {
      await this.txConsumer.close()
    }
    if (this.queue !== undefined) {
      await this.queue.shutdown()
    }
    this.ctx.info('Mail worker closed')
  }

  isHulyMailChannel (channel: Card): boolean {
    const title = channel.title.toLowerCase()
    const domains = this.mailboxOptions?.availableDomains
    if (domains === undefined || domains.length === 0) {
      return false
    }
    return domains.some((domain) => title.includes(domain.toLowerCase()))
  }
}
