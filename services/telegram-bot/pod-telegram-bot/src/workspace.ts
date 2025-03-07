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
/* eslint-disable @typescript-eslint/no-unused-vars */
import core, {
  PersonId,
  Blob,
  Class,
  Client,
  Doc,
  generateId,
  Hierarchy,
  Markup,
  MeasureContext,
  Ref,
  Space,
  systemAccountUuid,
  TxFactory,
  WorkspaceUuid,
  AccountUuid
} from '@hcengineering/core'
import { generateToken } from '@hcengineering/server-token'
import notification, { ActivityInboxNotification, MentionInboxNotification } from '@hcengineering/notification'
import chunter, { ChatMessage, ChunterSpace, ThreadMessage } from '@hcengineering/chunter'
import contact, { Person } from '@hcengineering/contact'
import { createClient, getTransactorEndpoint } from '@hcengineering/server-client'
import activity, { ActivityMessage } from '@hcengineering/activity'
import attachment, { Attachment } from '@hcengineering/attachment'
import { StorageAdapter } from '@hcengineering/server-core'
import { isEmptyMarkup } from '@hcengineering/text'

import { ChannelRecord, MessageRecord, PlatformFileInfo, TelegramFileInfo } from './types'

export class WorkspaceClient {
  hierarchy: Hierarchy
  private constructor (
    private readonly ctx: MeasureContext,
    private readonly storageAdapter: StorageAdapter,
    private readonly client: Client,
    private readonly token: string,
    private readonly workspace: WorkspaceUuid
  ) {
    this.hierarchy = client.getHierarchy()
  }

  static async create (
    workspace: WorkspaceUuid,
    ctx: MeasureContext,
    storageAdapter: StorageAdapter
  ): Promise<WorkspaceClient> {
    const token = generateToken(systemAccountUuid, workspace)
    const client = await connectPlatform(token)

    return new WorkspaceClient(ctx, storageAdapter, client, token, workspace)
  }

