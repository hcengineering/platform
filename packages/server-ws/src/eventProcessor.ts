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

type Result = {
  broadcastEvent?: BroadcastEvent
  result: EventResult
}

export class EventProcessor {
  constructor(
    private readonly db: DbAdapter,
    private readonly workspace: string,
    private readonly personalWorkspace: string
  ) {}

  async process(event: Event): Promise<Result> {
    switch (event.type) {
      case EventType.CreateMessage:
        return await this.createMessage(event)
      case EventType.RemoveMessage:
        return await this.removeMessage(event)
      case EventType.CreatePatch:
        return await this.createPatch(event)
      case EventType.CreateReaction:
        return await this.createReaction(event)
      case EventType.RemoveReaction:
        return await this.removeReaction(event)
      case EventType.CreateAttachment:
        return await this.createAttachment(event)
      case EventType.RemoveAttachment:
        return await this.removeAttachment(event)
      case EventType.CreateNotification:
        return await this.createNotification(event)
      case EventType.RemoveNotification:
        return await this.removeNotification(event)
      case EventType.CreateNotificationContext:
        return await this.createNotificationContext(event)
      case EventType.RemoveNotificationContext:
        return await this.removeNotificationContext(event)
      case EventType.UpdateNotificationContext:
        return await this.updateNotificationContext(event)
    }
  }

  private async createMessage(event: CreateMessageEvent): Promise<Result> {
    const created = new Date()
    const id = await this.db.createMessage(this.workspace, event.thread, event.content, event.creator, created)
    const message: Message = {
      id,
      thread: event.thread,
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

  private async createPatch(event: CreatePatchEvent): Promise<Result> {
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
      thread: event.thread,
      patch
    }
    return {
      broadcastEvent,
      result: {}
    }
  }

  private async removeMessage(event: RemoveMessageEvent): Promise<Result> {
    await this.db.removeMessage(event.message)

    const broadcastEvent: MessageRemovedEvent = {
      type: EventType.MessageRemoved,
      thread: event.thread,
      message: event.message
    }

    return {
      broadcastEvent,
      result: {}
    }
  }

  private async createReaction(event: CreateReactionEvent): Promise<Result> {
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
      thread: event.thread,
      reaction
    }
    return {
      broadcastEvent,
      result: {}
    }
  }

  private async removeReaction(event: RemoveReactionEvent): Promise<Result> {
    await this.db.removeReaction(event.message, event.reaction, event.creator)
    const broadcastEvent: ReactionRemovedEvent = {
      type: EventType.ReactionRemoved,
      thread: event.thread,
      message: event.message,
      reaction: event.reaction,
      creator: event.creator
    }
    return {
      broadcastEvent,
      result: {}
    }
  }

  private async createAttachment(event: CreateAttachmentEvent): Promise<Result> {
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
      thread: event.thread,
      attachment
    }

    return {
      broadcastEvent,
      result: {}
    }
  }

  private async removeAttachment(event: RemoveAttachmentEvent): Promise<Result> {
    await this.db.removeAttachment(event.message, event.card)
    const broadcastEvent: AttachmentRemovedEvent = {
      type: EventType.AttachmentRemoved,
      thread: event.thread,
      message: event.message,
      card: event.card
    }
    return {
      broadcastEvent,
      result: {}
    }
  }

  private async createNotification(event: CreateNotificationEvent): Promise<Result> {
    await this.db.createNotification(event.message, event.context)

    return {
      result: {}
    }
  }

  private async removeNotification(event: RemoveNotificationEvent): Promise<Result> {
    await this.db.removeNotification(event.message, event.context)

    const broadcastEvent: NotificationRemovedEvent = {
      type: EventType.NotificationRemoved,
      personalWorkspace: this.personalWorkspace,
      message: event.message,
      context: event.context
    }
    return {
      broadcastEvent,
      result: {}
    }
  }

  private async createNotificationContext(event: CreateNotificationContextEvent): Promise<Result> {
    const id = await this.db.createContext(
      this.personalWorkspace,
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
        personalWorkspace: this.personalWorkspace,
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

  private async removeNotificationContext(event: RemoveNotificationContextEvent): Promise<Result> {
    await this.db.removeContext(event.context)
    const broadcastEvent: NotificationContextRemovedEvent = {
      type: EventType.NotificationContextRemoved,
      personalWorkspace: this.personalWorkspace,
      context: event.context
    }
    return {
      broadcastEvent,
      result: {}
    }
  }

  async updateNotificationContext(event: UpdateNotificationContextEvent): Promise<Result> {
    await this.db.updateContext(event.context, event.update)

    const broadcastEvent: NotificationContextUpdatedEvent = {
      type: EventType.NotificationContextUpdated,
      personalWorkspace: this.personalWorkspace,
      context: event.context,
      update: event.update
    }
    return {
      broadcastEvent,
      result: {}
    }
  }
}
