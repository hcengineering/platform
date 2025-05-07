//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License. You may
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
  type Collaborator,
  type FindCollaboratorsParams,
  type FindLabelsParams,
  type FindMessagesGroupsParams,
  type FindMessagesParams,
  type FindNotificationContextParams,
  type FindNotificationsParams,
  type Label,
  type Message,
  type MessagesGroup,
  type Notification,
  type NotificationContext,
  type Patch,
  type Reaction
} from '@hcengineering/communication-types'
import {
  type AddCollaboratorsEvent,
  type CreateFileEvent,
  type CreateLabelEvent,
  type CreateMessageEvent,
  type CreateMessageResult,
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
  LabelRequestEventType,
  LabelResponseEventType,
  type MessageCreatedEvent,
  MessageRequestEventType,
  MessageResponseEventType,
  type MessagesGroupCreatedEvent,
  type MessagesRemovedEvent,
  type NotificationContextCreatedEvent,
  type NotificationContextRemovedEvent,
  type NotificationContextUpdatedEvent,
  NotificationRequestEventType,
  NotificationResponseEventType,
  type NotificationsRemovedEvent,
  type PatchCreatedEvent,
  type ReactionCreatedEvent,
  type ReactionRemovedEvent,
  type RemoveCollaboratorsEvent,
  type RemoveFileEvent,
  type RemoveLabelEvent,
  type RemoveMessagesEvent,
  type RemoveMessagesGroupEvent,
  type RemoveMessagesResult,
  type RemoveNotificationContextEvent,
  type RemoveNotificationsEvent,
  type RemoveReactionEvent,
  type RequestEvent,
  type ResponseEvent,
  type SessionData,
  type ThreadCreatedEvent,
  type UpdateNotificationContextEvent,
  type UpdateThreadEvent
} from '@hcengineering/communication-sdk-types'
import { systemAccountUuid } from '@hcengineering/core'

import type { Middleware, MiddlewareContext } from '../types'
import { BaseMiddleware } from './base'

interface Result {
  responseEvent?: ResponseEvent
  result?: EventResult
}

export class DatabaseMiddleware extends BaseMiddleware implements Middleware {
  constructor(
    private readonly db: DbAdapter,
    readonly context: MiddlewareContext,
    next?: Middleware
  ) {
    super(context, next)
  }

  async findMessages(_: SessionData, params: FindMessagesParams): Promise<Message[]> {
    return await this.db.findMessages(params)
  }

  async findMessagesGroups(_: SessionData, params: FindMessagesGroupsParams): Promise<MessagesGroup[]> {
    return await this.db.findMessagesGroups(params)
  }

  async findNotificationContexts(
    _: SessionData,
    params: FindNotificationContextParams
  ): Promise<NotificationContext[]> {
    return await this.db.findNotificationContexts(params)
  }

  async findNotifications(_: SessionData, params: FindNotificationsParams): Promise<Notification[]> {
    return await this.db.findNotifications(params)
  }

  async findLabels(_: SessionData, params: FindLabelsParams): Promise<Label[]> {
    return await this.db.findLabels(params)
  }

  async findCollaborators(_: SessionData, params: FindCollaboratorsParams): Promise<Collaborator[]> {
    return await this.db.findCollaborators(params)
  }

  async event(session: SessionData, event: RequestEvent, derived: boolean): Promise<EventResult> {
    const result = await this.processEvent(session, event)
    if (result.responseEvent) {
      void this.context.head?.response(session, result.responseEvent, derived)
    }

    return result.result ?? {}
  }

  private async processEvent(session: SessionData, event: RequestEvent): Promise<Result> {
    switch (event.type) {
      case MessageRequestEventType.CreateMessage:
        return await this.createMessage(event)
      case MessageRequestEventType.RemoveMessages:
        return await this.removeMessages(event, session)
      case MessageRequestEventType.CreatePatch:
        return await this.createPatch(event)
      case MessageRequestEventType.CreateReaction:
        return await this.createReaction(event)
      case MessageRequestEventType.RemoveReaction:
        return await this.removeReaction(event)
      case MessageRequestEventType.CreateFile:
        return await this.createFile(event)
      case MessageRequestEventType.RemoveFile:
        return await this.removeFile(event)
      case NotificationRequestEventType.CreateNotification:
        return await this.createNotification(event)
      case NotificationRequestEventType.RemoveNotifications:
        return await this.removeNotifications(event)
      case NotificationRequestEventType.CreateNotificationContext:
        return await this.createNotificationContext(event)
      case NotificationRequestEventType.RemoveNotificationContext:
        return await this.removeNotificationContext(event)
      case NotificationRequestEventType.UpdateNotificationContext:
        return await this.updateNotificationContext(event)
      case MessageRequestEventType.CreateMessagesGroup:
        return await this.createMessagesGroup(event)
      case MessageRequestEventType.CreateThread:
        return await this.createThread(event)
      case MessageRequestEventType.RemoveMessagesGroup:
        return await this.removeMessagesGroup(event)
      case NotificationRequestEventType.AddCollaborators:
        return await this.addCollaborators(event)
      case NotificationRequestEventType.RemoveCollaborators:
        return await this.removeCollaborators(event)
      case MessageRequestEventType.UpdateThread:
        return await this.updateThread(event)
      case LabelRequestEventType.CreateLabel:
        return await this.createLabel(event)
      case LabelRequestEventType.RemoveLabel:
        return await this.removeLabel(event)
    }
  }

