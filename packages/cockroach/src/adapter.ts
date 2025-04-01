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
  type NotificationID
} from '@hcengineering/communication-types'
import type { DbAdapter } from '@hcengineering/communication-sdk-types'
import { retry } from '@hcengineering/communication-shared'

import { MessagesDb } from './db/message'
import { NotificationsDb } from './db/notification'
import { connect, type PostgresClientReference } from './connection'
import { type Logger, type Options, type SqlClient, type SqlParams, type SqlRow } from './types'
import { injectVars } from './utils'
import { initSchema } from './init'

export class CockroachAdapter implements DbAdapter {
  private readonly message: MessagesDb
  private readonly notification: NotificationsDb

  constructor(
    private readonly sql: SqlClient,
    private readonly workspace: WorkspaceID,
    private readonly logger?: Logger,
    private readonly options?: Options
  ) {
    this.message = new MessagesDb(this.sql, this.workspace, logger, options)
    this.notification = new NotificationsDb(this.sql, this.workspace, logger, options)
  }

  async createMessage(
    card: CardID,
    type: MessageType,
    content: RichText,
    creator: SocialID,
    created: Date,
    data?: any
  ): Promise<MessageID> {
    return await this.message.createMessage(card, type, content, creator, created, data)
  }

  async removeMessages(card: CardID, messages: MessageID[], socialIds?: SocialID[]): Promise<MessageID[]> {
    return await this.message.removeMessages(card, messages, socialIds)
  }

  async createPatch(
    card: CardID,
    message: MessageID,
    type: PatchType,
    content: RichText,
    creator: SocialID,
    created: Date
  ): Promise<void> {
    await this.message.createPatch(card, message, type, content, creator, created)
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
    reaction: string,
    creator: SocialID,
    created: Date
  ): Promise<void> {
    await this.message.createReaction(card, message, reaction, creator, created)
  }

  async removeReaction(card: CardID, message: MessageID, reaction: string, creator: SocialID): Promise<void> {
    await this.message.removeReaction(card, message, reaction, creator, new Date())
  }

  async createFile(
    card: CardID,
    message: MessageID,
    blobId: BlobID,
    fileType: string,
    filename: string,
    size: number,
    creator: SocialID,
    created: Date
  ): Promise<void> {
    await this.message.createFile(card, message, blobId, fileType, filename, size, creator, created)
  }

  async removeFile(card: CardID, message: MessageID, blobId: BlobID): Promise<void> {
    await this.message.removeFile(card, message, blobId)
  }

  async createThread(card: CardID, message: MessageID, thread: CardID, created: Date): Promise<void> {
    await this.message.createThread(card, message, thread, created)
  }

  async updateThread(thread: CardID, op: 'increment' | 'decrement', lastReply?: Date): Promise<void> {
    await this.message.updateThread(thread, op, lastReply)
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

  async addCollaborators(card: CardID, collaborators: AccountID[], date?: Date): Promise<void> {
    await this.notification.addCollaborators(card, collaborators, date)
  }

  async removeCollaborators(card: CardID, collaborators: AccountID[]): Promise<void> {
    await this.notification.removeCollaborators(card, collaborators)
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

  async removeContext(context: ContextID, account: AccountID): Promise<void> {
    await this.notification.removeContext(context, account)
  }

  async findContexts(params: FindNotificationContextParams): Promise<NotificationContext[]> {
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
}

export async function createDbAdapter(
  connectionString: string,
  workspace: WorkspaceID,
  logger?: Logger,
  options?: Options
): Promise<DbAdapter> {
  const greenUrl = process.env.GREEN_URL ?? ''
  const connection = connect(connectionString)
  const sql = await connection.getClient()
  await initSchema(sql)

  if (greenUrl !== '') {
    const client = new GreenClient(greenUrl, sql)
    return new CockroachAdapter(client, workspace, logger, options)
  } else {
    const client = new CockroachClient(connection, sql)

    return new CockroachAdapter(client, workspace, logger, options)
  }
}

class GreenClient implements SqlClient {
  private readonly url: string
  private readonly token: string
  constructor(
    private readonly endpoint: string,
    private readonly sql: postgres.Sql
  ) {
    const url = new URL(this.endpoint)
    this.token = url.searchParams.get('token') ?? 'secret'

    const compression = url.searchParams.get('compression') ?? ''

    const newHost = url.host
    const newPathname = url.pathname
    const newSearchParams = new URLSearchParams()

    if (compression !== '') {
      newSearchParams.set('compression', compression)
    }

    this.url = `${url.protocol}//${newHost}${newPathname}${newSearchParams.size > 0 ? '?' + newSearchParams.toString() : ''}`
  }

  async execute<T = SqlRow>(query: string, params?: SqlParams): Promise<T[]> {
    return await retry(() => this.fetch<T[]>(query, params), { retries: 5 })
  }

  cursor<T = SqlRow>(query: string, params?: SqlParams, size?: number): AsyncIterable<NonNullable<T[][number]>[]> {
    const sql = params !== undefined && params.length > 0 ? injectVars(query, params) : query

    return this.sql.unsafe<T[]>(sql).cursor(size)
  }

  close(): void {
    // do nothing
  }

  private async fetch<T = SqlRow>(query: string, params?: SqlParams): Promise<T> {
    const url = this.url.endsWith('/') ? this.url + 'api/v1/sql' : this.url + '/api/v1/sql'

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + this.token,
        Connection: 'keep-alive'
      },
      body: JSON.stringify({ query, params }, (_, value) => (typeof value === 'bigint' ? value.toString() : value))
    })

    if (!response.ok) {
      throw new Error(`Failed to execute sql: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  }
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
