import {
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
  type RichText,
  type SocialID
} from '@communication/types'
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
} from '@communication/sdk-types'

import { WebSocketConnection } from './connection'

class WsClient implements Client {
  private readonly ws: WebSocketConnection

  onEvent: (event: BroadcastEvent) => void = () => {}

  constructor(
    private readonly url: string,
    private readonly token: string,
    private readonly binary: boolean = false
  ) {
    const connectionUrl = this.url + '?token=' + this.token
    this.ws = new WebSocketConnection(connectionUrl, this.binary)
    this.ws.onEvent = (event) => {
      void this.onEvent(event)
    }
  }

  async createMessage(card: CardID, content: RichText, creator: SocialID): Promise<MessageID> {
    const event: CreateMessageEvent = {
      type: EventType.CreateMessage,
      card,
      content,
      creator
    }
    const result = await this.sendEvent(event)
    return (result as CreateMessageResult).id
  }

  async removeMessage(message: MessageID) {
    const event: RemoveMessageEvent = {
      type: EventType.RemoveMessage,
      message
    }
    await this.sendEvent(event)
  }

  async createPatch(message: MessageID, content: RichText, creator: SocialID): Promise<void> {
    const event: CreatePatchEvent = {
      type: EventType.CreatePatch,
      message,
      content,
      creator
    }
    await this.sendEvent(event)
  }

  async createReaction(message: MessageID, reaction: string, creator: SocialID): Promise<void> {
    const event: CreateReactionEvent = {
      type: EventType.CreateReaction,
      message,
      reaction,
      creator
    }
    await this.sendEvent(event)
  }

  async removeReaction(message: MessageID, reaction: string, creator: SocialID): Promise<void> {
    const event: RemoveReactionEvent = {
      type: EventType.RemoveReaction,
      message,
      reaction,
      creator
    }
    await this.sendEvent(event)
  }

  async createAttachment(message: MessageID, card: CardID, creator: SocialID): Promise<void> {
    const event: CreateAttachmentEvent = {
      type: EventType.CreateAttachment,
      message,
      card,
      creator
    }
    await this.sendEvent(event)
  }

  async removeAttachment(message: MessageID, card: CardID): Promise<void> {
    const event: RemoveAttachmentEvent = {
      type: EventType.RemoveAttachment,
      message,
      card
    }
    await this.sendEvent(event)
  }

  async findMessages(params: FindMessagesParams, queryId?: number): Promise<Message[]> {
    const rawMessages = await this.ws.send('findMessages', [params, queryId])
    return rawMessages.map(this.toMessage)
  }

  toMessage(raw: any): Message {
    return {
      id: raw.id,
      content: raw.content,
      creator: raw.creator,
      created: new Date(raw.created),
      edited: new Date(raw.edited),
      reactions: raw.reactions,
      attachments: raw.attachments
    }
  }

  async createNotification(message: MessageID, context: ContextID): Promise<void> {
    const event: CreateNotificationEvent = {
      type: EventType.CreateNotification,
      message,
      context
    }
    await this.sendEvent(event)
  }

  async removeNotification(message: MessageID, context: ContextID): Promise<void> {
    const event: RemoveNotificationEvent = {
      type: EventType.RemoveNotification,
      message,
      context
    }
    await this.sendEvent(event)
  }

  async createNotificationContext(card: CardID, lastView?: Date, lastUpdate?: Date): Promise<ContextID> {
    const event: CreateNotificationContextEvent = {
      type: EventType.CreateNotificationContext,
      card,
      lastView,
      lastUpdate
    }
    const result = await this.sendEvent(event)
    return (result as CreateNotificationContextResult).id
  }

  async removeNotificationContext(context: ContextID): Promise<void> {
    const event: RemoveNotificationContextEvent = {
      type: EventType.RemoveNotificationContext,
      context
    }
    await this.sendEvent(event)
  }

  async updateNotificationContext(context: ContextID, update: NotificationContextUpdate): Promise<void> {
    const event: UpdateNotificationContextEvent = {
      type: EventType.UpdateNotificationContext,
      context,
      update
    }
    await this.sendEvent(event)
  }

  async findNotificationContexts(
    params: FindNotificationContextParams,
    queryId?: number
  ): Promise<NotificationContext[]> {
    return await this.ws.send('findNotificationContexts', [params, queryId])
  }

  async findNotifications(params: FindNotificationsParams, queryId?: number): Promise<Notification[]> {
    return await this.ws.send('findNotifications', [params, queryId])
  }

  async unsubscribeQuery(id: number): Promise<void> {
    await this.ws.send('unsubscribeQuery', [id])
  }

  private async sendEvent(event: Event): Promise<EventResult> {
    return await this.ws.send('event', [event])
  }

  close() {
    void this.ws.close()
  }
}

export async function getWebsocketClient(url: string, token: string): Promise<Client> {
  return new WsClient(url, token)
}
