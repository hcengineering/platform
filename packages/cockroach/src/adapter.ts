import type postgres from 'postgres'
import {
  type Message,
  type FindMessagesParams,
  type CardID,
  type RichText,
  type SocialID,
  type MessageID,
  type ContextID,
  type NotificationContextUpdate,
  type FindNotificationContextParams,
  type NotificationContext,
  type FindNotificationsParams,
  type Notification,
  type ThreadID
} from '@hcengineering/communication-types'
import type { DbAdapter } from '@hcengineering/communication-sdk-types'

import { MessagesDb } from './db/message'
import { NotificationsDb } from './db/notification'
import { connect, type PostgresClientReference } from './connection'

export class CockroachAdapter implements DbAdapter {
  private readonly message: MessagesDb
  private readonly notification: NotificationsDb

  constructor(
    private readonly db: PostgresClientReference,
    private readonly sqlClient: postgres.Sql
  ) {
    this.message = new MessagesDb(this.sqlClient)
    this.notification = new NotificationsDb(this.sqlClient)
  }

  async createMessage(
    workspace: string,
    thread: ThreadID,
    content: RichText,
    creator: SocialID,
    created: Date
  ): Promise<MessageID> {
    return await this.message.createMessage(workspace, thread, content, creator, created)
  }

  async createPatch(message: MessageID, content: RichText, creator: SocialID, created: Date): Promise<void> {
    return await this.message.createPatch(message, content, creator, created)
  }

  async removeMessage(message: MessageID): Promise<void> {
    return await this.message.removeMessage(message)
  }

  async createReaction(message: MessageID, reaction: string, creator: SocialID, created: Date): Promise<void> {
    return await this.message.createReaction(message, reaction, creator, created)
  }

  async removeReaction(message: MessageID, reaction: string, creator: SocialID): Promise<void> {
    return await this.message.removeReaction(message, reaction, creator)
  }

  async createAttachment(message: MessageID, card: CardID, creator: SocialID, created: Date): Promise<void> {
    return await this.message.createAttachment(message, card, creator, created)
  }

  async removeAttachment(message: MessageID, card: CardID): Promise<void> {
    return await this.message.removeAttachment(message, card)
  }

  async findMessages(workspace: string, params: FindMessagesParams): Promise<Message[]> {
    return await this.message.find(workspace, params)
  }

  async createNotification(message: MessageID, context: ContextID): Promise<void> {
    return await this.notification.createNotification(message, context)
  }

  async removeNotification(message: MessageID, context: ContextID): Promise<void> {
    return await this.notification.removeNotification(message, context)
  }

  async createContext(
    workspace: string,
    card: CardID,
    personalWorkspace: string,
    lastView?: Date,
    lastUpdate?: Date
  ): Promise<ContextID> {
    return await this.notification.createContext(workspace, card, personalWorkspace, lastView, lastUpdate)
  }

  async updateContext(context: ContextID, update: NotificationContextUpdate): Promise<void> {
    return await this.notification.updateContext(context, update)
  }

  async removeContext(context: ContextID): Promise<void> {
    return await this.notification.removeContext(context)
  }

  async findContexts(
    params: FindNotificationContextParams,
    personalWorkspaces: string[],
    workspace?: string
  ): Promise<NotificationContext[]> {
    return await this.notification.findContexts(params, personalWorkspaces, workspace)
  }

  async findNotifications(
    params: FindNotificationsParams,
    personalWorkspace: string,
    workspace?: string
  ): Promise<Notification[]> {
    return await this.notification.findNotifications(params, personalWorkspace, workspace)
  }

  close(): void {
    this.db.close()
  }
}

export async function createDbAdapter(connectionString: string): Promise<DbAdapter> {
  const db = connect(connectionString)
  const sqlClient = await db.getClient()

  return new CockroachAdapter(db, sqlClient)
}
