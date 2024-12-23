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
  type Notification
} from '@communication/types'
import type { DbAdapter } from '@communication/sdk-types'

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

  async createMessage(content: RichText, creator: SocialID, created: Date): Promise<MessageID> {
    return await this.message.createMessage(content, creator, created)
  }

  async placeMessage(message: MessageID, card: CardID, workspace: string): Promise<void> {
    return await this.message.placeMessage(message, card, workspace)
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
    personWorkspace: string,
    lastView?: Date,
    lastUpdate?: Date
  ): Promise<ContextID> {
    return await this.notification.createContext(workspace, card, personWorkspace, lastView, lastUpdate)
  }

  async updateContext(context: ContextID, update: NotificationContextUpdate): Promise<void> {
    return await this.notification.updateContext(context, update)
  }

  async removeContext(context: ContextID): Promise<void> {
    return await this.notification.removeContext(context)
  }

  async findContexts(
    params: FindNotificationContextParams,
    personWorkspaces: string[],
    workspace?: string
  ): Promise<NotificationContext[]> {
    return await this.notification.findContexts(params, personWorkspaces, workspace)
  }

  async findNotifications(
    params: FindNotificationsParams,
    personWorkspace: string,
    workspace?: string
  ): Promise<Notification[]> {
    return await this.notification.findNotifications(params, personWorkspace, workspace)
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
