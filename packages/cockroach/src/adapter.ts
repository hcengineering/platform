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
  type BlobID,
  type MessagesGroup,
  type FindMessagesGroupsParams,
  type WorkspaceID
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
    private readonly sqlClient: postgres.Sql,
    private readonly workspace: WorkspaceID
  ) {
    this.message = new MessagesDb(this.sqlClient, this.workspace)
    this.notification = new NotificationsDb(this.sqlClient, this.workspace)
  }

  async createMessage(card: CardID, content: RichText, creator: SocialID, created: Date): Promise<MessageID> {
    return await this.message.createMessage(card, content, creator, created)
  }

  async createPatch(
    card: CardID,
    message: MessageID,
    content: RichText,
    creator: SocialID,
    created: Date
  ): Promise<void> {
    return await this.message.createPatch(card, message, content, creator, created)
  }

  async removeMessage(card: CardID, message: MessageID): Promise<MessageID | undefined> {
    return await this.message.removeMessage(card, message)
  }

  async removeMessages(card: CardID, ids: MessageID[]): Promise<MessageID[]> {
    return await this.message.removeMessages(card, ids)
  }

  async createMessagesGroup(
    card: CardID,
    blobId: BlobID,
    from_id: MessageID,
    to_id: MessageID,
    from_date: Date,
    to_date: Date,
    count: number
  ): Promise<void> {
    return await this.message.createMessagesGroup(card, blobId, from_id, to_id, from_date, to_date, count)
  }

  async createReaction(
    card: CardID,
    message: MessageID,
    reaction: string,
    creator: SocialID,
    created: Date
  ): Promise<void> {
    return await this.message.createReaction(card, message, reaction, creator, created)
  }

  async removeReaction(card: CardID, message: MessageID, reaction: string, creator: SocialID): Promise<void> {
    return await this.message.removeReaction(card, message, reaction, creator)
  }

  async createAttachment(message: MessageID, attachment: CardID, creator: SocialID, created: Date): Promise<void> {
    return await this.message.createAttachment(message, attachment, creator, created)
  }

  async removeAttachment(message: MessageID, attachment: CardID): Promise<void> {
    return await this.message.removeAttachment(message, attachment)
  }

  async findMessages(params: FindMessagesParams): Promise<Message[]> {
    return await this.message.find(params)
  }

  async findMessagesGroups(params: FindMessagesGroupsParams): Promise<MessagesGroup[]> {
    return await this.message.findGroups(params)
  }

  async createNotification(message: MessageID, context: ContextID): Promise<void> {
    return await this.notification.createNotification(message, context)
  }

  async removeNotification(message: MessageID, context: ContextID): Promise<void> {
    return await this.notification.removeNotification(message, context)
  }

  async createContext(
    personalWorkspace: WorkspaceID,
    card: CardID,
    lastView?: Date,
    lastUpdate?: Date
  ): Promise<ContextID> {
    return await this.notification.createContext(personalWorkspace, card, lastView, lastUpdate)
  }

  async updateContext(context: ContextID, update: NotificationContextUpdate): Promise<void> {
    return await this.notification.updateContext(context, update)
  }

  async removeContext(context: ContextID): Promise<void> {
    return await this.notification.removeContext(context)
  }

  async findContexts(
    params: FindNotificationContextParams,
    personalWorkspaces: WorkspaceID[],
    workspace?: WorkspaceID
  ): Promise<NotificationContext[]> {
    return await this.notification.findContexts(params, personalWorkspaces, workspace)
  }

  async findNotifications(
    params: FindNotificationsParams,
    personalWorkspace: WorkspaceID,
    workspace?: WorkspaceID
  ): Promise<Notification[]> {
    return await this.notification.findNotifications(params, personalWorkspace, workspace)
  }

  close(): void {
    this.db.close()
  }
}

export async function createDbAdapter(connectionString: string, workspace: WorkspaceID): Promise<DbAdapter> {
  const db = connect(connectionString)
  const sqlClient = await db.getClient()

  return new CockroachAdapter(db, sqlClient, workspace)
}
