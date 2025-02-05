import { type Message, type Patch, type Reaction, type Attachment } from '@hcengineering/communication-types'
import {
  EventType,
  type CreateAttachmentEvent,
  type AttachmentCreatedEvent,
  type CreateMessageEvent,
  type MessageCreatedEvent,
  type CreatePatchEvent,
  type PatchCreatedEvent,
  type CreateReactionEvent,
  type ReactionCreatedEvent,
  type Event,
  type BroadcastEvent,
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
  type NotificationContextUpdatedEvent
} from '@hcengineering/communication-sdk-types'

export type Result = {
  broadcastEvent?: BroadcastEvent
  result: EventResult
}

export class EventProcessor {
  constructor(
    private readonly db: DbAdapter,
    private readonly workspace: string
  ) {}

  async process(personalWorkspace: string, event: Event): Promise<Result> {
    switch (event.type) {
      case EventType.CreateMessage:
        return await this.createMessage(personalWorkspace, event)
      case EventType.RemoveMessage:
        return await this.removeMessage(personalWorkspace, event)
      case EventType.CreatePatch:
        return await this.createPatch(personalWorkspace, event)
      case EventType.CreateReaction:
        return await this.createReaction(personalWorkspace, event)
      case EventType.RemoveReaction:
        return await this.removeReaction(personalWorkspace, event)
      case EventType.CreateAttachment:
        return await this.createAttachment(personalWorkspace, event)
      case EventType.RemoveAttachment:
        return await this.removeAttachment(personalWorkspace, event)
      case EventType.CreateNotification:
        return await this.createNotification(personalWorkspace, event)
      case EventType.RemoveNotification:
        return await this.removeNotification(personalWorkspace, event)
      case EventType.CreateNotificationContext:
        return await this.createNotificationContext(personalWorkspace, event)
      case EventType.RemoveNotificationContext:
        return await this.removeNotificationContext(personalWorkspace, event)
      case EventType.UpdateNotificationContext:
        return await this.updateNotificationContext(personalWorkspace, event)
    }
  }

  private async createMessage(_personalWorkspace: string, event: CreateMessageEvent): Promise<Result> {
    const created = new Date()
    const id = await this.db.createMessage(this.workspace, event.card, event.content, event.creator, created)
    const message: Message = {
      id,
      card: event.card,
      content: event.content,
      creator: event.creator,
      created: created,
      edited: created,
      reactions: [],
      attachments: []
    }
    const broadcastEvent: MessageCreatedEvent = {
      type: EventType.MessageCreated,
      message
    }
    return {
      broadcastEvent,
      result: { id }
    }
  }

  private async createPatch(_personalWorkspace: string, event: CreatePatchEvent): Promise<Result> {
    const created = new Date()
    await this.db.createPatch(event.message, event.content, event.creator, created)

    const patch: Patch = {
      message: event.message,
      content: event.content,
      creator: event.creator,
      created: created
    }
    const broadcastEvent: PatchCreatedEvent = {
      type: EventType.PatchCreated,
      card: event.card,
      patch
    }
    return {
      broadcastEvent,
      result: {}
    }
  }

  private async removeMessage(_personalWorkspace: string, event: RemoveMessageEvent): Promise<Result> {
    await this.db.removeMessage(event.message)

    const broadcastEvent: MessageRemovedEvent = {
      type: EventType.MessageRemoved,
      card: event.card,
      message: event.message
    }

    return {
      broadcastEvent,
      result: {}
    }
  }

  private async createReaction(_personalWorkspace: string, event: CreateReactionEvent): Promise<Result> {
    const created = new Date()
    await this.db.createReaction(event.message, event.reaction, event.creator, created)

    const reaction: Reaction = {
      message: event.message,
      reaction: event.reaction,
      creator: event.creator,
      created: created
    }
    const broadcastEvent: ReactionCreatedEvent = {
      type: EventType.ReactionCreated,
      card: event.card,
      reaction
    }
    return {
      broadcastEvent,
      result: {}
    }
  }

  private async removeReaction(_personalWorkspace: string, event: RemoveReactionEvent): Promise<Result> {
    await this.db.removeReaction(event.message, event.reaction, event.creator)
    const broadcastEvent: ReactionRemovedEvent = {
      type: EventType.ReactionRemoved,
      card: event.card,
      message: event.message,
      reaction: event.reaction,
      creator: event.creator
    }
    return {
      broadcastEvent,
      result: {}
    }
  }

  private async createAttachment(_personalWorkspace: string, event: CreateAttachmentEvent): Promise<Result> {
    const created = new Date()
    await this.db.createAttachment(event.message, event.card, event.creator, created)

    const attachment: Attachment = {
      message: event.message,
      card: event.card,
      creator: event.creator,
      created: created
    }
    const broadcastEvent: AttachmentCreatedEvent = {
      type: EventType.AttachmentCreated,
      card: event.card,
      attachment
    }

    return {
      broadcastEvent,
      result: {}
    }
  }

  private async removeAttachment(_personalWorkspace: string, event: RemoveAttachmentEvent): Promise<Result> {
    await this.db.removeAttachment(event.message, event.card)
    const broadcastEvent: AttachmentRemovedEvent = {
      type: EventType.AttachmentRemoved,
      card: event.card,
      message: event.message,
      attachment: event.attachment
    }
    return {
      broadcastEvent,
      result: {}
    }
  }

  private async createNotification(_personalWorkspace: string, event: CreateNotificationEvent): Promise<Result> {
    await this.db.createNotification(event.message, event.context)

    return {
      result: {}
    }
  }

  private async removeNotification(personalWorkspace: string, event: RemoveNotificationEvent): Promise<Result> {
    await this.db.removeNotification(event.message, event.context)

    const broadcastEvent: NotificationRemovedEvent = {
      type: EventType.NotificationRemoved,
      personalWorkspace: personalWorkspace,
      message: event.message,
      context: event.context
    }
    return {
      broadcastEvent,
      result: {}
    }
  }

  private async createNotificationContext(
    personalWorkspace: string,
    event: CreateNotificationContextEvent
  ): Promise<Result> {
    const id = await this.db.createContext(
      personalWorkspace,
      this.workspace,
      event.card,
      event.lastView,
      event.lastUpdate
    )
    const broadcastEvent: NotificationContextCreatedEvent = {
      type: EventType.NotificationContextCreated,
      context: {
        id,
        workspace: this.workspace,
        personalWorkspace: personalWorkspace,
        card: event.card,
        lastView: event.lastView,
        lastUpdate: event.lastUpdate
      }
    }
    return {
      broadcastEvent,
      result: { id }
    }
  }

  private async removeNotificationContext(
    personalWorkspace: string,
    event: RemoveNotificationContextEvent
  ): Promise<Result> {
    await this.db.removeContext(event.context)
    const broadcastEvent: NotificationContextRemovedEvent = {
      type: EventType.NotificationContextRemoved,
      personalWorkspace: personalWorkspace,
      context: event.context
    }
    return {
      broadcastEvent,
      result: {}
    }
  }

  async updateNotificationContext(personalWorkspace: string, event: UpdateNotificationContextEvent): Promise<Result> {
    await this.db.updateContext(event.context, event.update)

    const broadcastEvent: NotificationContextUpdatedEvent = {
      type: EventType.NotificationContextUpdated,
      personalWorkspace: personalWorkspace,
      context: event.context,
      update: event.update
    }
    return {
      broadcastEvent,
      result: {}
    }
  }
}
