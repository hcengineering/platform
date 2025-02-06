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
import {
  type Client as PlatformClient,
  type ClientConnection as PlatformConnection,
  getCurrentAccount
} from '@hcengineering/core'
import {
  initLiveQueries,
  createMessagesQuery,
  createNotificationsQuery
} from '@hcengineering/communication-client-query'

export { createMessagesQuery, createNotificationsQuery }

interface Connection extends PlatformConnection {
  findMessages: (params: FindMessagesParams, queryId?: number) => Promise<Message[]>
  findNotificationContexts: (params: FindNotificationContextParams, queryId?: number) => Promise<NotificationContext[]>
  findNotifications: (params: FindNotificationsParams, queryId?: number) => Promise<Notification[]>
  sendEvent: (event: Event) => Promise<EventResult>
  unsubscribeQuery: (id: number) => Promise<void>
}

let client: CommunicationClient

export type CommunicationClient = Client

export function getCommunicationClient (): CommunicationClient {
  return client
}

export async function setCommunicationClient (platformClient: PlatformClient): Promise<void> {
  const connection = platformClient.getConnection?.()
  if (connection === undefined) {
    return
  }
  client = new Client(connection as unknown as Connection)
  initLiveQueries(client)
}

class Client {
  onEvent: (event: BroadcastEvent) => void = () => {}

  constructor (private readonly connection: Connection) {
    connection.pushHandler((...events: any[]) => {
      for (const event of events) {
        if (event != null && 'type' in event) {
          this.onEvent(event as BroadcastEvent)
        }
      }
    })
  }

  private getSocialId (): SocialID {
    // TODO: get correct social id
    return getCurrentAccount().primarySocialId
  }

  async createMessage (card: CardID, content: RichText): Promise<MessageID> {
    const event: CreateMessageEvent = {
      type: EventType.CreateMessage,
      card,
      content,
      creator: this.getSocialId()
    }
    const result = await this.connection.sendEvent(event)
    return (result as CreateMessageResult).id
  }

  async removeMessage (card: CardID, message: MessageID): Promise<void> {
    const event: RemoveMessageEvent = {
      type: EventType.RemoveMessage,
      card,
      message
    }
    await this.connection.sendEvent(event)
  }

  async createPatch (card: CardID, message: MessageID, content: RichText): Promise<void> {
    const event: CreatePatchEvent = {
      type: EventType.CreatePatch,
      card,
      message,
      content,
      creator: this.getSocialId()
    }
    await this.connection.sendEvent(event)
  }

  async createReaction (card: CardID, message: MessageID, reaction: string): Promise<void> {
    const event: CreateReactionEvent = {
      type: EventType.CreateReaction,
      card,
      message,
      reaction,
      creator: this.getSocialId()
    }
    await this.connection.sendEvent(event)
  }

  async removeReaction (card: CardID, message: MessageID, reaction: string): Promise<void> {
    const event: RemoveReactionEvent = {
      type: EventType.RemoveReaction,
      card,
      message,
      reaction,
      creator: this.getSocialId()
    }
    await this.connection.sendEvent(event)
  }

  async createAttachment (card: CardID, message: MessageID, attachment: CardID): Promise<void> {
    const event: CreateAttachmentEvent = {
      type: EventType.CreateAttachment,
      card,
      message,
      attachment,
      creator: this.getSocialId()
    }
    await this.connection.sendEvent(event)
  }

  async removeAttachment (card: CardID, message: MessageID, attachment: CardID): Promise<void> {
    const event: RemoveAttachmentEvent = {
      type: EventType.RemoveAttachment,
      card,
      message,
      attachment
    }
    await this.connection.sendEvent(event)
  }

  async createNotification (message: MessageID, context: ContextID): Promise<void> {
    const event: CreateNotificationEvent = {
      type: EventType.CreateNotification,
      message,
      context
    }
    await this.connection.sendEvent(event)
  }

  async removeNotification (message: MessageID, context: ContextID): Promise<void> {
    const event: RemoveNotificationEvent = {
      type: EventType.RemoveNotification,
      message,
      context
    }
    await this.connection.sendEvent(event)
  }

  async createNotificationContext (card: CardID, lastView?: Date, lastUpdate?: Date): Promise<ContextID> {
    const event: CreateNotificationContextEvent = {
      type: EventType.CreateNotificationContext,
      card,
      lastView,
      lastUpdate
    }
    const result = await this.connection.sendEvent(event)
    return (result as CreateNotificationContextResult).id
  }

  async removeNotificationContext (context: ContextID): Promise<void> {
    const event: RemoveNotificationContextEvent = {
      type: EventType.RemoveNotificationContext,
      context
    }
    await this.connection.sendEvent(event)
  }

  async updateNotificationContext (context: ContextID, update: NotificationContextUpdate): Promise<void> {
    const event: UpdateNotificationContextEvent = {
      type: EventType.UpdateNotificationContext,
      context,
      update
    }
    await this.connection.sendEvent(event)
  }

  async findMessages (params: FindMessagesParams, queryId?: number): Promise<Message[]> {
    const rawMessages = await this.connection.findMessages(params, queryId)
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
    return await this.connection.findNotificationContexts(params, queryId)
  }

  async findNotifications (params: FindNotificationsParams, queryId?: number): Promise<Notification[]> {
    return await this.connection.findNotifications(params, queryId)
  }

  async unsubscribeQuery (id: number): Promise<void> {
    await this.connection.unsubscribeQuery(id)
  }

  close (): void {
    // do nothing
  }
}
