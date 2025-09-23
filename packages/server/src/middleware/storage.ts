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
  Attachment,
  AttachmentID,
  type Collaborator,
  type FindCollaboratorsParams,
  type FindLabelsParams,
  type FindNotificationContextParams,
  type FindNotificationsParams,
  FindPeersParams,
  FindThreadMetaParams,
  type Label,
  type Notification,
  type NotificationContext,
  Peer,
  Thread,
  ThreadMeta,
  FindMessagesMetaParams,
  MessageMeta,
  FindMessagesGroupParams,
  MessagesGroup
} from '@hcengineering/communication-types'
import {
  type AddCollaboratorsEvent,
  AttachmentPatchEvent,
  BlobPatchEvent,
  CardEventType,
  type CreateLabelEvent,
  type CreateMessageEvent,
  CreateMessageResult,
  type CreateNotificationContextEvent,
  type CreateNotificationEvent,
  CreatePeerEvent,
  type DbAdapter,
  type Event,
  EventResult,
  LabelEventType,
  MessageEventType,
  NotificationEventType,
  PeerEventType,
  ReactionPatchEvent,
  type RemoveCardEvent,
  type RemoveCollaboratorsEvent,
  type RemoveLabelEvent,
  type RemoveNotificationContextEvent,
  type RemoveNotificationsEvent,
  RemovePatchEvent,
  RemovePeerEvent,
  type SessionData,
  ThreadPatchEvent,
  type UpdateCardTypeEvent,
  type UpdateNotificationContextEvent,
  type UpdateNotificationEvent,
  UpdatePatchEvent
} from '@hcengineering/communication-sdk-types'
import { MessageProcessor } from '@hcengineering/communication-shared'
import {
  AddAttachmentsOperation,
  RemoveAttachmentsOperation,
  SetAttachmentsOperation,
  UpdateAttachmentsOperation
} from '@hcengineering/communication-sdk-types'

import type { Enriched, Middleware, MiddlewareContext } from '../types'
import { BaseMiddleware } from './base'
import { Blob } from '../blob'

interface Result {
  skipPropagate?: boolean
  result?: EventResult
}

export class StorageMiddleware extends BaseMiddleware implements Middleware {
  private readonly blob: Blob
  private readonly db: DbAdapter
  constructor (
    readonly context: MiddlewareContext,
    next?: Middleware
  ) {
    super(context, next)

    this.blob = context.client.blob
    this.db = context.client.db
  }

  async findMessagesMeta (session: SessionData, params: FindMessagesMetaParams): Promise<MessageMeta[]> {
    return await this.db.findMessagesMeta(params)
  }

