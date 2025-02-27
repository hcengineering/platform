//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

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
  type BlobID,
  type MessagesGroup,
  type FindMessagesGroupsParams
} from '@hcengineering/communication-types'
import type { DbAdapter } from '@hcengineering/communication-sdk-types'

import { initializeSQLite, type Sqlite3Worker1Promiser } from './connection'
import { applyMigrations } from './migrations.ts'
import { MessagesDb } from './db/message.ts'
import { NotificationsDb } from './db/notification.ts'

//TODO: FIXME
//export class SqliteAdapter implements DbAdapter
export class SqliteAdapter {
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

  async createPatch(
    workspace: string,
    card: CardID,
    message: MessageID,
    content: RichText,
    creator: SocialID,
    created: Date
  ): Promise<void> {
    //TODO: FIXME
    return await this.message.createPatch(message, content, creator, created)
  }

  async removeMessage(workspace: string, card: CardID, id: MessageID): Promise<MessageID> {
    await this.message.removeMessage(id)
    return id
  }

  async removeMessages(workspace: string, card: CardID, ids: MessageID[]): Promise<MessageID[]> {
    //TODO: implement
    return ids
  }

  /* eslint-disable @typescript-eslint/no-unused-vars */
  async createMessagesGroup(
    workspace: string,
    card: CardID,
    blobId: BlobID,
    from_date: Date,
    to_date: Date,
    count: number
  ): Promise<void> {
    //TODO: implement
  }

  async findMessagesGroups(workspace: string, params: FindMessagesGroupsParams): Promise<MessagesGroup[]> {
    //TODO: implement
    return []
  }

  async createReaction(
    workspace: string,
    card: CardID,
    message: MessageID,
    reaction: string,
    creator: SocialID,
    created: Date
  ): Promise<void> {
    //TODO: FIXME
    return await this.message.createReaction(message, reaction, creator, created)
  }

  async removeReaction(
    workspace: string,
    card: CardID,
    message: MessageID,
    reaction: string,
    creator: SocialID
  ): Promise<void> {
    //TODO: FIXME
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
  //TODO: FIXME
  return new SqliteAdapter(worker, dbId) as unknown as DbAdapter
}
