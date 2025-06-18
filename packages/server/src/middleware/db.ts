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
  Patch,
  PatchType,
  type Reaction
} from '@hcengineering/communication-types'
import {
  type AddCollaboratorsEvent,
  type AttachBlobEvent,
  type AttachThreadEvent,
  type BlobAttachedEvent,
  type BlobDetachedEvent,
  CardRequestEventType,
  CardResponseEventType,
  type CreateLabelEvent,
  type CreateLinkPreviewEvent,
  type CreateMessageEvent,
  type CreateMessagesGroupEvent,
  type CreateNotificationContextEvent,
  type CreateNotificationEvent,
  type CreatePatchEvent,
  type DbAdapter,
  type DetachBlobEvent,
  type EventResult,
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
  PatchCreatedEvent,
  type ReactionRemovedEvent,
  type ReactionSetEvent,
  type RemoveCardEvent,
  type RemoveCollaboratorsEvent,
  type RemoveLabelEvent,
  type RemoveLinkPreviewEvent,
  type RemoveMessagesGroupEvent,
  type RemoveNotificationContextEvent,
  type RemoveNotificationsEvent,
  type RemoveReactionEvent,
  type RequestEvent,
  type ResponseEvent,
  type SessionData,
  type SetReactionEvent,
  type ThreadAttachedEvent,
  type UpdateCardTypeEvent,
  type UpdateNotificationContextEvent,
  type UpdateNotificationEvent,
  type UpdateThreadEvent
} from '@hcengineering/communication-sdk-types'

import type { Enriched, Middleware, MiddlewareContext } from '../types'
import { BaseMiddleware } from './base'

interface Result {
  responseEvent?: ResponseEvent
  result?: EventResult
}

export class DatabaseMiddleware extends BaseMiddleware implements Middleware {
  constructor (
    private readonly db: DbAdapter,
    readonly context: MiddlewareContext,
    next?: Middleware
  ) {
    super(context, next)
  }

  async findMessages (_: SessionData, params: FindMessagesParams): Promise<Message[]> {
    return await this.db.findMessages(params)
  }

  async findMessagesGroups (_: SessionData, params: FindMessagesGroupsParams): Promise<MessagesGroup[]> {
    return await this.db.findMessagesGroups(params)
  }

  async findNotificationContexts (
    _: SessionData,
    params: FindNotificationContextParams
  ): Promise<NotificationContext[]> {
    return await this.db.findNotificationContexts(params)
  }

  async findNotifications (_: SessionData, params: FindNotificationsParams): Promise<Notification[]> {
    return await this.db.findNotifications(params)
  }

  async findLabels (_: SessionData, params: FindLabelsParams): Promise<Label[]> {
    return await this.db.findLabels(params)
  }

  async findCollaborators (_: SessionData, params: FindCollaboratorsParams): Promise<Collaborator[]> {
    return await this.db.findCollaborators(params)
  }

  async event (session: SessionData, event: Enriched<RequestEvent>, derived: boolean): Promise<EventResult> {
    const result = await this.processEvent(session, event)
    if (result.responseEvent != null) {
      void this.context.head?.response(session, result.responseEvent, derived)
    }

    return result.result ?? {}
  }

  private async processEvent (session: SessionData, event: Enriched<RequestEvent>): Promise<Result> {
    switch (event.type) {
      // Messages
      case MessageRequestEventType.CreateMessage:
        return await this.createMessage(event)
      case MessageRequestEventType.CreatePatch:
        return await this.createPatch(event)
      case MessageRequestEventType.SetReaction:
        return await this.setReaction(event)
      case MessageRequestEventType.RemoveReaction:
        return await this.removeReaction(event)
      case MessageRequestEventType.AttachBlob:
        return await this.attachBlob(event)
      case MessageRequestEventType.DetachBlob:
        return await this.detachBlob(event)
      case MessageRequestEventType.CreateLinkPreview:
        return await this.createLinkPreview(event)
      case MessageRequestEventType.RemoveLinkPreview:
        return await this.removeLinkPreview(event)
      case MessageRequestEventType.AttachThread:
        return await this.attachThread(event)
      case MessageRequestEventType.UpdateThread:
        return await this.updateThread(event)
      case MessageRequestEventType.CreateMessagesGroup:
        return await this.createMessagesGroup(event)
      case MessageRequestEventType.RemoveMessagesGroup:
        return await this.removeMessagesGroup(event)

      // Labels
      case LabelRequestEventType.CreateLabel:
        return await this.createLabel(event)
      case LabelRequestEventType.RemoveLabel:
        return await this.removeLabel(event)

      // Cards
      case CardRequestEventType.UpdateCardType:
        return await this.updateCardType(event)
      case CardRequestEventType.RemoveCard:
        return await this.removeCard(event)

      // Collaborators
      case NotificationRequestEventType.AddCollaborators:
        return await this.addCollaborators(event)
      case NotificationRequestEventType.RemoveCollaborators:
        return await this.removeCollaborators(event)

      // Notifications
      case NotificationRequestEventType.CreateNotification:
        return await this.createNotification(event)
      case NotificationRequestEventType.RemoveNotifications:
        return await this.removeNotifications(event)
      case NotificationRequestEventType.UpdateNotification:
        return await this.updateNotification(event)

      // Notification Contexts
      case NotificationRequestEventType.CreateNotificationContext:
        return await this.createNotificationContext(event)
      case NotificationRequestEventType.RemoveNotificationContext:
        return await this.removeNotificationContext(event)
      case NotificationRequestEventType.UpdateNotificationContext:
        return await this.updateNotificationContext(event)
    }
  }