  async createAttachments (
    factory: TxFactory,
    _id: Ref<ChatMessage>,
    _class: Ref<Class<ChatMessage>>,
    space: Ref<Space>,
    files: TelegramFileInfo[]
  ): Promise<number> {
    let attachments = 0

    for (const file of files) {
      try {
        const response = await fetch(file.url)
        const buffer = Buffer.from(await response.arrayBuffer())
        const uuid = generateId()
        await this.storageAdapter.put(this.ctx, this.workspace as any, uuid, buffer, file.type, file.size) // TODO: FIXME
        const tx = factory.createTxCollectionCUD<ChatMessage, Attachment>(
          _class,
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
            attachedToClass: _class
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

  async isReplyAvailable (account: AccountUuid, message: ActivityMessage): Promise<boolean> {
    const hierarchy = this.hierarchy

    let objectId: Ref<Doc>
    let objectClass: Ref<Class<Doc>>

    if (hierarchy.isDerived(message._class, chunter.class.ThreadMessage)) {
      const thread = message as ThreadMessage
      objectId = thread.objectId
      objectClass = thread.objectClass
    } else {
      objectId = message.attachedTo
      objectClass = message.attachedToClass
    }

    if (hierarchy.isDerived(objectClass, core.class.Space)) {
      const space = await this.client.findOne(objectClass, { _id: objectId as Ref<Space>, members: account })
      return space !== undefined
    }

    const doc = await this.client.findOne(objectClass, { _id: objectId })

    if (doc === undefined) {
      return false
    }

    const space = await this.client.findOne(core.class.Space, { _id: doc.space })

    if (space === undefined) {
      return false
    }

    if (hierarchy.isDerived(space._class, core.class.SystemSpace)) {
      return true
    }

    return space.members.includes(account)
  }

  async createThreadMessage (
    message: ActivityMessage,
    account: any,
    text: string,
    files: TelegramFileInfo[]
  ): Promise<boolean> {
    // TODO: FIXME
    throw new Error('Not implemented')
    // const txFactory = new TxFactory(account._id)
    // const hierarchy = this.hierarchy

    // const isAvailable = await this.isReplyAvailable(account._id, message)

    // if (!isAvailable) {
    //   return false
    // }

    // const messageId = generateId<ThreadMessage>()
    // const attachments = await this.createAttachments(
    //   txFactory,
    //   messageId,
    //   chunter.class.ThreadMessage,
    //   message.space,
    //   files
    // )

    // if (attachments === 0 && isEmptyMarkup(text)) {
    //   return false
    // }

    // if (hierarchy.isDerived(message._class, chunter.class.ThreadMessage)) {
    //   const thread = message as ThreadMessage
    //   const collectionTx = txFactory.createTxCollectionCUD(
    //     thread.attachedToClass,
    //     thread.attachedTo,
    //     message.space,
    //     'replies',
    //     txFactory.createTxCreateDoc(
    //       chunter.class.ThreadMessage,
    //       message.space,
    //       {
    //         attachedTo: thread.attachedTo,
    //         attachedToClass: thread.attachedToClass,
    //         objectId: thread.objectId,
    //         objectClass: thread.objectClass,
    //         message: text,
    //         attachments,
    //         collection: 'replies',
    //         provider: contact.channelProvider.Telegram
    //       },
    //       messageId
    //     )
    //   )
    //   await this.client.tx(collectionTx)
    // } else {
    //   const collectionTx = txFactory.createTxCollectionCUD(
    //     message._class,
    //     message._id,
    //     message.space,
    //     'replies',
    //     txFactory.createTxCreateDoc(
    //       chunter.class.ThreadMessage,
    //       message.space,
    //       {
    //         attachedTo: message._id,
    //         attachedToClass: message._class,
    //         objectId: message.attachedTo,
    //         objectClass: message.attachedToClass,
    //         message: text,
    //         attachments,
    //         collection: 'replies',
    //         provider: contact.channelProvider.Telegram
    //       },
    //       messageId
    //     )
    //   )
    //   await this.client.tx(collectionTx)
    // }

    // return true
  }

  async replyToActivityNotification (
    it: ActivityInboxNotification,
    account: any,
    text: string,
    files: TelegramFileInfo[]
  ): Promise<boolean> {
    // TODO: FIXME
    throw new Error('Not implemented')
    // const message = await this.client.findOne(it.attachedToClass, { _id: it.attachedTo })

    // if (message !== undefined) {
    //   return await this.createThreadMessage(message, account, text, files)
    // }

    // return false
  }

  async replyToMention (
    it: MentionInboxNotification,
    account: any,
    text: string,
    files: TelegramFileInfo[]
  ): Promise<boolean> {
    // TODO: FIXME
    throw new Error('Not implemented')
    // const hierarchy = this.hierarchy

    // if (!hierarchy.isDerived(it.mentionedInClass, activity.class.ActivityMessage)) {
    //   return false
    // }

    // const message = (await this.client.findOne(it.mentionedInClass, { _id: it.mentionedIn })) as ActivityMessage

    // if (message !== undefined) {
    //   return await this.createThreadMessage(message, account, text, files)
    // }

    // return false
  }

  async replyToNotification (
    account: any,
    record: MessageRecord,
    text: string,
    files: TelegramFileInfo[]
  ): Promise<boolean> {
    // TODO: FIXME
    throw new Error('Not implemented')
    // const inboxNotification = await this.client.findOne(notification.class.InboxNotification, {
    //   _id: record.notificationId
    // })

    // if (inboxNotification === undefined) {
    //   return false
    // }
    // const hierarchy = this.hierarchy
    // if (hierarchy.isDerived(inboxNotification._class, notification.class.ActivityInboxNotification)) {
    //   return await this.replyToActivityNotification(
    //     inboxNotification as ActivityInboxNotification,
    //     account,
    //     text,
    //     files
    //   )
    // } else if (hierarchy.isDerived(inboxNotification._class, notification.class.MentionInboxNotification)) {
    //   return await this.replyToMention(inboxNotification as MentionInboxNotification, account, text, files)
    // }

    // return false
  }

  async replyToMessage (account: any, record: MessageRecord, text: string, files: TelegramFileInfo[]): Promise<boolean> {
    // TODO: FIXME
    throw new Error('Not implemented')
    // const message = await this.client.findOne(activity.class.ActivityMessage, { _id: record.messageId })

    // if (message === undefined) {
    //   return false
    // }

    // return await this.createThreadMessage(message, account, text, files)
  }

  public async reply (record: MessageRecord, text: string, files: TelegramFileInfo[]): Promise<boolean> {
    // TODO: FIXME
    throw new Error('Not implemented')
    // const account = await this.client.getModel().findOne(contact.class.PersonAccount, { email: record.email })
    // if (account === undefined) {
    //   return false
    // }

    // if (record.messageId != null) {
    //   return await this.replyToMessage(account, record, text, files)
    // }

    // if (record.notificationId != null) {
    //   return await this.replyToNotification(account, record, text, files)
    // }

    // return false
  }

  async close (): Promise<void> {
    await this.client.close()
  }

  async getFiles (_id: Ref<ActivityMessage>): Promise<PlatformFileInfo[]> {
    const attachments = await this.client.findAll(attachment.class.Attachment, { attachedTo: _id })
    const res: PlatformFileInfo[] = []
    for (const attachment of attachments) {
      if (attachment.type === 'application/link-preview') continue
      const chunks = await this.storageAdapter.read(this.ctx, this.workspace as any, attachment.file) // TODO: FIXME
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

  async getChannels (email: string, onlyStarred: boolean): Promise<ChunterSpace[]> {
    // TODO: FIXME
    throw new Error('Not implemented')
    // const account = await this.client.findOne(contact.class.PersonAccount, { email })
    // if (account === undefined) return []

    // if (!onlyStarred) {
    //   return await this.client.findAll(chunter.class.ChunterSpace, {
    //     members: account._id
    //   })
    // }

    // const contexts = await this.client.findAll(notification.class.DocNotifyContext, {
    //   objectClass: { $in: [chunter.class.Channel, chunter.class.DirectMessage] },
    //   isPinned: true,
    //   user: account._id
    // })

    // if (contexts.length === 0) {
    //   return []
    // }

    // return await this.client.findAll(chunter.class.ChunterSpace, {
    //   _id: { $in: contexts.map((context) => context.objectId as Ref<ChunterSpace>) },
    //   members: account._id
    // })
  }

  async getPersons (_ids: AccountUuid[], myEmail: string): Promise<Person[]> {
    // TODO: FIXME
    throw new Error('Not implemented')
    // const me = await this.client.findOne(contact.class.PersonAccount, { email: myEmail })
    // const accounts = this.client.getModel().findAllSync(contact.class.PersonAccount, { _id: { $in: _ids } })
    // const persons = accounts.filter((account) => account.person !== me?.person).map(({ person }) => person)
    // return await this.client.findAll(contact.class.Person, { _id: { $in: persons } })
  }

  async sendMessage (
    channel: ChannelRecord,
    text: Markup,
    file?: TelegramFileInfo
  ): Promise<Ref<ChatMessage> | undefined> {
    // TODO: FIXME
    throw new Error('Not implemented')
    // const account = await this.client.getModel().findOne(contact.class.PersonAccount, { email: channel.email })

    // if (account === undefined) {
    //   return undefined
    // }

    // const doc = await this.client.findOne(channel.channelClass, { _id: channel.channelId, members: account._id })

    // if (doc === undefined) {
    //   return undefined
    // }

    // const txFactory = new TxFactory(account._id)
    // const messageId = generateId<ChatMessage>()
    // const attachments = await this.createAttachments(
    //   txFactory,
    //   messageId,
    //   chunter.class.ChatMessage,
    //   channel.channelId,
    //   file !== undefined ? [file] : []
    // )

    // if (attachments === 0 && isEmptyMarkup(text)) {
    //   return undefined
    // }

    // const collectionTx = txFactory.createTxCollectionCUD(
    //   channel.channelClass,
    //   channel.channelId,
    //   channel.channelId,
    //   'messages',
    //   txFactory.createTxCreateDoc(
    //     chunter.class.ChatMessage,
    //     channel.channelId,
    //     {
    //       message: text,
    //       attachments,
    //       attachedTo: channel.channelId,
    //       attachedToClass: channel.channelClass,
    //       collection: 'messages',
    //       provider: contact.channelProvider.Telegram
    //     },
    //     messageId
    //   )
    // )

    // await this.client.tx(collectionTx)

    // return messageId
  }
}

async function connectPlatform (token: string): Promise<Client> {
  const endpoint = await getTransactorEndpoint(token)
  return await createClient(endpoint, token)
}