  private async updateThread(event: UpdateThreadEvent): Promise<Result> {
    await this.db.updateThread(event.thread, event.replies, event.lastReply)
    return {
      responseEvent: {
        _id: event._id,
        type: MessageResponseEventType.ThreadUpdated,
        thread: event.thread,
        replies: event.replies,
        lastReply: event.lastReply
      }
    }
  }

  private async addCollaborators(event: AddCollaboratorsEvent): Promise<Result> {
    const added = await this.db.addCollaborators(event.card, event.cardType, event.collaborators, event.date)
    if (added.length === 0) return {}
    return {
      responseEvent: {
        _id: event._id,
        type: NotificationResponseEventType.AddedCollaborators,
        card: event.card,
        cardType: event.cardType,
        collaborators: added
      }
    }
  }

  private async removeCollaborators(event: RemoveCollaboratorsEvent): Promise<Result> {
    await this.db.removeCollaborators(event.card, event.collaborators)

    return {
      responseEvent: {
        _id: event._id,
        type: NotificationResponseEventType.RemovedCollaborators,
        card: event.card,
        collaborators: event.collaborators
      }
    }
  }

  private async createMessage(event: CreateMessageEvent): Promise<Result> {
    const created = event.created ?? new Date()
    const id = await this.db.createMessage(
      event.card,
      event.messageType,
      event.content,
      event.creator,
      created,
      event.data,
      event.externalId,
      event.id
    )
    const message: Message = {
      id,
      type: event.messageType,
      card: event.card,
      content: event.content,
      creator: event.creator,
      created,
      data: event.data,
      externalId: event.externalId,
      reactions: [],
      files: []
    }
    const responseEvent: MessageCreatedEvent = {
      _id: event._id,
      type: MessageResponseEventType.MessageCreated,
      cardType: event.cardType,
      message
    }
    const result: CreateMessageResult = {
      id,
      created
    }
    return {
      responseEvent,
      result
    }
  }

  private async createPatch(event: CreatePatchEvent): Promise<Result> {
    const created = new Date()
    await this.db.createPatch(
      event.card,
      event.message,
      event.messageCreated,
      event.patchType,
      event.data,
      event.creator,
      created
    )

    const patch = {
      type: event.patchType,
      messageCreated: event.messageCreated,
      message: event.message,
      data: event.data,
      creator: event.creator,
      created
    } as Patch
    const responseEvent: PatchCreatedEvent = {
      _id: event._id,
      type: MessageResponseEventType.PatchCreated,
      card: event.card,
      patch
    }
    return {
      responseEvent
    }
  }

  private async removeMessages(event: RemoveMessagesEvent, session: SessionData): Promise<Result> {
    const account = session.account
    const socialIds = systemAccountUuid === account.uuid ? undefined : account.socialIds
    const deleted = await this.db.removeMessages(event.card, event.messages, socialIds)

    const responseEvent: MessagesRemovedEvent = {
      _id: event._id,
      type: MessageResponseEventType.MessagesRemoved,
      card: event.card,
      messages: deleted
    }
    const result: RemoveMessagesResult = {
      messages: deleted
    }

    return {
      responseEvent,
      result
    }
  }

  private async createReaction(event: CreateReactionEvent): Promise<Result> {
    const created = new Date()
    await this.db.createReaction(
      event.card,
      event.message,
      event.messageCreated,
      event.reaction,
      event.creator,
      created
    )

    const reaction: Reaction = {
      message: event.message,
      reaction: event.reaction,
      creator: event.creator,
      created
    }
    const responseEvent: ReactionCreatedEvent = {
      _id: event._id,
      type: MessageResponseEventType.ReactionCreated,
      card: event.card,
      reaction
    }
    return {
      responseEvent
    }
  }

  private async removeReaction(event: RemoveReactionEvent): Promise<Result> {
    await this.db.removeReaction(event.card, event.message, event.messageCreated, event.reaction, event.creator)
    const responseEvent: ReactionRemovedEvent = {
      _id: event._id,
      type: MessageResponseEventType.ReactionRemoved,
      card: event.card,
      message: event.message,
      reaction: event.reaction,
      creator: event.creator
    }
    return {
      responseEvent
    }
  }

