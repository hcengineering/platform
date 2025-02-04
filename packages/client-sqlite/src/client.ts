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
  type ThreadID,
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

  async createMessage(thread: ThreadID, content: RichText, creator: SocialID): Promise<MessageID> {
    const created = new Date()
    const id = await this.db.createMessage(this.workspace, thread, content, creator, created)

    const event: MessageCreatedEvent = {
      type: EventType.MessageCreated,
      message: {
        id,
        thread,
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

  async removeMessage(thread: ThreadID, message: MessageID) {
    await this.db.removeMessage(message)
    this.onEvent({ type: EventType.MessageRemoved, message, thread })
  }

  async createPatch(thread: ThreadID, message: MessageID, content: RichText, creator: SocialID): Promise<void> {
    const created = new Date()
    await this.db.createPatch(message, content, creator, created)
    this.onEvent({ type: EventType.PatchCreated, thread, patch: { message, content, creator, created } })
  }

  async createReaction(thread: ThreadID, message: MessageID, reaction: string, creator: SocialID): Promise<void> {
    const created = new Date()
    await this.db.createReaction(message, reaction, creator, created)
    this.onEvent({ type: EventType.ReactionCreated, thread, reaction: { message, reaction, creator, created } })
  }

  async removeReaction(thread: ThreadID, message: MessageID, reaction: string, creator: SocialID): Promise<void> {
    await this.db.removeReaction(message, reaction, creator)
    this.onEvent({ type: EventType.ReactionRemoved, thread, message, reaction, creator })
  }

  async createAttachment(thread: ThreadID, message: MessageID, card: CardID, creator: SocialID): Promise<void> {
    const created = new Date()
    await this.db.createAttachment(message, card, creator, created)
    this.onEvent({ type: EventType.AttachmentCreated, thread, attachment: { message, card, creator, created } })
  }

  async removeAttachment(thread: ThreadID, message: MessageID, card: CardID): Promise<void> {
    await this.db.removeAttachment(message, card)
    this.onEvent({ type: EventType.AttachmentRemoved, message, card, thread })
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
      thread: raw.thread,
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
