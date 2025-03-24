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

import { type Message, type Patch, type Reaction } from '@hcengineering/communication-types'
import {
  type AddCollaboratorsEvent,
  type ConnectionInfo,
  type CreateFileEvent,
  type CreateMessageEvent,
  type CreateMessagesGroupEvent,
  type CreateNotificationContextEvent,
  type CreateNotificationEvent,
  type CreatePatchEvent,
  type CreateReactionEvent,
  type CreateThreadEvent,
  type DbAdapter,
  type EventResult,
  type FileCreatedEvent,
  type FileRemovedEvent,
  type MessageCreatedEvent,
  type MessagesGroupCreatedEvent,
  type MessagesRemovedEvent,
  type NotificationContextCreatedEvent,
  type NotificationContextRemovedEvent,
  type NotificationContextUpdatedEvent,
  type NotificationsRemovedEvent,
  type PatchCreatedEvent,
  type ReactionCreatedEvent,
  type ReactionRemovedEvent,
  type RemoveCollaboratorsEvent,
  type RemoveFileEvent,
  type RemoveMessagesEvent,
  type RemoveMessagesGroupEvent,
  type RemoveNotificationContextEvent,
  type RemoveNotificationsEvent,
  type RemoveReactionEvent,
  type RequestEvent,
  RequestEventType,
  type ResponseEvent,
  ResponseEventType,
  type ThreadCreatedEvent,
  type UpdateNotificationContextEvent,
  type UpdateThreadEvent
} from '@hcengineering/communication-sdk-types'
import { systemAccountUuid } from '@hcengineering/core'

export interface Result {
  responseEvent?: ResponseEvent
  result?: EventResult
}

export class EventProcessor {
  constructor(private readonly db: DbAdapter) {}

