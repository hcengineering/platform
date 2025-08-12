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

import {
  MeasureContext,
  WorkspaceUuid,
  Doc,
  TxCUD,
  TxCreateDoc,
  Tx
} from '@hcengineering/core'
import { toMessageEvent, isNewChannelTx } from '@hcengineering/mail-common'
import { ConsumerHandle, PlatformQueue, QueueTopic } from '@hcengineering/server-core'
import { getPlatformQueue } from '@hcengineering/kafka'
import { CreateMessageEvent } from '@hcengineering/communication-sdk-types'
import chat from '@hcengineering/chat'

import config from './config'
import { AccountClient, MailboxOptions } from '@hcengineering/account-client'
import { getAccountClient } from './utils'
import { getClient as getWorkspaceClient } from './workspaceClient'
import { Card } from '@hcengineering/card'

export class MailWorker {
  private queue: PlatformQueue | undefined
  private txConsumer: ConsumerHandle | undefined
  private mailboxOptions: MailboxOptions | undefined
  private loadingPromise: Promise<void> | undefined

  protected static _instance: MailWorker

  private constructor (
    private readonly ctx: MeasureContext,
    private readonly accountClient: AccountClient
  ) {
    MailWorker._instance = this
  }

  static create (ctx: MeasureContext): MailWorker {
    if (MailWorker._instance !== undefined) {
      throw new Error('MailWorker already exists')
    }
    // Create account client for system operations
    const systemWorkspace = 'system' as WorkspaceUuid
    const accountClient = getAccountClient(systemWorkspace)
    const worker = new MailWorker(ctx, accountClient)

    // Request mailbox options after creation
    void worker.loadMailboxOptions()

    return worker
  }

  static getMailWorker (): MailWorker {
    if (MailWorker._instance !== undefined) {
      return MailWorker._instance
    }
    throw new Error('MailWorker not exist')
  }

  private async loadMailboxOptions (): Promise<void> {
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
        async (msgs) => {
          for (const msg of msgs) {
            const workspaceUuid = msg.workspace
            for (const tx of msg.value) {
              // Check for new channel creation
              if (isNewChannelTx(tx)) {
                await this.handleNewChannelTx(workspaceUuid, tx)
              }
              // Check for message events
              const messageEvent = toMessageEvent(tx)
              if (messageEvent !== undefined) {
                await this.handleNewMessage(workspaceUuid, messageEvent)
              }
            }
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
      await this.loadMailboxOptions()
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
      this.ctx.info('Processing new message from queue', {
        workspaceUuid,
        messageId: message.messageId,
        socialId: message.socialId
      })

      // Await any active load/reload promise before processing CreateMessageEvent
      if (this.loadingPromise !== undefined) {
        await this.loadingPromise
      }

      const workspaceClient = await getWorkspaceClient(workspaceUuid)
      const thread = await workspaceClient.findOne<Card>(
        chat.masterTag.Thread,
        { _id: message.cardId }
      )
      if (thread?.parent == null) {
        return
      }
      const channel = await workspaceClient.findOne<Card>(
        chat.masterTag.Channel,
        { _id: thread.parent }
      )
      if (channel === undefined || !this.isHulyMailChannel(channel)) {
        return
      }

      this.ctx.info('New message found in Huly mail channel', {
        workspaceUuid,
        channelId: channel._id,
        messageId: message.messageId
      })

      // Convert the platform message to email format and send
      await this.sendMessageAsEmail(message, workspaceUuid)
    } catch (err: any) {
      this.ctx.error('Failed to handle new message', {
        workspaceUuid,
        messageId: message.messageId,
        error: err.message
      })
    }
  }

  private async sendMessageAsEmail (message: CreateMessageEvent, workspaceUuid: WorkspaceUuid): Promise<void> {
    try {
      this.ctx.info('Sending message as email via pod-mail service', {
        workspaceUuid,
        messageId: message.messageId,
        content: message.content?.substring(0, 100) + '...'
      })
      
      // TODO: Implement email sending by calling pod-mail service API
      // This would make HTTP calls to the pod-mail service's /send endpoint
      // to convert platform messages to emails
      
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
    return domains.some(domain => title.includes(domain.toLowerCase()))
  }
}
