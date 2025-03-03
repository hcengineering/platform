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
  type Message,
  type Patch,
  type Reaction,
  type Attachment,
  type SocialID,
  type WorkspaceID,
  PatchType
} from '@hcengineering/communication-types'
import {
  type CreateAttachmentEvent,
  type AttachmentCreatedEvent,
  type CreateMessageEvent,
  type MessageCreatedEvent,
  type CreatePatchEvent,
  type PatchCreatedEvent,
  type CreateReactionEvent,
  type ReactionCreatedEvent,
  type RemoveAttachmentEvent,
  type AttachmentRemovedEvent,
  type RemoveMessageEvent,
  type MessageRemovedEvent,
  type RemoveReactionEvent,
  type ReactionRemovedEvent,
  type EventResult,
  type DbAdapter,
  type CreateNotificationEvent,
  type RemoveNotificationEvent,
  type CreateNotificationContextEvent,
  type RemoveNotificationContextEvent,
  type UpdateNotificationContextEvent,
  type NotificationRemovedEvent,
  type NotificationContextCreatedEvent,
  type NotificationContextRemovedEvent,
  type NotificationContextUpdatedEvent,
  type ResponseEvent,
  RequestEventType,
  type RequestEvent,
  ResponseEventType,
  type CreateMessagesGroupEvent,
  type RemoveMessagesEvent,
  type ThreadCreatedEvent,
  type CreateThreadEvent,
  type ConnectionInfo,
  type RemovePatchesEvent,
  type RemoveMessagesGroupEvent,
  type MessagesGroupCreatedEvent
} from '@hcengineering/communication-sdk-types'

export interface Result {
  responseEvent?: ResponseEvent
  result: EventResult
}

export class EventProcessor {
  constructor(
    private readonly db: DbAdapter,
    private readonly workspace: WorkspaceID
  ) {}

  async process(info: ConnectionInfo, event: RequestEvent): Promise<Result> {
    switch (event.type) {
      case RequestEventType.CreateMessage:
        return await this.createMessage(event, info)
      case RequestEventType.RemoveMessage:
        return await this.removeMessage(event, info)
      case RequestEventType.RemoveMessages:
        return await this.removeMessages(event, info)
      case RequestEventType.CreatePatch:
        return await this.createPatch(event, info)
      case RequestEventType.CreateReaction:
        return await this.createReaction(event, info)
      case RequestEventType.RemoveReaction:
        return await this.removeReaction(event, info)
      case RequestEventType.CreateAttachment:
        return await this.createAttachment(event, info)
      case RequestEventType.RemoveAttachment:
        return await this.removeAttachment(event, info)
      case RequestEventType.CreateNotification:
        return await this.createNotification(event, info)
      case RequestEventType.RemoveNotification:
        return await this.removeNotification(event, info)
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
      case RequestEventType.RemovePatches:
        return await this.removePatches(event, info)
      case RequestEventType.RemoveMessagesGroup:
        return await this.removeMessagesGroup(event, info)
    }
  }

  private async createMessage(event: CreateMessageEvent, info: ConnectionInfo): Promise<Result> {
    this.checkCreator(info, event.creator)

    const created = new Date()
    const id = await this.db.createMessage(event.card, event.content, event.creator, created)
    const message: Message = {
      id,
      card: event.card,
      content: event.content,
      creator: event.creator,
      created,
      reactions: [],
      attachments: []
    }
    const responseEvent: MessageCreatedEvent = {
      type: ResponseEventType.MessageCreated,
      message
    }
    return {
      responseEvent,
      result: { id }
    }
  }

  private async createPatch(event: CreatePatchEvent, info: ConnectionInfo): Promise<Result> {
    this.checkCreator(info, event.creator)
    const created = new Date()
    await this.db.createPatch(event.card, event.message, PatchType.update, event.content, event.creator, created)

    const patch: Patch = {
      type: PatchType.update,
      message: event.message,
      content: event.content,
      creator: event.creator,
      created
    }
    const responseEvent: PatchCreatedEvent = {
      type: ResponseEventType.PatchCreated,
      card: event.card,
      patch
    }
    return {
      responseEvent,
      result: {}
    }
  }

  private async removeMessage(event: RemoveMessageEvent, info: ConnectionInfo): Promise<Result> {
    const socialIds = info.isSystem ? undefined : info.socialIds
    await this.db.removeMessage(event.card, event.message, socialIds)

    const responseEvent: MessageRemovedEvent = {
      type: ResponseEventType.MessageRemoved,
      card: event.card,
      message: event.message
    }

    return {
      responseEvent,
      result: {}
    }
  }

  private async removeMessages(event: RemoveMessagesEvent, info: ConnectionInfo): Promise<Result> {
    if (!info.isSystem) {
      throw new Error('Forbidden')
    }
    await this.db.removeMessages(event.card, event.fromId, event.toId)

    return {
      result: {}
    }
  }

  private async removePatches(event: RemovePatchesEvent, info: ConnectionInfo): Promise<Result> {
    if (!info.isSystem) {
      throw new Error('Forbidden')
    }
    await this.db.removePatches(event.card, event.fromId, event.toId)

    return {
      result: {}
    }
  }