  async process(info: ConnectionInfo, event: RequestEvent): Promise<Result> {
    switch (event.type) {
      case RequestEventType.CreateMessage:
        return await this.createMessage(event, info)
      case RequestEventType.RemoveMessages:
        return await this.removeMessages(event, info)
      case RequestEventType.CreatePatch:
        return await this.createPatch(event, info)
      case RequestEventType.CreateReaction:
        return await this.createReaction(event, info)
      case RequestEventType.RemoveReaction:
        return await this.removeReaction(event, info)
      case RequestEventType.CreateFile:
        return await this.createFile(event, info)
      case RequestEventType.RemoveFile:
        return await this.removeFile(event, info)
      case RequestEventType.CreateNotification:
        return await this.createNotification(event, info)
      case RequestEventType.RemoveNotifications:
        return await this.removeNotifications(event, info)
      case RequestEventType.CreateNotificationContext:
        return await this.createNotificationContext(event, info)
      case RequestEventType.RemoveNotificationContext:
        return await this.removeNotificationContext(event, info)
      case RequestEventType.UpdateNotificationContext:
        return await this.updateNotificationContext(event, info)
      case RequestEventType.CreateMessagesGroup:
        return await this.createMessagesGroup(event, info)
      case RequestEventType.CreateThread:
        return await this.createThread(event, info)
      case RequestEventType.RemoveMessagesGroup:
        return await this.removeMessagesGroup(event, info)
      case RequestEventType.AddCollaborators:
        return await this.addCollaborators(event, info)
      case RequestEventType.RemoveCollaborators:
        return await this.removeCollaborators(event, info)
      case RequestEventType.UpdateThread:
        return await this.updateThread(event, info)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async updateThread(event: UpdateThreadEvent, _: ConnectionInfo): Promise<Result> {
    await this.db.updateThread(event.thread, event.replies, event.lastReply)
    return {
      responseEvent: {
        _id: event._id,
        type: ResponseEventType.ThreadUpdated,
        thread: event.thread,
        replies: event.replies,
        lastReply: event.lastReply
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async addCollaborators(event: AddCollaboratorsEvent, _: ConnectionInfo): Promise<Result> {
    await this.db.addCollaborators(event.card, event.collaborators, event.date)
    return {
      responseEvent: {
        _id: event._id,
        type: ResponseEventType.AddedCollaborators,
        card: event.card,
        collaborators: event.collaborators
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async removeCollaborators(event: RemoveCollaboratorsEvent, _: ConnectionInfo): Promise<Result> {
    await this.db.removeCollaborators(event.card, event.collaborators)

    return {
      responseEvent: {
        _id: event._id,
        type: ResponseEventType.RemovedCollaborators,
        card: event.card,
        collaborators: event.collaborators
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async createMessage(event: CreateMessageEvent, _: ConnectionInfo): Promise<Result> {
    const created = new Date()
    const id = await this.db.createMessage(
      event.card,
      event.messageType,
      event.content,
      event.creator,
      created,
      event.data
    )
    const message: Message = {
      id,
      type: event.messageType,
      card: event.card,
      content: event.content,
      creator: event.creator,
      created,
      data: event.data,
      reactions: [],
      files: []
    }
    const responseEvent: MessageCreatedEvent = {
      _id: event._id,
      type: ResponseEventType.MessageCreated,
      message
    }
    return {
      responseEvent,
      result: { id }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async createPatch(event: CreatePatchEvent, _: ConnectionInfo): Promise<Result> {
    const created = new Date()
    await this.db.createPatch(event.card, event.message, event.patchType, event.content, event.creator, created)

    const patch: Patch = {
      type: event.patchType,
      message: event.message,
      content: event.content,
      creator: event.creator,
      created
    }
    const responseEvent: PatchCreatedEvent = {
      _id: event._id,
      type: ResponseEventType.PatchCreated,
      card: event.card,
      patch
    }
    return {
      responseEvent
    }
  }

  private async removeMessages(event: RemoveMessagesEvent, info: ConnectionInfo): Promise<Result> {
    const socialIds = systemAccountUuid === info.account.uuid ? undefined : info.account.socialIds
    const deleted = await this.db.removeMessages(event.card, event.messages, socialIds)

    const responseEvent: MessagesRemovedEvent = {
      _id: event._id,
      type: ResponseEventType.MessagesRemoved,
      card: event.card,
      messages: deleted
    }

    return {
      responseEvent,
      result: { messages: deleted }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async createReaction(event: CreateReactionEvent, _: ConnectionInfo): Promise<Result> {
    const created = new Date()
    await this.db.createReaction(event.card, event.message, event.reaction, event.creator, created)

    const reaction: Reaction = {
      message: event.message,
      reaction: event.reaction,
      creator: event.creator,
      created
    }
    const responseEvent: ReactionCreatedEvent = {
      _id: event._id,
      type: ResponseEventType.ReactionCreated,
      card: event.card,
      reaction
    }
    return {
      responseEvent
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async removeReaction(event: RemoveReactionEvent, _: ConnectionInfo): Promise<Result> {
    await this.db.removeReaction(event.card, event.message, event.reaction, event.creator)
    const responseEvent: ReactionRemovedEvent = {
      _id: event._id,
      type: ResponseEventType.ReactionRemoved,
      card: event.card,
      message: event.message,
      reaction: event.reaction,
      creator: event.creator
    }
    return {
      responseEvent
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async createFile(event: CreateFileEvent, _: ConnectionInfo): Promise<Result> {
    const created = new Date()
    await this.db.createFile(
      event.card,
      event.message,
      event.blobId,
      event.fileType,
      event.filename,
      event.size,
      event.creator,
      created
    )
    const responseEvent: FileCreatedEvent = {
      _id: event._id,
      type: ResponseEventType.FileCreated,
      card: event.card,
      file: {
        card: event.card,
        message: event.message,
        blobId: event.blobId,
        type: event.fileType,
        filename: event.filename,
        size: event.size,
        creator: event.creator,
        created
      }
    }
    return {
      responseEvent
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async removeFile(event: RemoveFileEvent, _: ConnectionInfo): Promise<Result> {
    await this.db.removeFile(event.card, event.message, event.blobId)
    const responseEvent: FileRemovedEvent = {
      _id: event._id,
      type: ResponseEventType.FileRemoved,
      card: event.card,
      message: event.message,
      blobId: event.blobId,
      creator: event.creator
    }
    return {
      responseEvent
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async createNotification(event: CreateNotificationEvent, _: ConnectionInfo): Promise<Result> {
    const id = await this.db.createNotification(event.context, event.message, event.created)

    return {
      responseEvent: {
        _id: event._id,
        type: ResponseEventType.NotificationCreated,
        notification: {
          id,
          context: event.context,
          messageId: event.message,
          read: false,
          created: event.created
        },
        account: event.account
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async removeNotifications(event: RemoveNotificationsEvent, _: ConnectionInfo): Promise<Result> {
    await this.db.removeNotification(event.context, event.account, event.untilDate)

    const responseEvent: NotificationsRemovedEvent = {
      _id: event._id,
      type: ResponseEventType.NotificationsRemoved,
      context: event.context,
      account: event.account,
      untilDate: event.untilDate
    }
    return {
      responseEvent
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async createNotificationContext(event: CreateNotificationContextEvent, _: ConnectionInfo): Promise<Result> {
    const id = await this.db.createContext(event.account, event.card, event.lastUpdate, event.lastView)
    const responseEvent: NotificationContextCreatedEvent = {
      _id: event._id,
      type: ResponseEventType.NotificationContextCreated,
      context: {
        id,
        account: event.account,
        card: event.card,
        lastView: event.lastView,
        lastUpdate: event.lastUpdate
      }
    }
    return {
      responseEvent,
      result: { id }
    }
  }

  private async removeNotificationContext(
    event: RemoveNotificationContextEvent,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _: ConnectionInfo
  ): Promise<Result> {
    await this.db.removeContext(event.context, event.account)
    const responseEvent: NotificationContextRemovedEvent = {
      _id: event._id,
      type: ResponseEventType.NotificationContextRemoved,
      context: event.context,
      account: event.account
    }
    return {
      responseEvent
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async updateNotificationContext(event: UpdateNotificationContextEvent, _: ConnectionInfo): Promise<Result> {
    await this.db.updateContext(event.context, event.account, event.lastUpdate, event.lastView)

    const responseEvent: NotificationContextUpdatedEvent = {
      _id: event._id,
      type: ResponseEventType.NotificationContextUpdated,
      context: event.context,
      account: event.account,
      lastView: event.lastView,
      lastUpdate: event.lastUpdate
    }
    return {
      responseEvent
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async createMessagesGroup(event: CreateMessagesGroupEvent, _: ConnectionInfo): Promise<Result> {
    const { fromSec, toSec, count, card, blobId } = event.group
    await this.db.createMessagesGroup(card, blobId, fromSec, toSec, count)

    const responseEvent: MessagesGroupCreatedEvent = {
      _id: event._id,
      type: ResponseEventType.MessagesGroupCreated,
      group: {
        card,
        blobId,
        fromSec,
        toSec,
        count
      }
    }
    return {
      responseEvent
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async removeMessagesGroup(event: RemoveMessagesGroupEvent, _: ConnectionInfo): Promise<Result> {
    await this.db.removeMessagesGroup(event.card, event.blobId)

    return {}
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async createThread(event: CreateThreadEvent, _: ConnectionInfo): Promise<Result> {
    const date = new Date()
    await this.db.createThread(event.card, event.message, event.thread, date)
    const responseEvent: ThreadCreatedEvent = {
      _id: event._id,
      type: ResponseEventType.ThreadCreated,
      thread: {
        card: event.card,
        thread: event.thread,
        message: event.message,
        repliesCount: 0,
        lastReply: date
      }
    }
    return {
      responseEvent
    }
  }
}