  private async createFile(event: CreateFileEvent): Promise<Result> {
    const created = new Date()
    await this.db.createFile(
      event.card,
      event.message,
      event.messageCreated,
      event.blobId,
      event.fileType,
      event.filename,
      event.size,
      event.creator,
      created
    )
    const responseEvent: FileCreatedEvent = {
      _id: event._id,
      type: MessageResponseEventType.FileCreated,
      card: event.card,
      file: {
        card: event.card,
        message: event.message,
        messageCreated: event.messageCreated,
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

  private async removeFile(event: RemoveFileEvent): Promise<Result> {
    await this.db.removeFile(event.card, event.message, event.blobId)
    const responseEvent: FileRemovedEvent = {
      _id: event._id,
      type: MessageResponseEventType.FileRemoved,
      card: event.card,
      message: event.message,
      messageCreated: event.messageCreated,
      blobId: event.blobId,
      creator: event.creator
    }
    return {
      responseEvent
    }
  }

  private async createNotification(event: CreateNotificationEvent): Promise<Result> {
    const id = await this.db.createNotification(event.context, event.message, event.created)

    return {
      responseEvent: {
        _id: event._id,
        type: NotificationResponseEventType.NotificationCreated,
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

  private async removeNotifications(event: RemoveNotificationsEvent): Promise<Result> {
    await this.db.removeNotification(event.context, event.account, event.untilDate)

    const responseEvent: NotificationsRemovedEvent = {
      _id: event._id,
      type: NotificationResponseEventType.NotificationsRemoved,
      context: event.context,
      account: event.account,
      untilDate: event.untilDate
    }
    return {
      responseEvent
    }
  }

  private async createNotificationContext(event: CreateNotificationContextEvent): Promise<Result> {
    const id = await this.db.createContext(event.account, event.card, event.lastUpdate, event.lastView)
    const responseEvent: NotificationContextCreatedEvent = {
      _id: event._id,
      type: NotificationResponseEventType.NotificationContextCreated,
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

  private async removeNotificationContext(event: RemoveNotificationContextEvent): Promise<Result> {
    await this.db.removeContext(event.context, event.account)
    const responseEvent: NotificationContextRemovedEvent = {
      _id: event._id,
      type: NotificationResponseEventType.NotificationContextRemoved,
      context: event.context,
      account: event.account
    }
    return {
      responseEvent
    }
  }

  async updateNotificationContext(event: UpdateNotificationContextEvent): Promise<Result> {
    await this.db.updateContext(event.context, event.account, event.lastUpdate, event.lastView)

    const responseEvent: NotificationContextUpdatedEvent = {
      _id: event._id,
      type: NotificationResponseEventType.NotificationContextUpdated,
      context: event.context,
      account: event.account,
      lastView: event.lastView,
      lastUpdate: event.lastUpdate
    }
    return {
      responseEvent
    }
  }

  async createMessagesGroup(event: CreateMessagesGroupEvent): Promise<Result> {
    const { fromDate, toDate, count, card, blobId } = event.group
    await this.db.createMessagesGroup(card, blobId, fromDate, toDate, count)

    const responseEvent: MessagesGroupCreatedEvent = {
      _id: event._id,
      type: MessageResponseEventType.MessagesGroupCreated,
      group: {
        card,
        blobId,
        fromDate,
        toDate,
        count
      }
    }
    return {
      responseEvent
    }
  }

  async removeMessagesGroup(event: RemoveMessagesGroupEvent): Promise<Result> {
    await this.db.removeMessagesGroup(event.card, event.blobId)

    return {}
  }

  private async createThread(event: CreateThreadEvent): Promise<Result> {
    const date = new Date()
    await this.db.createThread(event.card, event.message, event.messageCreated, event.thread, event.threadType, date)
    const responseEvent: ThreadCreatedEvent = {
      _id: event._id,
      type: MessageResponseEventType.ThreadCreated,
      thread: {
        card: event.card,
        thread: event.thread,
        threadType: event.threadType,
        message: event.message,
        messageCreated: event.messageCreated,
        repliesCount: 0,
        lastReply: date
      }
    }
    return {
      responseEvent
    }
  }

  private async createLabel(event: CreateLabelEvent): Promise<Result> {
    const created = new Date()
    await this.db.createLabel(event.label, event.card, event.cardType, event.account, created)
    return {
      responseEvent: {
        _id: event._id,
        type: LabelResponseEventType.LabelCreated,
        label: {
          label: event.label,
          card: event.card,
          cardType: event.cardType,
          account: event.account,
          created
        }
      }
    }
  }

  private async removeLabel(event: RemoveLabelEvent): Promise<Result> {
    await this.db.removeLabel(event.label, event.card, event.account)
    return {
      responseEvent: {
        _id: event._id,
        type: LabelResponseEventType.LabelRemoved,
        label: event.label,
        card: event.card,
        account: event.account
      }
    }
  }

  close(): void {
    this.db.close()
  }
}
