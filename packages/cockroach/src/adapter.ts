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

import type postgres from 'postgres'
import {
  type FindCollaboratorsParams,
  type AccountID,
  type BlobID,
  type CardID,
  type Collaborator,
  type ContextID,
  type FindMessagesGroupsParams,
  type FindMessagesParams,
  type FindNotificationContextParams,
  type FindNotificationsParams,
  type Message,
  type MessageID,
  type MessagesGroup,
  type MessageType,
  type Notification,
  type NotificationContext,
  type PatchType,
  type RichText,
  type SocialID,
  type Thread,
  type WorkspaceID,
  type NotificationID,
  type Label,
  type FindLabelsParams,
  type LabelID,
  type CardType,
  type MessageData,
  type PatchData,
  type File,
  type BlobMetadata
} from '@hcengineering/communication-types'
import type { DbAdapter } from '@hcengineering/communication-sdk-types'

import { MessagesDb } from './db/message'
import { NotificationsDb } from './db/notification'
import { connect, type PostgresClientReference } from './connection'
import { type Logger, type Options, type SqlClient, type SqlParams, type SqlRow } from './types'
import { injectVars } from './utils'
import { initSchema } from './init'
import { LabelsDb } from './db/label'

export class CockroachAdapter implements DbAdapter {
  private readonly message: MessagesDb
  private readonly notification: NotificationsDb
  private readonly label: LabelsDb

  constructor(
    private readonly sql: SqlClient,
    private readonly workspace: WorkspaceID,
    private readonly logger?: Logger,
    private readonly options?: Options
  ) {
    this.message = new MessagesDb(this.sql, this.workspace, logger, options)
    this.notification = new NotificationsDb(this.sql, this.workspace, logger, options)
    this.label = new LabelsDb(this.sql, this.workspace, logger, options)
  }

  async createMessage(
    card: CardID,
    type: MessageType,
    content: RichText,
    creator: SocialID,
    created: Date,
    data?: MessageData,
    externalId?: string,
    id?: MessageID
  ): Promise<MessageID> {
    return await this.message.createMessage(card, type, content, creator, created, data, externalId, id)
  }

  async removeMessages(card: CardID, messages?: MessageID[], socialIds?: SocialID[]): Promise<MessageID[]> {
    return await this.message.removeMessages(card, messages, socialIds)
  }

  async createPatch(
    card: CardID,
    message: MessageID,
    messageCreated: Date,
    type: PatchType,
    data: PatchData,
    creator: SocialID,
    created: Date
  ): Promise<void> {
    await this.message.createPatch(card, message, messageCreated, type, data, creator, created)
  }

  async removePatches(card: CardID): Promise<void> {
    await this.message.removePatches(card)
  }

  async createMessagesGroup(card: CardID, blobId: BlobID, fromDate: Date, toDate: Date, count: number): Promise<void> {
    await this.message.createMessagesGroup(card, blobId, fromDate, toDate, count)
  }

  async removeMessagesGroup(card: CardID, blobId: BlobID): Promise<void> {
    await this.message.removeMessagesGroup(card, blobId)
  }

  async createReaction(
    card: CardID,
    message: MessageID,
    messageCreated: Date,
    reaction: string,
    creator: SocialID,
    created: Date
  ): Promise<void> {
    await this.message.createReaction(card, message, messageCreated, reaction, creator, created)
  }

  async removeReaction(
    card: CardID,
    message: MessageID,
    messageCreated: Date,
    reaction: string,
    creator: SocialID
  ): Promise<void> {
    await this.message.removeReaction(card, message, messageCreated, reaction, creator, new Date())
  }

  async createFile(
    card: CardID,
    message: MessageID,
    messageCreated: Date,
    blobId: BlobID,
    fileType: string,
    filename: string,
    size: number,
    meta: BlobMetadata | undefined,
    creator: SocialID,
    created: Date
  ): Promise<void> {
    await this.message.createFile(
      card,
      message,
      messageCreated,
      blobId,
      fileType,
      filename,
      size,
      meta,
      creator,
      created
    )
  }

  async removeFiles(query: Partial<File>): Promise<void> {
    await this.message.removeFiles(query)
  }

  async createThread(
    card: CardID,
    message: MessageID,
    messageCreated: Date,
    thread: CardID,
    threadType: CardType,
    created: Date
  ): Promise<void> {
    await this.message.createThread(card, message, messageCreated, thread, threadType, created)
  }

  async removeThreads(query: Partial<Thread>): Promise<void> {
    await this.message.removeThreads(query)
  }

  async updateThread(
    thread: CardID,
    update: {
      threadType?: CardType
      op?: 'increment' | 'decrement'
      lastReply?: Date
    }
  ): Promise<void> {
    await this.message.updateThread(thread, update)
  }

