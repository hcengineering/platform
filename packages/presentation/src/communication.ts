import {
  type Attachment,
  type CardID,
  type ContextID,
  type FindMessagesParams,
  type FindNotificationContextParams,
  type FindNotificationsParams,
  type Message,
  type MessageID,
  type Notification,
  type NotificationContext,
  type NotificationContextUpdate,
  type Reaction,
  type RichText,
  type SocialID
} from '@hcengineering/communication-types'
import {
  type BroadcastEvent,
  type Client,
  type CreateAttachmentEvent,
  type CreateMessageEvent,
  type CreateMessageResult,
  type CreateNotificationContextEvent,
  type CreateNotificationContextResult,
  type CreateNotificationEvent,
  type CreatePatchEvent,
  type CreateReactionEvent,
  type Event,
  type EventResult,
  EventType,
  type RemoveAttachmentEvent,
  type RemoveMessageEvent,
  type RemoveNotificationContextEvent,
  type RemoveNotificationEvent,
  type RemoveReactionEvent,
  type UpdateNotificationContextEvent
} from '@hcengineering/communication-sdk-types'
import { type ClientConnection } from '@hcengineering/core'

let client: Client

export function getCommunicationClient (): Client {
  return client
}

export async function setCommunicationClient (connection: ClientConnection): Promise<void> {
  client = new CommunicationClient(connection)
}

class CommunicationClient implements Client {
  onEvent: (event: BroadcastEvent) => void = () => {}

  constructor (private readonly connection: ClientConnection) {}

  async createMessage (card: CardID, content: RichText, creator: SocialID): Promise<MessageID> {
    const event: CreateMessageEvent = {
      type: EventType.CreateMessage,
      card,
      content,
      creator
    }
    const result = await this.sendEvent(event)
    return (result as CreateMessageResult).id
  }

  async removeMessage (card: CardID, message: MessageID): Promise<void> {
    const event: RemoveMessageEvent = {
      type: EventType.RemoveMessage,
      card,
      message
    }
    await this.sendEvent(event)
  }

  async createPatch (card: CardID, message: MessageID, content: RichText, creator: SocialID): Promise<void> {
    const event: CreatePatchEvent = {
      type: EventType.CreatePatch,
      card,
      message,
      content,
      creator
    }
    await this.sendEvent(event)
  }

  async createReaction (card: CardID, message: MessageID, reaction: string, creator: SocialID): Promise<void> {
    const event: CreateReactionEvent = {
      type: EventType.CreateReaction,
      card,
      message,
      reaction,
      creator
    }
    await this.sendEvent(event)
  }

  async removeReaction (card: CardID, message: MessageID, reaction: string, creator: SocialID): Promise<void> {
    const event: RemoveReactionEvent = {
      type: EventType.RemoveReaction,
      card,
      message,
      reaction,
      creator
    }
    await this.sendEvent(event)
  }

  async createAttachment (card: CardID, message: MessageID, attachment: CardID, creator: SocialID): Promise<void> {
    const event: CreateAttachmentEvent = {
      type: EventType.CreateAttachment,
      card,
      message,
      attachment,
      creator
    }
    await this.sendEvent(event)
  }

  async removeAttachment (card: CardID, message: MessageID, attachment: CardID): Promise<void> {
    const event: RemoveAttachmentEvent = {
      type: EventType.RemoveAttachment,
      card,
      message,
      attachment
    }
    await this.sendEvent(event)
  }

  async findMessages (params: FindMessagesParams, queryId?: number): Promise<Message[]> {
    const rawMessages = await this.connection.sendRequest({ method: 'findMessages', params: [params, queryId] })
    return rawMessages.map((it: any) => this.toMessage(it))
  }

  toMessage (raw: any): Message {
    return {
      id: raw.id,
      card: raw.card,
      content: raw.content,
      creator: raw.creator,
      created: new Date(raw.created),
      edited: new Date(raw.edited),
      reactions: raw.reactions.map((it: any) => this.toReaction(it)),
      attachments: raw.attachments.map((it: any) => this.toAttachment(it))
    }
  }

  toAttachment (raw: any): Attachment {
    return {
      message: raw.message,
      card: raw.card,
      creator: raw.creator,
      created: new Date(raw.created)
    }
  }

  toReaction (raw: any): Reaction {
    return {
      message: raw.message,
      reaction: raw.reaction,
      creator: raw.creator,
      created: new Date(raw.created)
    }
  }

  async createNotification (message: MessageID, context: ContextID): Promise<void> {
    const event: CreateNotificationEvent = {
      type: EventType.CreateNotification,
      message,
      context
    }
    await this.sendEvent(event)
  }

  async removeNotification (message: MessageID, context: ContextID): Promise<void> {
    const event: RemoveNotificationEvent = {
      type: EventType.RemoveNotification,
      message,
      context
    }
    await this.sendEvent(event)
  }

  async createNotificationContext (card: CardID, lastView?: Date, lastUpdate?: Date): Promise<ContextID> {
    const event: CreateNotificationContextEvent = {
      type: EventType.CreateNotificationContext,
      card,
      lastView,
      lastUpdate
    }
    const result = await this.sendEvent(event)
    return (result as CreateNotificationContextResult).id
  }

  async removeNotificationContext (context: ContextID): Promise<void> {
    const event: RemoveNotificationContextEvent = {
      type: EventType.RemoveNotificationContext,
      context
    }
    await this.sendEvent(event)
  }

  async updateNotificationContext (context: ContextID, update: NotificationContextUpdate): Promise<void> {
    const event: UpdateNotificationContextEvent = {
      type: EventType.UpdateNotificationContext,
      context,
      update
    }
    await this.sendEvent(event)
  }

  async findNotificationContexts (
    params: FindNotificationContextParams,
    queryId?: number
  ): Promise<NotificationContext[]> {
    return await this.connection.sendRequest({ method: 'findNotificationContexts', params: [params, queryId] })
  }

  async findNotifications (params: FindNotificationsParams, queryId?: number): Promise<Notification[]> {
    return await this.connection.sendRequest({ method: 'findNotifications', params: [params, queryId] })
  }

  async unsubscribeQuery (id: number): Promise<void> {
    await this.connection.sendRequest({ method: 'unsubscribeQuery', params: [id] })
  }

  private async sendEvent (event: Event): Promise<EventResult> {
    return await this.connection.sendRequest({ method: 'event', params: [event] })
  }

  close (): void {
    // do nothing
  }
}
