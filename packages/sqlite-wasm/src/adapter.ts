import {
  type Message,
  type FindMessagesParams,
  type CardID,
  type RichText,
  type SocialID,
  type MessageID,
  type ContextID,
  type NotificationContextUpdate,
  type FindNotificationsParams,
  type FindNotificationContextParams,
  type NotificationContext,
  type Notification,
  type BlobID
} from '@hcengineering/communication-types'
import type { DbAdapter } from '@hcengineering/communication-sdk-types'

import { initializeSQLite, type Sqlite3Worker1Promiser } from './connection'
import { applyMigrations } from './migrations.ts'
import { MessagesDb } from './db/message.ts'
import { NotificationsDb } from './db/notification.ts'

export class SqliteAdapter implements DbAdapter {
  private readonly message: MessagesDb
  private readonly notification: NotificationsDb

  constructor(
    private readonly worker: Sqlite3Worker1Promiser,
    private readonly dbId: string
  ) {
    this.message = new MessagesDb(worker, dbId)
    this.notification = new NotificationsDb(worker, dbId)
  }

  async createMessage(
    workspace: string,
    card: CardID,
    content: RichText,
    creator: SocialID,
    created: Date
  ): Promise<MessageID> {
    return await this.message.createMessage(workspace, card, content, creator, created)
  }

  async createPatch(message: MessageID, content: RichText, creator: SocialID, created: Date): Promise<void> {
    return await this.message.createPatch(message, content, creator, created)
  }

  async removeMessage(message: MessageID): Promise<void> {
    return await this.message.removeMessage(message)
  }

  /* eslint-disable @typescript-eslint/no-unused-vars */
  async createMessagesGroup(
    workspace: string,
    card: CardID,
    startAt: Date,
    endAt: Date,
    blobId: BlobID,
    count: number
  ): Promise<void> {
    //TODO: implement
  }

  async createReaction(message: MessageID, reaction: string, creator: SocialID, created: Date): Promise<void> {
    return await this.message.createReaction(message, reaction, creator, created)
  }

  async removeReaction(message: MessageID, reaction: string, creator: SocialID): Promise<void> {
    return await this.message.removeReaction(message, reaction, creator)
  }

  async createAttachment(message: MessageID, attachment: CardID, creator: SocialID, created: Date): Promise<void> {
    return await this.message.createAttachment(message, attachment, creator, created)
  }

  async removeAttachment(message: MessageID, attachment: CardID): Promise<void> {
    return await this.message.removeAttachment(message, attachment)
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

  async removeContext(context: ContextID): Promise<void> {
    return await this.notification.removeContext(context)
  }

  async updateContext(context: ContextID, update: NotificationContextUpdate): Promise<void> {
    return await this.notification.updateContext(context, update)
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
    void this.worker('close')
  }
}

export async function createDbAdapter(connectionString: string): Promise<DbAdapter> {
  const { worker, dbId } = await initializeSQLite(connectionString)

  await applyMigrations(worker, dbId)
  return new SqliteAdapter(worker, dbId)
}