  private async addCollaborators (event: Enriched<AddCollaboratorsEvent>): Promise<Result> {
    const added = await this.db.addCollaborators(event.cardId, event.cardType, event.collaborators, event.date)
    if (added.length === 0) return {}
    return {
      responseEvent: {
        _id: event._id,
        type: NotificationResponseEventType.AddedCollaborators,
        cardId: event.cardId,
        cardType: event.cardType,
        collaborators: added,
        socialId: event.socialId,
        date: event.date
      }
    }
  }

  private async removeCollaborators (event: Enriched<RemoveCollaboratorsEvent>): Promise<Result> {
    if (event.collaborators.length === 0) return {}
    await this.db.removeCollaborators(event.cardId, event.collaborators)

    return {
      responseEvent: {
        _id: event._id,
        type: NotificationResponseEventType.RemovedCollaborators,
        cardId: event.cardId,
        cardType: event.cardType,
        collaborators: event.collaborators,
        socialId: event.socialId,
        date: event.date
      }
    }
  }

  private async createMessage (event: Enriched<CreateMessageEvent>): Promise<Result> {
    if (event.messageId == null) {
      throw new Error('Message id is required')
    }
    if (event.date == null) {
      throw new Error('Date is required')
    }

    const created = await this.db.createMessage(
      event.messageId,
      event.cardId,
      event.messageType,
      event.content,
      event.extra,
      event.socialId,
      event.date
    )

    if (!created) {
      return {
        result: {
          messageId: event.messageId,
          created: event.date
        }
      }
    }

    const message: Message = {
      id: event.messageId,
      type: event.messageType,
      cardId: event.cardId,
      content: event.content,
      creator: event.socialId,
      created: event.date,
      extra: event.extra,

      removed: false,

      reactions: [],
      blobs: [],
      linkPreviews: []
    }
    const responseEvent: MessageCreatedEvent = {
      _id: event._id,
      type: MessageResponseEventType.MessageCreated,
      cardId: event.cardId,
      cardType: event.cardType,
      message,
      options: event.options
    }
    return {
      responseEvent,
      result: {
        messageId: event.messageId,
        created: event.date
      }
    }
  }

  private async createPatch (event: Enriched<CreatePatchEvent>): Promise<Result> {
    const messageCreated = await this.db.getMessageCreated(event.cardId, event.messageId)
    if (messageCreated == null) return {}
    await this.db.createPatch(
      event.cardId,
      event.messageId,
      messageCreated,
      event.patchType,
      event.data,
      event.socialId,
      event.date
    )

    const patch = {
      type: event.patchType,
      messageId: event.messageId,
      data: event.data,
      creator: event.socialId,
      created: event.date
    } as any as Patch

    const responseEvent: PatchCreatedEvent = {
      _id: event._id,
      type: MessageResponseEventType.PatchCreated,
      cardId: event.cardId,
      messageId: event.messageId,
      messageCreated,
      patch,
      options: event.options
    }

    return {
      responseEvent
    }
  }

  private async setReaction (event: Enriched<SetReactionEvent>): Promise<Result> {
    const inDb = await this.db.isMessageInDb(event.cardId, event.messageId)
    if (inDb) {
      await this.db.setReaction(event.cardId, event.messageId, event.reaction, event.socialId, event.date)
    } else {
      await this.createPatch({
        type: MessageRequestEventType.CreatePatch,
        cardId: event.cardId,
        messageId: event.messageId,
        patchType: PatchType.setReaction,
        data: {
          reaction: event.reaction
        },
        socialId: event.socialId,
        date: event.date
      })
    }

    const reaction: Reaction = {
      reaction: event.reaction,
      creator: event.socialId,
      created: event.date
    }
    const responseEvent: ReactionSetEvent = {
      _id: event._id,
      type: MessageResponseEventType.ReactionSet,
      cardId: event.cardId,
      messageId: event.messageId,
      reaction
    }
    return {
      responseEvent
    }
  }