  async findMessagesGroups (session: SessionData, params: FindMessagesGroupParams): Promise<MessagesGroup[]> {
    if (params.id != null) {
      const meta = await this.context.client.getMessageMeta(params.cardId, params.id)
      if (meta == null) return []
      return await this.blob.findMessagesGroups({
        ...params,
        blobId: params.blobId ?? meta.blobId
      })
    }
    return await this.blob.findMessagesGroups(params)
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

  async findPeers (_: SessionData, params: FindPeersParams): Promise<Peer[]> {
    return await this.db.findPeers(params)
  }

  async findThreadMeta (_: SessionData, params: FindThreadMetaParams): Promise<ThreadMeta[]> {
    return await this.db.findThreadMeta(params)
  }

  async event (session: SessionData, event: Enriched<Event>, derived: boolean): Promise<EventResult> {
    const result = await this.processEvent(session, event)

    if (result.skipPropagate === true) {
      event.skipPropagate = true
    } else {
      await this.provideEvent(session, event, derived)
    }

    return result.result ?? {}
  }

  private async processEvent (session: SessionData, event: Enriched<Event>): Promise<Result> {
    switch (event.type) {
      // Messages
      case MessageEventType.CreateMessage:
        return await this.createMessage(event)
      case MessageEventType.UpdatePatch:
        return await this.updatePatch(event)
      case MessageEventType.RemovePatch:
        return await this.removePatch(event)

      case MessageEventType.ReactionPatch:
        return await this.reactionPatch(event, session)
      case MessageEventType.BlobPatch:
        return await this.blobPatch(event)
      case MessageEventType.AttachmentPatch:
        return await this.attachmentPatch(event)
      case MessageEventType.ThreadPatch:
        return await this.threadPatch(event, session)

      // Labels
      case LabelEventType.CreateLabel:
        return await this.createLabel(event)
      case LabelEventType.RemoveLabel:
        return await this.removeLabel(event)

      // Cards
      case CardEventType.UpdateCardType:
        return await this.updateCardType(event)
      case CardEventType.RemoveCard:
        return await this.removeCard(event)

      // Peers
      case PeerEventType.RemovePeer:
        return await this.removePeer(event)
      case PeerEventType.CreatePeer:
        return await this.createPeer(event)

      // Collaborators
      case NotificationEventType.AddCollaborators:
        return await this.addCollaborators(event)
      case NotificationEventType.RemoveCollaborators:
        return await this.removeCollaborators(event)

      // Notifications
      case NotificationEventType.CreateNotification:
        return await this.createNotification(event)
      case NotificationEventType.RemoveNotifications:
        return await this.removeNotifications(event)
      case NotificationEventType.UpdateNotification:
        return await this.updateNotification(event)

      // Notification Contexts
      case NotificationEventType.CreateNotificationContext:
        return await this.createNotificationContext(event)
      case NotificationEventType.RemoveNotificationContext:
        return await this.removeNotificationContext(event)
      case NotificationEventType.UpdateNotificationContext:
        return await this.updateNotificationContext(event)
    }
  }

  private async addCollaborators (event: Enriched<AddCollaboratorsEvent>): Promise<Result> {
    const added = await this.db.addCollaborators(event.cardId, event.cardType, event.collaborators, event.date)

    if (added.length === 0) return { skipPropagate: true }
    event.collaborators = added
    return {}
  }

  private async removeCollaborators (event: Enriched<RemoveCollaboratorsEvent>): Promise<Result> {
    if (event.collaborators.length === 0) return { skipPropagate: true }
    await this.db.removeCollaborators({ cardId: event.cardId, account: event.collaborators })

    return {}
  }

  private async createMessage (event: Enriched<CreateMessageEvent>): Promise<Result> {
    if (event.messageId == null) {
      throw new Error('Message id is required')
    }

    const group = await this.blob.getMessageGroupByDate(event.cardId, event.date)
    if (group == null) {
      throw new Error(
        `Cannot create message, group not found: cardId = ${event.cardId}, messageId = ${event.messageId}, created = ${event.date.toISOString()}`
      )
    }
    const result: CreateMessageResult = {
      messageId: event.messageId,
      created: event.date,
      blobId: group.blobId
    }
    const created = await this.db.createMessageMeta(
      event.cardId,
      event.messageId,
      event.socialId,
      event.date,
      group?.blobId
    )

    if (!created) {
      return {
        skipPropagate: true,
        result
      }
    }
    await this.blob.insertMessage(event.cardId, group, MessageProcessor.create(event))

    return {
      result
    }
  }

  private async updatePatch (event: Enriched<UpdatePatchEvent>): Promise<Result> {
    const data = {
      content: event.content,
      extra: event.extra
    }
    const meta = await this.context.client.getMessageMeta(event.cardId, event.messageId)

    if (meta === undefined) {
      return { skipPropagate: true }
    }

    await this.blob.updateMessage(event.cardId, meta.blobId, event.messageId, data, event.date)

    return {}
  }

  private async removePatch (event: Enriched<RemovePatchEvent>): Promise<Result> {
    const meta = await this.context.client.getMessageMeta(event.cardId, event.messageId)

    if (meta === undefined) {
      return { skipPropagate: true }
    }
    await this.blob.removeMessage(event.cardId, meta.blobId, event.messageId)
    await this.context.client.removeMessageMeta(event.cardId, event.messageId)
    return {}
  }

  private async reactionPatch (event: Enriched<ReactionPatchEvent>, session: SessionData): Promise<Result> {
    const meta = await this.context.client.getMessageMeta(event.cardId, event.messageId)

    if (meta === undefined) {
      return { skipPropagate: true }
    }

    const { operation, personUuid } = event

    if (personUuid === undefined) {
      return { skipPropagate: true }
    }

    if (operation.opcode === 'add') {
      await this.blob.addReaction(
        event.cardId,
        meta.blobId,
        event.messageId,
        operation.reaction,
        personUuid,
        event.date
      )
    } else if (operation.opcode === 'remove') {
      await this.blob.removeReaction(event.cardId, meta.blobId, event.messageId, operation.reaction, personUuid)
    }

    return {}
  }

  private async blobPatch (event: Enriched<BlobPatchEvent>): Promise<Result> {
    const { operations } = event

    const attachmentOperations: (
      | AddAttachmentsOperation
      | RemoveAttachmentsOperation
      | SetAttachmentsOperation
      | UpdateAttachmentsOperation
    )[] = []

    for (const operation of operations) {
      if (operation.opcode === 'attach') {
        attachmentOperations.push({
          opcode: 'add',
          attachments: operation.blobs.map((b) => ({
            id: b.blobId as any as AttachmentID,
            mimeType: b.mimeType,
            params: b
          }))
        })
      } else if (operation.opcode === 'detach') {
        attachmentOperations.push({
          opcode: 'remove',
          ids: operation.blobIds as any as AttachmentID[]
        })
      } else if (operation.opcode === 'set') {
        attachmentOperations.push({
          opcode: 'set',
          attachments: operation.blobs.map((b) => ({
            id: b.blobId as any as AttachmentID,
            mimeType: b.mimeType,
            params: b
          }))
        })
      } else if (operation.opcode === 'update') {
        attachmentOperations.push({
          opcode: 'update',
          attachments: operation.blobs.map((b) => ({
            id: b.blobId as any as AttachmentID,
            params: { ...b }
          }))
        })
      }
    }

    if (attachmentOperations.length === 0) {
      return { skipPropagate: true }
    }

    await this.attachmentPatch({
      _id: event._id,
      type: MessageEventType.AttachmentPatch,
      cardId: event.cardId,
      messageId: event.messageId,
      operations: attachmentOperations,
      socialId: event.socialId,
      date: event.date,
      _eventExtra: event._eventExtra
    })

    return {}
  }

  private async attachmentPatch (event: Enriched<AttachmentPatchEvent>): Promise<Result> {
    const meta = await this.context.client.getMessageMeta(event.cardId, event.messageId)
    if (meta === undefined) {
      return { skipPropagate: true }
    }

    const { operations } = event

    for (const operation of operations) {
      if (operation.opcode === 'add') {
        const attachments: Attachment[] = operation.attachments.map(
          (it) =>
            ({
              ...it,
              created: event.date,
              creator: event.socialId
            }) as any
        )
        await this.blob.addAttachments(event.cardId, meta.blobId, event.messageId, attachments)
      } else if (operation.opcode === 'remove') {
        await this.blob.removeAttachments(event.cardId, meta.blobId, event.messageId, operation.ids)
      } else if (operation.opcode === 'set') {
        const attachments: Attachment[] = operation.attachments.map(
          (it) =>
            ({
              ...it,
              created: event.date,
              creator: event.socialId
            }) as any
        )
        await this.blob.setAttachments(event.cardId, meta.blobId, event.messageId, attachments)
      } else if (operation.opcode === 'update') {
        await this.blob.updateAttachments(event.cardId, meta.blobId, event.messageId, operation.attachments, event.date)
      }
    }

    return {}
  }

  private async threadPatch (event: Enriched<ThreadPatchEvent>, session: SessionData): Promise<Result> {
    const meta = await this.context.client.getMessageMeta(event.cardId, event.messageId)
    if (meta === undefined) {
      return { skipPropagate: true }
    }

    if (event.operation.opcode === 'attach') {
      const thread: Thread = {
        cardId: event.operation.threadId,
        messageId: event.messageId,
        threadId: event.operation.threadId,
        threadType: event.operation.threadType,
        repliesCount: 0,
        lastReplyDate: new Date(),
        repliedPersons: {}
      }
      await this.db.attachThreadMeta(
        event.cardId,
        event.messageId,
        thread.threadId,
        thread.threadType,
        event.socialId,
        event.date
      )
      await this.blob.attachThread(event.cardId, meta.blobId, event.messageId, thread)
    } else if (event.operation.opcode === 'update') {
      await this.blob.updateThread(
        event.cardId,
        meta.blobId,
        event.messageId,
        event.operation.threadId,
        event.operation.update
      )
    } else if (event.operation.opcode === 'addReply') {
      const personUuid = await this.context.client.findPersonUuid(
        {
          ctx: this.context.ctx,
          account: session.account
        },
        event.socialId
      )
      if (personUuid === undefined) return { skipPropagate: true }
      await this.blob.addThreadReply(
        event.cardId,
        meta.blobId,
        event.messageId,
        event.operation.threadId,
        personUuid,
        event.date
      )
    } else if (event.operation.opcode === 'removeReply') {
      const personUuid = await this.context.client.findPersonUuid(
        {
          ctx: this.context.ctx,
          account: session.account
        },
        event.socialId
      )

      if (personUuid === undefined) return { skipPropagate: true }
      await this.blob.removeThreadReply(
        event.cardId,
        meta.blobId,
        event.messageId,
        event.operation.threadId,
        personUuid
      )
    }

    return {}
  }

  private async createNotification (event: Enriched<CreateNotificationEvent>): Promise<Result> {
    const id = await this.db.createNotification(
      event.contextId,
      event.messageId,
      event.blobId,
      event.notificationType,
      event.read ?? false,
      event.content,
      event.creator,
      event.date
    )

    event.notificationId = id

    return {}
  }

  private async updateNotification (event: Enriched<UpdateNotificationEvent>): Promise<Result> {
    const updated = await this.db.updateNotification(
      {
        contextId: event.contextId,
        account: event.account,
        ...event.query
      },
      event.updates
    )
    if (updated === 0) return { skipPropagate: true }
    event.updated = updated
    return {}
  }

  private async removeNotifications (event: Enriched<RemoveNotificationsEvent>): Promise<Result> {
    if (event.ids.length === 0) return { skipPropagate: true }
    const ids = await this.db.removeNotifications({
      contextId: event.contextId,
      account: event.account,
      id: event.ids
    })
    event.ids = ids
    return {
      result: {
        ids
      }
    }
  }

  private async createNotificationContext (event: Enriched<CreateNotificationContextEvent>): Promise<Result> {
    const id = await this.db.createNotificationContext(
      event.account,
      event.cardId,
      event.lastUpdate,
      event.lastView,
      event.lastNotify
    )

    event.contextId = id
    return {
      result: { id }
    }
  }

  private async removeNotificationContext (event: Enriched<RemoveNotificationContextEvent>): Promise<Result> {
    const id = await this.db.removeContext({
      id: event.contextId,
      account: event.account
    })

    if (id == null) return { skipPropagate: true }
    return {}
  }

  async updateNotificationContext (event: Enriched<UpdateNotificationContextEvent>): Promise<Result> {
    await this.db.updateContext(
      {
        id: event.contextId,
        account: event.account
      },
      event.updates
    )

    return {}
  }

  private async createLabel (event: Enriched<CreateLabelEvent>): Promise<Result> {
    await this.db.createLabel(event.cardId, event.cardType, event.labelId, event.account, event.date)

    return {}
  }

  private async removeLabel (event: Enriched<RemoveLabelEvent>): Promise<Result> {
    await this.db.removeLabels({
      labelId: event.labelId,
      cardId: event.cardId,
      account: event.account
    })

    return {}
  }

  private async createPeer (event: Enriched<CreatePeerEvent>): Promise<Result> {
    await this.db.createPeer(event.workspaceId, event.cardId, event.kind, event.value, event.extra ?? {}, event.date)
    return {}
  }

  private async removePeer (event: Enriched<RemovePeerEvent>): Promise<Result> {
    await this.db.removePeer(event.workspaceId, event.cardId, event.kind, event.value)
    return {}
  }

  private async updateCardType (event: Enriched<UpdateCardTypeEvent>): Promise<Result> {
    return {}
  }

  private async removeCard (event: Enriched<RemoveCardEvent>): Promise<Result> {
    return {}
  }

  close (): void {
    this.db.close()
  }
}