  async findMessages(params: FindMessagesParams): Promise<Message[]> {
    return await this.message.find(params)
  }

  async findMessagesGroups(params: FindMessagesGroupsParams): Promise<MessagesGroup[]> {
    return await this.message.findMessagesGroups(params)
  }

  async findThread(thread: CardID): Promise<Thread | undefined> {
    return await this.message.findThread(thread)
  }

  async addCollaborators(
    card: CardID,
    cardType: CardType,
    collaborators: AccountID[],
    date?: Date
  ): Promise<AccountID[]> {
    return await this.notification.addCollaborators(card, cardType, collaborators, date)
  }

  async removeCollaborators(card: CardID, collaborators?: AccountID[]): Promise<void> {
    await this.notification.removeCollaborators(card, collaborators)
  }

  async updateCollaborators(params: FindCollaboratorsParams, data: Partial<Collaborator>): Promise<void> {
    await this.notification.updateCollaborators(params, data)
  }

  async createNotification(context: ContextID, message: MessageID, messageCreated: Date): Promise<NotificationID> {
    return await this.notification.createNotification(context, message, messageCreated)
  }

  async removeNotification(context: ContextID, account: AccountID, untilDate: Date): Promise<void> {
    await this.notification.removeNotifications(context, account, untilDate)
  }

  async createContext(account: AccountID, card: CardID, lastUpdate: Date, lastView: Date): Promise<ContextID> {
    return await this.notification.createContext(account, card, lastUpdate, lastView)
  }

  async updateContext(context: ContextID, account: AccountID, lastUpdate?: Date, lastView?: Date): Promise<void> {
    await this.notification.updateContext(context, account, lastUpdate, lastView)
  }

  async removeContexts(query: Partial<NotificationContext>): Promise<void> {
    await this.notification.removeContexts(query)
  }

  async findNotificationContexts(params: FindNotificationContextParams): Promise<NotificationContext[]> {
    return await this.notification.findContexts(params)
  }

  async findNotifications(params: FindNotificationsParams): Promise<Notification[]> {
    return await this.notification.findNotifications(params)
  }

  async findCollaborators(params: FindCollaboratorsParams): Promise<Collaborator[]> {
    return await this.notification.findCollaborators(params)
  }

  close(): void {
    this.sql.close()
  }

  getCollaboratorsCursor(card: CardID, date: Date, size?: number): AsyncIterable<Collaborator[]> {
    return this.notification.getCollaboratorsCursor(card, date, size)
  }

  createLabel(label: LabelID, card: CardID, cardType: CardType, account: AccountID, created: Date): Promise<void> {
    return this.label.createLabel(label, card, cardType, account, created)
  }

  removeLabels(query: Partial<Label>): Promise<void> {
    return this.label.removeLabels(query)
  }

  findLabels(params: FindLabelsParams): Promise<Label[]> {
    return this.label.findLabels(params)
  }
  updateLabels(params: FindLabelsParams, data: Partial<Label>): Promise<void> {
    return this.label.updateLabels(params, data)
  }

  //TODO: remove it!
  async getAccountByPersonId(_id: string): Promise<AccountID | undefined> {
    const sql = `SELECT data ->> 'personUuid' AS "personUuid"
                 FROM public.contact
                 WHERE "workspaceId" = $1::uuid
                   AND _id = $2::varchar
                 LIMIT 1`
    const result = await this.sql.execute(sql, [this.workspace, _id])

    return result?.[0]?.personUuid as AccountID
  }
}

export async function createDbAdapter(
  connectionString: string,
  workspace: WorkspaceID,
  logger?: Logger,
  options?: Options
): Promise<DbAdapter> {
  const connection = connect(connectionString)
  const sql = await connection.getClient()
  await initSchema(sql)

  const client = new CockroachClient(connection, sql)

  return new CockroachAdapter(client, workspace, logger, options)
}

class CockroachClient implements SqlClient {
  constructor(
    private readonly db: PostgresClientReference,
    private readonly sql: postgres.Sql
  ) {}

  async execute<T = SqlRow>(query: string, params?: SqlParams): Promise<T[]> {
    const sql = params !== undefined && params.length > 0 ? injectVars(query, params) : query
    return await this.sql.unsafe<T[]>(sql)
  }

  cursor<T = SqlRow>(query: string, params?: SqlParams, size?: number): AsyncIterable<NonNullable<T[][number]>[]> {
    const sql = params !== undefined && params.length > 0 ? injectVars(query, params) : query

    return this.sql.unsafe<T[]>(sql).cursor(size)
  }

  close(): void {
    this.db.close()
  }
}