  private async removeReaction (event: Enriched<RemoveReactionEvent>): Promise<Result> {
    const inDb = await this.db.isMessageInDb(event.cardId, event.messageId)
    if (inDb) {
      await this.db.removeReaction(event.cardId, event.messageId, event.reaction, event.socialId, event.date)
    } else {
      await this.createPatch({
        type: MessageRequestEventType.CreatePatch,
        cardId: event.cardId,
        messageId: event.messageId,
        patchType: PatchType.removeReaction,
        data: {
          reaction: event.reaction
        },
        socialId: event.socialId,
        date: event.date
      })
    }

    const responseEvent: ReactionRemovedEvent = {
      _id: event._id,
      type: MessageResponseEventType.ReactionRemoved,
      cardId: event.cardId,
      messageId: event.messageId,
      reaction: event.reaction,
      socialId: event.socialId,
      date: event.date
    }
    return {
      responseEvent
    }
  }

  private async attachBlob (event: Enriched<AttachBlobEvent>): Promise<Result> {
    await this.db.attachBlob(event.cardId, event.messageId, event.blobData, event.socialId, event.date)
    const responseEvent: BlobAttachedEvent = {
      _id: event._id,
      type: MessageResponseEventType.BlobAttached,
      cardId: event.cardId,
      messageId: event.messageId,
      blob: {
        ...event.blobData,
        creator: event.socialId,
        created: event.date
      }
    }
    return {
      responseEvent
    }
  }

  private async detachBlob (event: Enriched<DetachBlobEvent>): Promise<Result> {
    await this.db.detachBlob(event.cardId, event.messageId, event.blobId, event.socialId, event.date)
    const responseEvent: BlobDetachedEvent = {
      _id: event._id,
      type: MessageResponseEventType.BlobDetached,
      cardId: event.cardId,
      messageId: event.messageId,
      blobId: event.blobId,
      socialId: event.socialId,
      date: event.date
    }
    return {
      responseEvent
    }
  }

  private async createLinkPreview (event: Enriched<CreateLinkPreviewEvent>): Promise<Result> {
    const id = await this.db.createLinkPreview(
      event.cardId,
      event.messageId,
      event.previewData,
      event.socialId,
      event.date
    )

    const responseEvent: LinkPreviewCreatedEvent = {
      _id: event._id,
      type: MessageResponseEventType.LinkPreviewCreated,
      cardId: event.cardId,
      messageId: event.messageId,
      linkPreview: {
        ...event.previewData,
        id,
        creator: event.socialId,
        created: event.date
      }
    }

    return {
      responseEvent,
      result: {
        previewId: id,
        created: event.date
      }
    }
  }

  private async removeLinkPreview (event: Enriched<RemoveLinkPreviewEvent>): Promise<Result> {
    await this.db.removeLinkPreview(event.cardId, event.messageId, event.previewId)
    const responseEvent: LinkPreviewRemovedEvent = {
      _id: event._id,
      type: MessageResponseEventType.LinkPreviewRemoved,
      cardId: event.cardId,
      messageId: event.messageId,
      previewId: event.previewId
    }

    return {
      responseEvent
    }
  }

  private async createNotification (event: Enriched<CreateNotificationEvent>): Promise<Result> {
    const id = await this.db.createNotification(
      event.contextId,
      event.messageId,
      event.messageCreated,
      event.notificationType,
      event.read ?? false,
      event.content,
      event.date
    )

    return {
      responseEvent: {
        _id: event._id,
        type: NotificationResponseEventType.NotificationCreated,
        notification: {
          id,
          cardId: event.cardId,
          account: event.account,
          type: event.notificationType,
          content: event.content ?? {},
          contextId: event.contextId,
          messageId: event.messageId,
          messageCreated: event.messageCreated,
          read: event.read ?? false,
          created: event.date
        }
      }
    }
  }

