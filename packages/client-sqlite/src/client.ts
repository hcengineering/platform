import {
  type CardID,
  type Message,
  type FindMessagesParams,
  type MessageID,
  type RichText,
  type SocialID,
  type ContextID,
  type NotificationContextUpdate,
  type FindNotificationContextParams,
  type NotificationContext,
  type FindNotificationsParams,
  type Notification
} from '@communication/types'
import {
  type Client,
  type MessageCreatedEvent,
  type DbAdapter,
  EventType,
  type BroadcastEvent,
} from '@communication/sdk-types'
import { createDbAdapter as createSqliteDbAdapter } from '@communication/sqlite-wasm'

class DbClient implements Client {
  onEvent: (event: BroadcastEvent) => void = () => {}

  constructor(
    private readonly db: DbAdapter,
    private readonly workspace: string,
    private readonly personWorkspace: string
  ) {}

  async createMessage(card: CardID, content: RichText, creator: SocialID): Promise<MessageID> {
    const created = new Date()
    const id = await this.db.createMessage(content, creator, created)
    await this.db.placeMessage(id, card, this.workspace)

    const event: MessageCreatedEvent = {
      type: EventType.MessageCreated,
      card,
      message: {
        id,
        content,
        creator,
        created,
        edited: created,
        reactions: [],
        attachments: []
      }
    }

    this.onEvent(event)

    return id
  }

  async removeMessage(message: MessageID) {
    await this.db.removeMessage(message)
    this.onEvent({ type: EventType.MessageRemoved, message })
  }

  async createPatch(message: MessageID, content: RichText, creator: SocialID): Promise<void> {
    const created = new Date()
    await this.db.createPatch(message, content, creator, created)
    this.onEvent({ type: EventType.PatchCreated, patch: { message, content, creator, created } })
  }

  async createReaction(message: MessageID, reaction: string, creator: SocialID): Promise<void> {
    const created = new Date()
    await this.db.createReaction(message, reaction, creator, created)
    this.onEvent({ type: EventType.ReactionCreated, reaction: { message, reaction, creator, created } })
  }

  async removeReaction(message: MessageID, reaction: string, creator: SocialID): Promise<void> {
    await this.db.removeReaction(message, reaction, creator)
    this.onEvent({ type: EventType.ReactionRemoved, message, reaction, creator })
  }

  async createAttachment(message: MessageID, card: CardID, creator: SocialID): Promise<void> {
    const created = new Date()
    await this.db.createAttachment(message, card, creator, created)
    this.onEvent({ type: EventType.AttachmentCreated, attachment: { message, card, creator, created } })
  }

  async removeAttachment(message: MessageID, card: CardID): Promise<void> {
    await this.db.removeAttachment(message, card)
    this.onEvent({ type: EventType.AttachmentRemoved, message, card })
  }

  async findMessages(params: FindMessagesParams): Promise<Message[]> {
    const rawMessages = await this.db.findMessages(this.workspace, params)
    return rawMessages.map(this.toMessage)
  }

  async findMessage(params: FindMessagesParams): Promise<Message | undefined> {
    return (await this.findMessages({ ...params, limit: 1 }))[0]
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
    await this.db.createNotification(message, context)
  }

  async removeNotification(message: MessageID, context: ContextID): Promise<void> {
    await this.db.removeNotification(message, context)
  }

  async createNotificationContext(card: CardID, lastView?: Date, lastUpdate?: Date): Promise<ContextID> {
    return await this.db.createContext(this.workspace, card, this.personWorkspace, lastView, lastUpdate)
  }

  async updateNotificationContext(context: ContextID, update: NotificationContextUpdate): Promise<void> {
    await this.db.updateContext(context, update)
  }

  async removeNotificationContext(context: ContextID): Promise<void> {
    await this.db.removeContext(context)
  }

  async findNotificationContexts(params: FindNotificationContextParams): Promise<NotificationContext[]> {
    //TODO: should we filter by workspace?
    return await this.db.findContexts(params, [this.personWorkspace])
  }

  async findNotifications(params: FindNotificationsParams): Promise<Notification[]> {
    //TODO: should we filter by workspace?
    return await this.db.findNotifications(params, this.personWorkspace)
  }

  async unsubscribeQuery() {
    //ignore
  }

  close() {
    this.db.close()
  }
}

export async function getSqliteClient(
  workspace: string,
  personWorkspace: string,
  dbUrl = 'file:communication.sqlite3?vfs=opfs'
): Promise<Client> {
  const db = await createSqliteDbAdapter(dbUrl)
  return new DbClient(db, workspace, personWorkspace)
}
