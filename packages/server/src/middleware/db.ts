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
  CardRequestEventType,
  CardResponseEventType,
  type CreateFileEvent,
  type CreateLabelEvent,
  type CreateLinkPreviewEvent,
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
  LabelRequestEventType,
  LabelResponseEventType,
  type LinkPreviewCreatedEvent,
  type LinkPreviewRemovedEvent,
  type MessageCreatedEvent,
  MessageRequestEventType,
  MessageResponseEventType,
  type MessagesGroupCreatedEvent,
  type NotificationContextCreatedEvent,
  type NotificationContextRemovedEvent,
  type NotificationContextUpdatedEvent,
  NotificationRequestEventType,
  NotificationResponseEventType,
  type NotificationsRemovedEvent,
  type NotificationUpdatedEvent,
  type PatchCreatedEvent,
  type ReactionCreatedEvent,
  type ReactionRemovedEvent,
  type RemoveCardEvent,
  type RemoveCollaboratorsEvent,
  type RemoveFileEvent,
  type RemoveLabelEvent,
  type RemoveLinkPreviewEvent,
  type RemoveMessagesGroupEvent,
  type RemoveNotificationContextEvent,
  type RemoveNotificationsEvent,
  type RemoveReactionEvent,
  type RequestEvent,
  type ResponseEvent,
  type SessionData,
  type ThreadCreatedEvent,
  type UpdateCardTypeEvent,
  type UpdateNotificationContextEvent,
  type UpdateNotificationEvent,
  type UpdateThreadEvent
} from '@hcengineering/communication-sdk-types'

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
      case NotificationRequestEventType.UpdateNotification:
        return await this.updateNotification(event)
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
      case CardRequestEventType.UpdateCardType:
        return await this.updateCardType(event)
      case CardRequestEventType.RemoveCard:
        return await this.removeCard(event)
      case MessageRequestEventType.CreateLinkPreview:
        return await this.createLinkPreview(event)
      case MessageRequestEventType.RemoveLinkPreview:
        return await this.removeLinkPreview(event)
    }
  }

  private async updateThread(event: UpdateThreadEvent): Promise<Result> {
    await this.db.updateThread(event.thread, event.updates)
    return {
      responseEvent: {
        _id: event._id,
        type: MessageResponseEventType.ThreadUpdated,
        card: event.card,
        message: event.message,
        thread: event.thread,
        updates: event.updates
      }
    }
  }

  private async addCollaborators(event: AddCollaboratorsEvent): Promise<Result> {
    const created = event.created ?? new Date()
    const added = await this.db.addCollaborators(event.card, event.cardType, event.collaborators, created)
    if (added.length === 0) return {}
    return {
      responseEvent: {
        _id: event._id,
        type: NotificationResponseEventType.AddedCollaborators,
        card: event.card,
        cardType: event.cardType,
        collaborators: added,
        creator: event.creator,
        created
      }
    }
  }

  private async removeCollaborators(event: RemoveCollaboratorsEvent): Promise<Result> {
    if (event.collaborators.length === 0) return {}
    const created = event.created ?? new Date()
    await this.db.removeCollaborators(event.card, { accounts: event.collaborators })

    return {
      responseEvent: {
        _id: event._id,
        type: NotificationResponseEventType.RemovedCollaborators,
        card: event.card,
        cardType: event.cardType,
        collaborators: event.collaborators,
        creator: event.creator,
        created
      }
    }
  }

  private async createMessage(event: CreateMessageEvent): Promise<Result> {
    const created = event.created ?? new Date()
    const result = await this.db.createMessage(
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
      id: result.id,
      removed: false,
      type: event.messageType,
      card: event.card,
      content: event.content,
      creator: event.creator,
      created: result.created,
      data: event.data,
      externalId: event.externalId,
      reactions: [],
      files: [],
      links: []
    }
    const responseEvent: MessageCreatedEvent = {
      _id: event._id,
      type: MessageResponseEventType.MessageCreated,
      cardType: event.cardType,
      message
    }
    return {
      responseEvent,
      result
    }
  }

  private async createPatch(event: CreatePatchEvent): Promise<Result> {
    const created = event.created ?? new Date()
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
      reaction: event.reaction,
      creator: event.creator,
      created
    }
    const responseEvent: ReactionCreatedEvent = {
      _id: event._id,
      type: MessageResponseEventType.ReactionCreated,
      card: event.card,
      message: event.message,
      messageCreated: event.messageCreated,
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
      messageCreated: event.messageCreated,
      reaction: event.reaction,
      creator: event.creator
    }
    return {
      responseEvent
    }
  }

  private async createFile(event: CreateFileEvent): Promise<Result> {
    const created = event.created ?? new Date()
    await this.db.createFile(event.card, event.message, event.messageCreated, event.data, event.creator, created)
    const responseEvent: FileCreatedEvent = {
      _id: event._id,
      type: MessageResponseEventType.FileCreated,
      card: event.card,
      message: event.message,
      messageCreated: event.messageCreated,
      file: {
        ...event.data,
        creator: event.creator,
        created
      }
    }
    return {
      responseEvent
    }
  }

  private async removeFile(event: RemoveFileEvent): Promise<Result> {
    await this.db.removeFiles(event.card, { message: event.message, blobId: event.blobId })
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

  private async createLinkPreview(event: CreateLinkPreviewEvent): Promise<Result> {
    const created = new Date()
    const id = await this.db.createLinkPreview(
      event.card,
      event.message,
      event.messageCreated,
      event.data,
      event.creator,
      created
    )

    const responseEvent: LinkPreviewCreatedEvent = {
      _id: event._id,
      type: MessageResponseEventType.LinkPreviewCreated,
      card: event.card,
      message: event.message,
      messageCreated: event.messageCreated,
      linkPreview: {
        id,
        ...event.data,
        creator: event.creator,
        created
      }
    }

    return {
      responseEvent
    }
  }

  private async removeLinkPreview(event: RemoveLinkPreviewEvent): Promise<Result> {
    await this.db.removeLinkPreview(event.card, event.message, event.id)
    const responseEvent: LinkPreviewRemovedEvent = {
      _id: event._id,
      type: MessageResponseEventType.LinkPreviewRemoved,
      card: event.card,
      message: event.message,
      messageCreated: event.messageCreated,
      id: event.id
    }

    return {
      responseEvent
    }
  }

  private async createNotification(event: CreateNotificationEvent): Promise<Result> {
    const id = await this.db.createNotification(
      event.context,
      event.message,
      event.messageCreated,
      event.notificationType,
      event.read ?? false,
      event.content,
      event.created
    )

    return {
      responseEvent: {
        _id: event._id,
        type: NotificationResponseEventType.NotificationCreated,
        notification: {
          id,
          account: event.account,
          type: event.notificationType,
          content: event.content ?? {},
          context: event.context,
          messageId: event.message,
          messageCreated: event.messageCreated,
          read: event.read ?? false,
          created: event.created
        }
      }
    }
  }

  private async updateNotification(event: UpdateNotificationEvent): Promise<Result> {
    await this.db.updateNotification(event.query, event.updates)
    const responseEvent: NotificationUpdatedEvent = {
      _id: event._id,
      type: NotificationResponseEventType.NotificationUpdated,
      query: event.query,
      updates: event.updates
    }
    return {
      responseEvent
    }
  }

  private async removeNotifications(event: RemoveNotificationsEvent): Promise<Result> {
    const ids = await this.db.removeNotifications({
      context: event.context,
      account: event.account,
      ids: event.ids
    })
    const responseEvent: NotificationsRemovedEvent = {
      _id: event._id,
      type: NotificationResponseEventType.NotificationsRemoved,
      context: event.context,
      account: event.account,
      ids
    }
    return {
      result: {
        ids
      },
      responseEvent
    }
  }

  private async createNotificationContext(event: CreateNotificationContextEvent): Promise<Result> {
    const id = await this.db.createContext(
      event.account,
      event.card,
      event.lastUpdate,
      event.lastView,
      event.lastNotify
    )
    const responseEvent: NotificationContextCreatedEvent = {
      _id: event._id,
      type: NotificationResponseEventType.NotificationContextCreated,
      context: {
        id,
        account: event.account,
        card: event.card,
        lastView: event.lastView,
        lastUpdate: event.lastUpdate,
        lastNotify: event.lastNotify
      }
    }
    return {
      responseEvent,
      result: { id }
    }
  }

  private async removeNotificationContext(event: RemoveNotificationContextEvent): Promise<Result> {
    const context = (await this.db.findNotificationContexts({ id: event.context, account: event.account }))[0]
    if (context === undefined) return {}

    await this.db.removeContexts({
      id: event.context,
      account: event.account
    })
    const responseEvent: NotificationContextRemovedEvent = {
      _id: event._id,
      type: NotificationResponseEventType.NotificationContextRemoved,
      context
    }
    return {
      responseEvent
    }
  }

  async updateNotificationContext(event: UpdateNotificationContextEvent): Promise<Result> {
    await this.db.updateContext(event.context, event.account, event.updates)

    const responseEvent: NotificationContextUpdatedEvent = {
      _id: event._id,
      type: NotificationResponseEventType.NotificationContextUpdated,
      context: event.context,
      account: event.account,
      lastView: event.updates.lastView,
      lastUpdate: event.updates.lastUpdate,
      lastNotify: event.updates.lastNotify
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
    await this.db.removeLabels({
      label: event.label,
      card: event.card,
      account: event.account
    })
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

  private async updateCardType(event: UpdateCardTypeEvent): Promise<Result> {
    return {
      responseEvent: {
        _id: event._id,
        type: CardResponseEventType.CardTypeUpdated,
        card: event.card,
        cardType: event.cardType,
        creator: event.creator,
        created: event.created ?? new Date()
      }
    }
  }

  private async removeCard(event: RemoveCardEvent): Promise<Result> {
    return {
      responseEvent: {
        _id: event._id,
        type: CardResponseEventType.CardRemoved,
        card: event.card
      }
    }
  }

  close(): void {
    this.db.close()
  }
}