  private async updateNotification (event: UpdateNotificationEvent): Promise<Result> {
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

  private async removeNotifications (event: RemoveNotificationsEvent): Promise<Result> {
    if (event.ids.length === 0) return {}
    const ids = await this.db.removeNotifications(event.contextId, event.account, event.ids)
    const responseEvent: NotificationsRemovedEvent = {
      _id: event._id,
      type: NotificationResponseEventType.NotificationsRemoved,
      contextId: event.contextId,
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

  private async createNotificationContext (event: Enriched<CreateNotificationContextEvent>): Promise<Result> {
    const id = await this.db.createContext(
      event.account,
      event.cardId,
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
        cardId: event.cardId,
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

  private async removeNotificationContext (event: RemoveNotificationContextEvent): Promise<Result> {
    const context = (await this.db.findNotificationContexts({ id: event.contextId, account: event.account }))[0]
    if (context === undefined) return {}

    await this.db.removeContext(event.contextId, event.account)
    const responseEvent: NotificationContextRemovedEvent = {
      _id: event._id,
      type: NotificationResponseEventType.NotificationContextRemoved,
      context
    }
    return {
      responseEvent
    }
  }

  async updateNotificationContext (event: UpdateNotificationContextEvent): Promise<Result> {
    await this.db.updateContext(event.contextId, event.account, event.updates)

    const responseEvent: NotificationContextUpdatedEvent = {
      _id: event._id,
      type: NotificationResponseEventType.NotificationContextUpdated,
      contextId: event.contextId,
      account: event.account,
      lastView: event.updates.lastView,
      lastUpdate: event.updates.lastUpdate,
      lastNotify: event.updates.lastNotify
    }
    return {
      responseEvent
    }
  }

  async createMessagesGroup (event: Enriched<CreateMessagesGroupEvent>): Promise<Result> {
    const { fromDate, toDate, count, cardId, blobId } = event.group
    await this.db.createMessagesGroup(cardId, blobId, fromDate, toDate, count)

    const responseEvent: MessagesGroupCreatedEvent = {
      _id: event._id,
      type: MessageResponseEventType.MessagesGroupCreated,
      group: {
        cardId,
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

  async removeMessagesGroup (event: Enriched<RemoveMessagesGroupEvent>): Promise<Result> {
    await this.db.removeMessagesGroup(event.cardId, event.blobId)

    return {
      responseEvent: {
        _id: event._id,
        type: MessageResponseEventType.MessagesGroupRemoved,
        cardId: event.cardId,
        blobId: event.blobId
      }
    }
  }

  private async attachThread (event: Enriched<AttachThreadEvent>): Promise<Result> {
    await this.db.attachThread(event.cardId, event.messageId, event.threadId, event.threadType, event.date)
    const responseEvent: ThreadAttachedEvent = {
      _id: event._id,
      type: MessageResponseEventType.ThreadAttached,
      cardId: event.cardId,
      messageId: event.messageId,
      thread: {
        cardId: event.cardId,
        messageId: event.messageId,
        threadId: event.threadId,
        threadType: event.threadType,
        repliesCount: 0,
        lastReply: event.date
      }
    }
    return {
      responseEvent
    }
  }

  private async updateThread (event: Enriched<UpdateThreadEvent>): Promise<Result> {
    await this.db.updateThread(event.threadId, event.updates)
    return {
      responseEvent: {
        _id: event._id,
        type: MessageResponseEventType.ThreadUpdated,
        cardId: event.cardId,
        messageId: event.messageId,
        threadId: event.threadId,
        updates: event.updates
      }
    }
  }

  private async createLabel (event: Enriched<CreateLabelEvent>): Promise<Result> {
    await this.db.createLabel(event.labelId, event.cardId, event.cardType, event.account, event.date)

    return {
      responseEvent: {
        _id: event._id,
        type: LabelResponseEventType.LabelCreated,
        label: {
          labelId: event.labelId,
          cardId: event.cardId,
          cardType: event.cardType,
          account: event.account,
          created: event.date
        }
      }
    }
  }

  private async removeLabel (event: Enriched<RemoveLabelEvent>): Promise<Result> {
    await this.db.removeLabels({
      labelId: event.labelId,
      cardId: event.cardId,
      account: event.account
    })
    return {
      responseEvent: {
        _id: event._id,
        type: LabelResponseEventType.LabelRemoved,
        labelId: event.labelId,
        cardId: event.cardId,
        account: event.account
      }
    }
  }

  private async updateCardType (event: UpdateCardTypeEvent): Promise<Result> {
    return {
      responseEvent: {
        _id: event._id,
        type: CardResponseEventType.CardTypeUpdated,
        cardId: event.cardId,
        cardType: event.cardType,
        socialId: event.socialId,
        date: event.date
      }
    }
  }

  private async removeCard (event: RemoveCardEvent): Promise<Result> {
    return {
      responseEvent: {
        _id: event._id,
        type: CardResponseEventType.CardRemoved,
        cardId: event.cardId,
        socialId: event.socialId,
        date: event.date
      }
    }
  }

  close (): void {
    this.db.close()
  }
}