  private async createReaction(event: CreateReactionEvent, info: ConnectionInfo): Promise<Result> {
    this.checkCreator(info, event.creator)
    const created = new Date()
    await this.db.createReaction(event.card, event.message, event.reaction, event.creator, created)

    const reaction: Reaction = {
      message: event.message,
      reaction: event.reaction,
      creator: event.creator,
      created
    }
    const responseEvent: ReactionCreatedEvent = {
      type: ResponseEventType.ReactionCreated,
      card: event.card,
      reaction
    }
    return {
      responseEvent,
      result: {}
    }
  }

  private async removeReaction(event: RemoveReactionEvent, info: ConnectionInfo): Promise<Result> {
    this.checkCreator(info, event.creator)
    await this.db.removeReaction(event.card, event.message, event.reaction, event.creator)
    const responseEvent: ReactionRemovedEvent = {
      type: ResponseEventType.ReactionRemoved,
      card: event.card,
      message: event.message,
      reaction: event.reaction,
      creator: event.creator
    }
    return {
      responseEvent,
      result: {}
    }
  }

  private async createAttachment(event: CreateAttachmentEvent, info: ConnectionInfo): Promise<Result> {
    this.checkCreator(info, event.creator)
    const created = new Date()
    await this.db.createAttachment(event.message, event.card, event.creator, created)

    const attachment: Attachment = {
      message: event.message,
      card: event.card,
      creator: event.creator,
      created
    }
    const responseEvent: AttachmentCreatedEvent = {
      type: ResponseEventType.AttachmentCreated,
      card: event.card,
      attachment
    }

    return {
      responseEvent,
      result: {}
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async removeAttachment(event: RemoveAttachmentEvent, _: ConnectionInfo): Promise<Result> {
    await this.db.removeAttachment(event.message, event.card)
    const responseEvent: AttachmentRemovedEvent = {
      type: ResponseEventType.AttachmentRemoved,
      card: event.card,
      message: event.message,
      attachment: event.attachment
    }
    return {
      responseEvent,
      result: {}
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async createNotification(event: CreateNotificationEvent, _: ConnectionInfo): Promise<Result> {
    await this.db.createNotification(event.message, event.context)

    return {
      result: {}
    }
  }

  private async removeNotification(event: RemoveNotificationEvent, info: ConnectionInfo): Promise<Result> {
    await this.db.removeNotification(event.message, event.context)

    const responseEvent: NotificationRemovedEvent = {
      type: ResponseEventType.NotificationRemoved,
      personalWorkspace: info.personalWorkspace,
      message: event.message,
      context: event.context
    }
    return {
      responseEvent,
      result: {}
    }
  }

  private async createNotificationContext(
    event: CreateNotificationContextEvent,
    info: ConnectionInfo
  ): Promise<Result> {
    const id = await this.db.createContext(info.personalWorkspace, event.card, event.lastView, event.lastUpdate)
    const responseEvent: NotificationContextCreatedEvent = {
      type: ResponseEventType.NotificationContextCreated,
      context: {
        id,
        workspace: this.workspace,
        personalWorkspace: info.personalWorkspace,
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
    info: ConnectionInfo
  ): Promise<Result> {
    await this.db.removeContext(event.context)
    const responseEvent: NotificationContextRemovedEvent = {
      type: ResponseEventType.NotificationContextRemoved,
      personalWorkspace: info.personalWorkspace,
      context: event.context
    }
    return {
      responseEvent,
      result: {}
    }
  }

  async updateNotificationContext(event: UpdateNotificationContextEvent, info: ConnectionInfo): Promise<Result> {
    await this.db.updateContext(event.context, event.update)

    const responseEvent: NotificationContextUpdatedEvent = {
      type: ResponseEventType.NotificationContextUpdated,
      personalWorkspace: info.personalWorkspace,
      context: event.context,
      update: event.update
    }
    return {
      responseEvent,
      result: {}
    }
  }

  async createMessagesGroup(event: CreateMessagesGroupEvent, info: ConnectionInfo): Promise<Result> {
    if (!info.isSystem) {
      throw new Error('Forbidden')
    }
    const { fromDate, toDate, count, fromId, toId, card, blobId } = event.group
    await this.db.createMessagesGroup(card, blobId, fromDate, toDate, fromId, toId, count)

    const responseEvent: MessagesGroupCreatedEvent = {
      type: ResponseEventType.MessagesGroupCreated,
      group: {
        card,
        blobId,
        fromDate,
        toDate,
        fromId,
        toId,
        count
      }
    }
    return {
      responseEvent,
      result: {}
    }
  }

  async removeMessagesGroup(event: RemoveMessagesGroupEvent, info: ConnectionInfo): Promise<Result> {
    if (!info.isSystem) {
      throw new Error('Forbidden')
    }
    await this.db.removeMessagesGroup(event.card, event.blobId)

    return {
      responseEvent: undefined,
      result: {}
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async createThread(event: CreateThreadEvent, _: ConnectionInfo): Promise<Result> {
    const date = new Date()
    await this.db.createThread(event.card, event.message, event.thread, date)
    const responseEvent: ThreadCreatedEvent = {
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
      responseEvent,
      result: {}
    }
  }

  private checkCreator(info: ConnectionInfo, creator: SocialID): void {
    if (!info.socialIds.includes(creator) && !info.isSystem) {
      throw new Error('Forbidden')
    }
  }
}
