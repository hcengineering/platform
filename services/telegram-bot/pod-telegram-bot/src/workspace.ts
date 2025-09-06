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
import core, {
  AccountUuid,
  Blob,
  Class,
  Doc,
  generateId,
  Hierarchy,
  Markup,
  MeasureContext,
  PersonId,
  Ref,
  Space,
  TxFactory,
  WorkspaceUuid
} from '@hcengineering/core'
import notification from '@hcengineering/notification'
import chunter, { ChatMessage, ChunterSpace, ThreadMessage } from '@hcengineering/chunter'
import contact, { Person } from '@hcengineering/contact'
import { getTransactorEndpoint } from '@hcengineering/server-client'
import activity, { ActivityMessage } from '@hcengineering/activity'
import attachment, { Attachment } from '@hcengineering/attachment'
import { StorageAdapter } from '@hcengineering/server-core'
import { createRestClient, RestClient } from '@hcengineering/api-client'
import { isEmptyMarkup } from '@hcengineering/text'
import { generateToken } from '@hcengineering/server-token'

import { ChannelRecord, MessageRecord, PlatformFileInfo, TelegramFileInfo } from './types'

export class WorkspaceClient {
  private constructor (
    private readonly ctx: MeasureContext,
    private readonly storage: StorageAdapter,
    private readonly client: RestClient,
    readonly hierarchy: Hierarchy,
    private readonly workspace: WorkspaceUuid
  ) {}

  static async create (
    workspace: WorkspaceUuid,
    account: AccountUuid,
    ctx: MeasureContext,
    storage: StorageAdapter
  ): Promise<WorkspaceClient> {
    const token = generateToken(account, workspace, { service: 'telegram-bot' })
    const endpoint = await getTransactorEndpoint(token)
    const client = createRestClient(endpoint, workspace, token)
    const model = await client.getModel()

    return new WorkspaceClient(ctx, storage, client, model.hierarchy, workspace)
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
        await this.storage.put(this.ctx, this.workspace as any, uuid, buffer, file.type, file.size) // TODO: FIXME
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
    account: AccountUuid,
    socialId: PersonId,
    text: string,
    files: TelegramFileInfo[]
  ): Promise<boolean> {
    const txFactory = new TxFactory(socialId)
    const hierarchy = this.hierarchy

    const isAvailable = await this.isReplyAvailable(account, message)

    if (!isAvailable) {
      return false
    }

    const messageId = generateId<ThreadMessage>()
    const attachments = await this.createAttachments(
      txFactory,
      messageId,
      chunter.class.ThreadMessage,
      message.space,
      files
    )

    if (attachments === 0 && isEmptyMarkup(text)) {
      return false
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

    return true
  }

  async replyToMessage (
    account: AccountUuid,
    socialId: PersonId,
    record: MessageRecord,
    text: string,
    files: TelegramFileInfo[]
  ): Promise<boolean> {
    const message = await this.client.findOne(activity.class.ActivityMessage, { _id: record.messageId })

    if (message === undefined) {
      return false
    }

    return await this.createThreadMessage(message, account, socialId, text, files)
  }

  async getFiles (_id: Ref<ActivityMessage>): Promise<PlatformFileInfo[]> {
    const attachments = await this.client.findAll(attachment.class.Attachment, { attachedTo: _id })
    const res: PlatformFileInfo[] = []
    for (const attachment of attachments) {
      if (attachment.type === 'application/link-preview') continue
      const chunks: Buffer[] = await this.storage.read(this.ctx, this.workspace as any, attachment.file)
      const uint8Chunks: Uint8Array[] = chunks.map((chunk) => new Uint8Array(chunk))
      const buffer = Buffer.concat(uint8Chunks)
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

  async getChannels (account: AccountUuid, onlyStarred: boolean): Promise<ChunterSpace[]> {
    if (!onlyStarred) {
      return await this.client.findAll(chunter.class.ChunterSpace, {
        members: account
      })
    }

    const contexts = await this.client.findAll(notification.class.DocNotifyContext, {
      objectClass: { $in: [chunter.class.Channel, chunter.class.DirectMessage] },
      isPinned: true,
      user: account
    })

    if (contexts.length === 0) {
      return []
    }

    return await this.client.findAll(chunter.class.ChunterSpace, {
      _id: { $in: contexts.map((context) => context.objectId as Ref<ChunterSpace>) },
      members: account
    })
  }

  async getPersons (_ids: AccountUuid[]): Promise<Person[]> {
    return (await this.client.findAll(contact.class.Person, { personUuid: { $in: _ids } })) as Person[]
  }

  async sendMessage (
    channel: ChannelRecord,
    account: AccountUuid,
    socialId: PersonId,
    text: Markup,
    file?: TelegramFileInfo
  ): Promise<Ref<ChatMessage> | undefined> {
    const doc = await this.client.findOne(channel._class, { _id: channel._id, members: account })

    if (doc === undefined) {
      return undefined
    }

    const txFactory = new TxFactory(socialId)
    const messageId = generateId<ChatMessage>()
    const attachments = await this.createAttachments(
      txFactory,
      messageId,
      chunter.class.ChatMessage,
      channel._id,
      file !== undefined ? [file] : []
    )

    if (attachments === 0 && isEmptyMarkup(text)) {
      return undefined
    }

    const collectionTx = txFactory.createTxCollectionCUD(
      channel._class,
      channel._id,
      channel._id,
      'messages',
      txFactory.createTxCreateDoc(
        chunter.class.ChatMessage,
        channel._id,
        {
          message: text,
          attachments,
          attachedTo: channel._id,
          attachedToClass: channel._class,
          collection: 'messages',
          provider: contact.channelProvider.Telegram
        },
        messageId
      )
    )

    await this.client.tx(collectionTx)

    return messageId
  }
}
