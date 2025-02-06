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
import { type Client as PlatformClient, type ClientConnection as PlatformConnection } from '@hcengineering/core'
import {
  initLiveQueries,
  createMessagesQuery,
  createNotificationsQuery
} from '@hcengineering/communication-client-query'

export { createMessagesQuery, createNotificationsQuery, type Client as CommunicationClient }

export interface RawClient extends PlatformConnection {
  findMessages: (params: FindMessagesParams, queryId?: number) => Promise<Message[]>
  findNotificationContexts: (params: FindNotificationContextParams, queryId?: number) => Promise<NotificationContext[]>
  findNotifications: (params: FindNotificationsParams, queryId?: number) => Promise<Notification[]>
  sendEvent: (event: Event) => Promise<EventResult>
  unsubscribeQuery: (id: number) => Promise<void>
}

let client: Client

export function getCommunicationClient (): Client {
  return client
}

export async function setCommunicationClient (platformClient: PlatformClient): Promise<void> {
  const connection = platformClient.getConnection?.()
  if (connection === undefined) {
    return
  }
  client = new CommunicationClient(connection as unknown as RawClient)
  initLiveQueries(client)
}

class CommunicationClient implements Client {
  onEvent: (event: BroadcastEvent) => void = () => {}

  constructor (private readonly rawClient: RawClient) {
    rawClient.pushHandler((...events: any[]) => {
      for (const event of events) {
        if (event != null && 'type' in event) {
          this.onEvent(event as BroadcastEvent)
        }
      }
    })
  }

  async createMessage (card: CardID, content: RichText, creator: SocialID): Promise<MessageID> {
    const event: CreateMessageEvent = {
      type: EventType.CreateMessage,
      card,
      content,
      creator
    }
    const result = await this.rawClient.sendEvent(event)
    return (result as CreateMessageResult).id
  }

  async removeMessage (card: CardID, message: MessageID): Promise<void> {
    const event: RemoveMessageEvent = {
      type: EventType.RemoveMessage,
      card,
      message
    }
    await this.rawClient.sendEvent(event)
  }

  async createPatch (card: CardID, message: MessageID, content: RichText, creator: SocialID): Promise<void> {
    const event: CreatePatchEvent = {
      type: EventType.CreatePatch,
      card,
      message,
      content,
      creator
    }
    await this.rawClient.sendEvent(event)
  }

  async createReaction (card: CardID, message: MessageID, reaction: string, creator: SocialID): Promise<void> {
    const event: CreateReactionEvent = {
      type: EventType.CreateReaction,
      card,
      message,
      reaction,
      creator
    }
    await this.rawClient.sendEvent(event)
  }

  async removeReaction (card: CardID, message: MessageID, reaction: string, creator: SocialID): Promise<void> {
    const event: RemoveReactionEvent = {
      type: EventType.RemoveReaction,
      card,
      message,
      reaction,
      creator
    }
    await this.rawClient.sendEvent(event)
  }

  async createAttachment (card: CardID, message: MessageID, attachment: CardID, creator: SocialID): Promise<void> {
    const event: CreateAttachmentEvent = {
      type: EventType.CreateAttachment,
      card,
      message,
      attachment,
      creator
    }
    await this.rawClient.sendEvent(event)
  }

  async removeAttachment (card: CardID, message: MessageID, attachment: CardID): Promise<void> {
    const event: RemoveAttachmentEvent = {
      type: EventType.RemoveAttachment,
      card,
      message,
      attachment
    }
    await this.rawClient.sendEvent(event)
  }

  async createNotification (message: MessageID, context: ContextID): Promise<void> {
    const event: CreateNotificationEvent = {
      type: EventType.CreateNotification,
      message,
      context
    }
    await this.rawClient.sendEvent(event)
  }

  async removeNotification (message: MessageID, context: ContextID): Promise<void> {
    const event: RemoveNotificationEvent = {
      type: EventType.RemoveNotification,
      message,
      context
    }
    await this.rawClient.sendEvent(event)
  }

  async createNotificationContext (card: CardID, lastView?: Date, lastUpdate?: Date): Promise<ContextID> {
    const event: CreateNotificationContextEvent = {
      type: EventType.CreateNotificationContext,
      card,
      lastView,
      lastUpdate
    }
    const result = await this.rawClient.sendEvent(event)
    return (result as CreateNotificationContextResult).id
  }

  async removeNotificationContext (context: ContextID): Promise<void> {
    const event: RemoveNotificationContextEvent = {
      type: EventType.RemoveNotificationContext,
      context
    }
    await this.rawClient.sendEvent(event)
  }

  async updateNotificationContext (context: ContextID, update: NotificationContextUpdate): Promise<void> {
    const event: UpdateNotificationContextEvent = {
      type: EventType.UpdateNotificationContext,
      context,
      update
    }
    await this.rawClient.sendEvent(event)
  }

  async findMessages (params: FindMessagesParams, queryId?: number): Promise<Message[]> {
    const rawMessages = await this.rawClient.findMessages(params, queryId)
    return rawMessages.map((it: any) => this.toMessage(it))
  }

  private toMessage (raw: any): Message {
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

  private toAttachment (raw: any): Attachment {
    return {
      message: raw.message,
      card: raw.card,
      creator: raw.creator,
      created: new Date(raw.created)
    }
  }

  private toReaction (raw: any): Reaction {
    return {
      message: raw.message,
      reaction: raw.reaction,
      creator: raw.creator,
      created: new Date(raw.created)
    }
  }

  async findNotificationContexts (
    params: FindNotificationContextParams,
    queryId?: number
  ): Promise<NotificationContext[]> {
    return await this.rawClient.findNotificationContexts(params, queryId)
  }

  async findNotifications (params: FindNotificationsParams, queryId?: number): Promise<Notification[]> {
    return await this.rawClient.findNotifications(params, queryId)
  }

  async unsubscribeQuery (id: number): Promise<void> {
    await this.rawClient.unsubscribeQuery(id)
  }

  close (): void {
    // do nothing
  }
}
