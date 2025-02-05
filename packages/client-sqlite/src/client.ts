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
  type Notification,
  type Attachment,
  type Reaction
} from '@hcengineering/communication-types'
import {
  type Client,
  type MessageCreatedEvent,
  type DbAdapter,
  EventType,
  type BroadcastEvent
} from '@hcengineering/communication-sdk-types'
import { createDbAdapter as createSqliteDbAdapter } from '@hcengineering/communication-sqlite-wasm'

class DbClient implements Client {
  onEvent: (event: BroadcastEvent) => void = () => {}

  constructor(
    private readonly db: DbAdapter,
    private readonly workspace: string,
    private readonly personalWorkspace: string
  ) {}

  async createMessage(card: CardID, content: RichText, creator: SocialID): Promise<MessageID> {
    const created = new Date()
    const id = await this.db.createMessage(this.workspace, card, content, creator, created)

    const event: MessageCreatedEvent = {
      type: EventType.MessageCreated,
      message: {
        id,
        card,
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

  async removeMessage(card: CardID, message: MessageID) {
    await this.db.removeMessage(message)
    this.onEvent({ type: EventType.MessageRemoved, message, card })
  }

  async createPatch(card: CardID, message: MessageID, content: RichText, creator: SocialID): Promise<void> {
    const created = new Date()
    await this.db.createPatch(message, content, creator, created)
    this.onEvent({ type: EventType.PatchCreated, card, patch: { message, content, creator, created } })
  }

  async createReaction(card: CardID, message: MessageID, reaction: string, creator: SocialID): Promise<void> {
    const created = new Date()
    await this.db.createReaction(message, reaction, creator, created)
    this.onEvent({ type: EventType.ReactionCreated, card, reaction: { message, reaction, creator, created } })
  }

  async removeReaction(card: CardID, message: MessageID, reaction: string, creator: SocialID): Promise<void> {
    await this.db.removeReaction(message, reaction, creator)
    this.onEvent({ type: EventType.ReactionRemoved, card, message, reaction, creator })
  }

  async createAttachment(card: CardID, message: MessageID, attachment: CardID, creator: SocialID): Promise<void> {
    const created = new Date()
    await this.db.createAttachment(message, card, creator, created)
    this.onEvent({
      type: EventType.AttachmentCreated,
      card,
      attachment: { message, card: attachment, creator, created }
    })
  }

  async removeAttachment(card: CardID, message: MessageID, attachment: CardID): Promise<void> {
    await this.db.removeAttachment(message, card)
    this.onEvent({ type: EventType.AttachmentRemoved, message, card, attachment })
  }

  async findMessages(params: FindMessagesParams): Promise<Message[]> {
    const rawMessages = await this.db.findMessages(this.workspace, params)
    return rawMessages.map((it) => this.toMessage(it))
  }

  async findMessage(params: FindMessagesParams): Promise<Message | undefined> {
    return (await this.findMessages({ ...params, limit: 1 }))[0]
  }

  toMessage(raw: any): Message {
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

  toAttachment(raw: any): Attachment {
    return {
      message: raw.message,
      card: raw.card,
      creator: raw.creator,
      created: new Date(raw.created)
    }
  }

  toReaction(raw: any): Reaction {
    return {
      message: raw.message,
      reaction: raw.reaction,
      creator: raw.creator,
      created: new Date(raw.created)
    }
  }
  async createNotification(message: MessageID, context: ContextID): Promise<void> {
    await this.db.createNotification(message, context)
  }

  async removeNotification(message: MessageID, context: ContextID): Promise<void> {
    await this.db.removeNotification(message, context)
  }

  async createNotificationContext(card: CardID, lastView?: Date, lastUpdate?: Date): Promise<ContextID> {
    return await this.db.createContext(this.personalWorkspace, this.workspace, card, lastView, lastUpdate)
  }

  async updateNotificationContext(context: ContextID, update: NotificationContextUpdate): Promise<void> {
    await this.db.updateContext(context, update)
  }

  async removeNotificationContext(context: ContextID): Promise<void> {
    await this.db.removeContext(context)
  }

  async findNotificationContexts(params: FindNotificationContextParams): Promise<NotificationContext[]> {
    //TODO: should we filter by workspace?
    return await this.db.findContexts(params, [this.personalWorkspace])
  }

  async findNotifications(params: FindNotificationsParams): Promise<Notification[]> {
    //TODO: should we filter by workspace?
    return await this.db.findNotifications(params, this.personalWorkspace)
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
  personalWorkspace: string,
  dbUrl = 'file:communication.sqlite3?vfs=opfs'
): Promise<Client> {
  const db = await createSqliteDbAdapter(dbUrl)
  return new DbClient(db, workspace, personalWorkspace)
}
