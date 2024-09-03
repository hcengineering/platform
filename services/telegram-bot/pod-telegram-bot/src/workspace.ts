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

import {
  Blob,
  Client,
  generateId,
  getWorkspaceId,
  MeasureContext,
  Ref,
  Space,
  systemAccountEmail,
  TxFactory
} from '@hcengineering/core'
import { generateToken } from '@hcengineering/server-token'
import notification, { ActivityInboxNotification, MentionInboxNotification } from '@hcengineering/notification'
import chunter, { ThreadMessage } from '@hcengineering/chunter'
import contact, { PersonAccount } from '@hcengineering/contact'
import { createClient, getTransactorEndpoint } from '@hcengineering/server-client'
import activity, { ActivityMessage } from '@hcengineering/activity'
import attachment, { Attachment } from '@hcengineering/attachment'
import { StorageAdapter } from '@hcengineering/server-core'
import { isEmptyMarkup } from '@hcengineering/text'

import { NotificationRecord, PlatformFileInfo, TelegramFileInfo } from './types'

export class WorkspaceClient {
  private constructor (
    private readonly ctx: MeasureContext,
    private readonly storageAdapter: StorageAdapter,
    private readonly client: Client,
    private readonly token: string,
    private readonly workspace: string
  ) {}

  static async create (
    workspace: string,
    ctx: MeasureContext,
    storageAdapter: StorageAdapter
  ): Promise<WorkspaceClient> {
    const workspaceId = getWorkspaceId(workspace)
    const token = generateToken(systemAccountEmail, workspaceId)
    const client = await connectPlatform(token)

    return new WorkspaceClient(ctx, storageAdapter, client, token, workspace)
  }

  async createAttachments (
    factory: TxFactory,
    _id: Ref<ThreadMessage>,
    space: Ref<Space>,
    files: TelegramFileInfo[]
  ): Promise<number> {
    const wsId = getWorkspaceId(this.workspace)

    let attachments = 0

    for (const file of files) {
      try {
        const response = await fetch(file.url)
        const buffer = Buffer.from(await response.arrayBuffer())
        const uuid = generateId()
        await this.storageAdapter.put(this.ctx, wsId, uuid, buffer, file.type, file.size)
        const tx = factory.createTxCollectionCUD<ThreadMessage, Attachment>(
          chunter.class.ThreadMessage,
          _id,
          space,
          'attachments',
          factory.createTxCreateDoc<Attachment>(attachment.class.Attachment, space, {
            name: file.name ?? uuid,
            file: uuid as Ref<Blob>,
            type: file.type,
            size: file.size ?? 0,
            lastModified: Date.now(),
            collection: 'attachments',
            attachedTo: _id,
            attachedToClass: chunter.class.ThreadMessage
          })
        )
        await this.client.tx(tx)
        attachments++
      } catch (e) {
        this.ctx.error('Failed to create attachment', { error: e, ...file })
      }
    }
    return attachments
  }

  async replyToMessage (
    message: ActivityMessage,
    account: PersonAccount,
    text: string,
    files: TelegramFileInfo[]
  ): Promise<void> {
    const txFactory = new TxFactory(account._id)
    const hierarchy = this.client.getHierarchy()
    const messageId = generateId<ThreadMessage>()
    const attachments = await this.createAttachments(txFactory, messageId, message.space, files)

    if (attachments === 0 && isEmptyMarkup(text)) {
      return
    }

    if (hierarchy.isDerived(message._class, chunter.class.ThreadMessage)) {
      const thread = message as ThreadMessage
      const collectionTx = txFactory.createTxCollectionCUD(
        thread.attachedToClass,
        thread.attachedTo,
        message.space,
        'replies',
        txFactory.createTxCreateDoc(
          chunter.class.ThreadMessage,
          message.space,
          {
            attachedTo: thread.attachedTo,
            attachedToClass: thread.attachedToClass,
            objectId: thread.objectId,
            objectClass: thread.objectClass,
            message: text,
            attachments,
            collection: 'replies',
            provider: contact.channelProvider.Telegram
          },
          messageId
        )
      )
      await this.client.tx(collectionTx)
    } else {
      const collectionTx = txFactory.createTxCollectionCUD(
        message._class,
        message._id,
        message.space,
        'replies',
        txFactory.createTxCreateDoc(
          chunter.class.ThreadMessage,
          message.space,
          {
            attachedTo: message._id,
            attachedToClass: message._class,
            objectId: message.attachedTo,
            objectClass: message.attachedToClass,
            message: text,
            attachments,
            collection: 'replies',
            provider: contact.channelProvider.Telegram
          },
          messageId
        )
      )
      await this.client.tx(collectionTx)
    }
  }

  async replyToActivityNotification (
    it: ActivityInboxNotification,
    account: PersonAccount,
    text: string,
    files: TelegramFileInfo[]
  ): Promise<boolean> {
    const message = await this.client.findOne(it.attachedToClass, { _id: it.attachedTo })

    if (message !== undefined) {
      await this.replyToMessage(message, account, text, files)
      return true
    }

    return false
  }

  async replyToMention (
    it: MentionInboxNotification,
    account: PersonAccount,
    text: string,
    files: TelegramFileInfo[]
  ): Promise<boolean> {
    const hierarchy = this.client.getHierarchy()

    if (!hierarchy.isDerived(it.mentionedInClass, activity.class.ActivityMessage)) {
      return false
    }

    const message = (await this.client.findOne(it.mentionedInClass, { _id: it.mentionedIn })) as ActivityMessage

    if (message !== undefined) {
      await this.replyToMessage(message, account, text, files)
      return true
    }

    return false
  }

  public async reply (record: NotificationRecord, text: string, files: TelegramFileInfo[]): Promise<boolean> {
    const account = await this.client.getModel().findOne(contact.class.PersonAccount, { email: record.email })
    if (account === undefined) {
      return false
    }

    const inboxNotification = await this.client.findOne(notification.class.InboxNotification, {
      _id: record.notificationId
    })

    if (inboxNotification === undefined) {
      return false
    }
    const hierarchy = this.client.getHierarchy()
    if (hierarchy.isDerived(inboxNotification._class, notification.class.ActivityInboxNotification)) {
      return await this.replyToActivityNotification(
        inboxNotification as ActivityInboxNotification,
        account,
        text,
        files
      )
    } else if (hierarchy.isDerived(inboxNotification._class, notification.class.MentionInboxNotification)) {
      return await this.replyToMention(inboxNotification as MentionInboxNotification, account, text, files)
    }

    return false
  }

  async close (): Promise<void> {
    await this.client.close()
  }

  async getFiles (_id: Ref<ActivityMessage>): Promise<PlatformFileInfo[]> {
    const attachments = await this.client.findAll(attachment.class.Attachment, { attachedTo: _id })
    const res: PlatformFileInfo[] = []
    for (const attachment of attachments) {
      const chunks = await this.storageAdapter.read(this.ctx, { name: this.workspace }, attachment.file)
      const buffer = Buffer.concat(chunks)
      if (buffer.length > 0) {
        res.push({
          buffer,
          type: attachment.type,
          filename: attachment.name
        })
      }
    }
    return res
  }
}

async function connectPlatform (token: string): Promise<Client> {
  const endpoint = await getTransactorEndpoint(token)
  return await createClient(endpoint, token)
}
