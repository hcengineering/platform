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

import type { ParameterOrJSON, Row } from 'postgres'
import type postgres from 'postgres'
import {
  type BlobID,
  type CardID,
  type ContextID,
  type FindMessagesGroupsParams,
  type FindMessagesParams,
  type FindNotificationContextParams,
  type FindNotificationsParams,
  type Message,
  type MessageID,
  type MessagesGroup,
  type Notification,
  type NotificationContext,
  type NotificationContextUpdate,
  type PatchType,
  type RichText,
  type SocialID,
  type WorkspaceID,
  type Thread
} from '@hcengineering/communication-types'
import type { DbAdapter } from '@hcengineering/communication-sdk-types'
import { retry } from '@hcengineering/communication-shared'

import { MessagesDb } from './db/message'
import { NotificationsDb } from './db/notification'
import { connect, type PostgresClientReference } from './connection'
import { type Options, type Logger, type SqlClient } from './types'
import { injectVars } from './utils.ts'

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

  async createMessage(card: CardID, content: RichText, creator: SocialID, created: Date): Promise<MessageID> {
    return await this.message.createMessage(card, content, creator, created)
  }

  async removeMessage(card: CardID, message: MessageID, socialIds?: SocialID[]): Promise<void> {
    await this.message.removeMessage(card, message, socialIds)
  }

  async removeMessages(card: CardID, fromId: MessageID, toId: MessageID): Promise<void> {
    await this.message.removeMessages(card, fromId, toId)
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

  async removePatches(card: CardID, fromId: MessageID, toId: MessageID): Promise<void> {
    await this.message.removePatches(card, fromId, toId)
  }

  async createMessagesGroup(
    card: CardID,
    blobId: BlobID,
    fromDate: Date,
    toDate: Date,
    fromId: MessageID,
    toId: MessageID,
    count: number
  ): Promise<void> {
    await this.message.createMessagesGroup(card, blobId, fromDate, toDate, fromId, toId, count)
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

  async createAttachment(message: MessageID, attachment: CardID, creator: SocialID, created: Date): Promise<void> {
    await this.message.createAttachment(message, attachment, creator, created)
  }

  async removeAttachment(message: MessageID, attachment: CardID): Promise<void> {
    await this.message.removeAttachment(message, attachment)
  }

  async createThread(card: CardID, message: MessageID, thread: CardID, created: Date): Promise<void> {
    await this.message.createThread(card, message, thread, created)
  }

  async updateThread(thread: CardID, lastReply: Date, op: 'increment' | 'decrement'): Promise<void> {
    await this.message.updateThread(thread, lastReply, op)
  }

  async createNotification(message: MessageID, context: ContextID): Promise<void> {
    await this.notification.createNotification(message, context)
  }

  async removeNotification(message: MessageID, context: ContextID): Promise<void> {
    await this.notification.removeNotification(message, context)
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
    await this.notification.updateContext(context, update)
  }

  async removeContext(context: ContextID): Promise<void> {
    await this.notification.removeContext(context)
  }

  // Finds
  async findMessages(params: FindMessagesParams): Promise<Message[]> {
    return await this.message.find(params)
  }

  async findMessagesGroups(params: FindMessagesGroupsParams): Promise<MessagesGroup[]> {
    return await this.message.findMessagesGroups(params)
  }

  async findThread(thread: CardID): Promise<Thread | undefined> {
    return await this.message.findThread(thread)
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
    this.sql.close()
  }
}

export async function createDbAdapter(
  connectionString: string,
  workspace: WorkspaceID,
  logger?: Logger,
  options?: Options
): Promise<DbAdapter> {
  const greenUrl = process.env.GREEN_URL ?? ''
  if (greenUrl !== '') {
    const client = new GreenClient(greenUrl)
    return new CockroachAdapter(client, workspace, logger, options)
  } else {
    const connection = connect(connectionString)
    const sql = await connection.getClient()
    const client = new CockroachClient(connection, sql)

    return new CockroachAdapter(client, workspace, logger, options)
  }
}

class GreenClient implements SqlClient {
  private readonly url: string
  private readonly token: string
  constructor(endpoint: string) {
    const url = new URL(endpoint)
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

  async execute<T extends any[] = (Row & Iterable<Row>)[]>(query: string, params?: ParameterOrJSON<any>[]): Promise<T> {
    return await retry(() => this.fetch<T>(query, params), { retries: 5 })
  }

  private async fetch<T extends any[] = (Row & Iterable<Row>)[]>(
    query: string,
    params?: ParameterOrJSON<any>[]
  ): Promise<T> {
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

  close(): void {
    // do nothing
  }
}

class CockroachClient implements SqlClient {
  constructor(
    private readonly db: PostgresClientReference,
    private readonly sql: postgres.Sql
  ) {}

  async execute<T extends any[] = (Row & Iterable<Row>)[]>(query: string, params?: ParameterOrJSON<any>[]): Promise<T> {
    const sql = params !== undefined && params.length > 0 ? injectVars(query, params) : query
    return await this.sql.unsafe<T>(sql)
  }

  close(): void {
    this.db.close()
  }
}
