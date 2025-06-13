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
  type Markdown,
  type SocialID,
  type Thread,
  type WorkspaceID,
  type NotificationID,
  type Label,
  type FindLabelsParams,
  type LabelID,
  type CardType,
  type PatchData,
  NotificationType,
  type NotificationContent,
  type LinkPreviewData,
  type LinkPreviewID,
  type MessageExtra,
  type BlobData
} from '@hcengineering/communication-types'
import type {
  DbAdapter,
  LabelUpdates,
  NotificationContextUpdates,
  NotificationUpdates, RemoveLabelQuery, RemoveThreadQuery,
  ThreadUpdates,
  UpdateNotificationQuery
} from '@hcengineering/communication-sdk-types'

import { MessagesDb } from './db/message'
import { NotificationsDb } from './db/notification'
import { connect } from './connection'
import { type Logger, type Options } from './types'
import { formatName } from './utils'
import { initSchema } from './init'
import { LabelsDb } from './db/label'
import { SqlClient } from './client'

export class CockroachAdapter implements DbAdapter {
  private readonly message: MessagesDb
  private readonly notification: NotificationsDb
  private readonly label: LabelsDb

  constructor (
    private readonly sql: SqlClient,
    private readonly workspace: WorkspaceID,
    private readonly logger?: Logger,
    private readonly options?: Options
  ) {
    this.message = new MessagesDb(this.sql, this.workspace, logger, options)
    this.notification = new NotificationsDb(this.sql, this.workspace, logger, options)
    this.label = new LabelsDb(this.sql, this.workspace, logger, options)
  }

  async createMessage (
    id: MessageID,
    cardId: CardID,
    type: MessageType,
    content: Markdown,
    extra: MessageExtra | undefined,
    creator: SocialID,
    created: Date
  ): Promise<boolean> {
    return await this.message.createMessage(id, cardId, type, content, extra, creator, created)
  }

  async createPatch (
    cardId: CardID,
    messageId: MessageID,
    messageCreated: Date,
    type: PatchType,
    data: PatchData,
    creator: SocialID,
    created: Date
  ): Promise<void> {
    await this.message.createPatch(cardId, messageId, messageCreated, type, data, creator, created)
  }

  async createMessagesGroup (
    cardId: CardID,
    blobId: BlobID,
    fromDate: Date,
    toDate: Date,
    count: number
  ): Promise<void> {
    await this.message.createMessagesGroup(cardId, blobId, fromDate, toDate, count)
  }

  async removeMessagesGroup (card: CardID, blobId: BlobID): Promise<void> {
    await this.message.removeMessagesGroup(card, blobId)
  }

  async setReaction (
    cardId: CardID,
    message: MessageID,
    reaction: string,
    socialId: SocialID,
    date: Date
  ): Promise<void> {
    await this.message.setReaction(cardId, message, reaction, socialId, date)
  }

  async removeReaction (
    cardId: CardID,
    messageId: MessageID,
    reaction: string,
    socialId: SocialID,
    date: Date
  ): Promise<void> {
    await this.message.removeReaction(cardId, messageId, reaction, socialId, date)
  }

  async attachBlob (
    cardId: CardID,
    messageId: MessageID,
    data: BlobData,
    socialId: SocialID,
    date: Date
  ): Promise<void> {
    await this.message.attachBlob(cardId, messageId, data, socialId, date)
  }

  async detachBlob (cardId: CardID, messageId: MessageID, blobId: BlobID, socialId: SocialID, date: Date): Promise<void> {
    await this.message.detachBlob(cardId, messageId, blobId, socialId, date)
  }

  async createLinkPreview (
    cardId: CardID,
    messageId: MessageID,
    data: LinkPreviewData,
    socialId: SocialID,
    date: Date
  ): Promise<LinkPreviewID> {
    return await this.message.createLinkPreview(cardId, messageId, data, socialId, date)
  }

  async removeLinkPreview (cardId: CardID, messageId: MessageID, previewId: LinkPreviewID): Promise<void> {
    await this.message.removeLinkPreview(cardId, messageId, previewId)
  }

  async attachThread (
    cardId: CardID,
    messageId: MessageID,
    threadId: CardID,
    threadType: CardType,
    date: Date
  ): Promise<void> {
    await this.message.attachThread(cardId, messageId, threadId, threadType, date)
  }

  async removeThreads (query: RemoveThreadQuery): Promise<void> {
    await this.message.removeThreads(query)
  }

  async updateThread (threadId: CardID, update: ThreadUpdates): Promise<void> {
    await this.message.updateThread(threadId, update)
  }

  async findMessages (params: FindMessagesParams): Promise<Message[]> {
    return await this.message.find(params)
  }

  async findMessagesGroups (params: FindMessagesGroupsParams): Promise<MessagesGroup[]> {
    return await this.message.findMessagesGroups(params)
  }

  async findThread (thread: CardID): Promise<Thread | undefined> {
    return await this.message.findThread(thread)
  }

  async addCollaborators (
    card: CardID,
    cardType: CardType,
    collaborators: AccountID[],
    date?: Date
  ): Promise<AccountID[]> {
    return await this.notification.addCollaborators(card, cardType, collaborators, date)
  }

  async removeCollaborators (card: CardID, accounts: AccountID[], unsafe = false): Promise<void> {
    await this.notification.removeCollaborators(card, accounts, unsafe)
  }

  async updateCollaborators (params: FindCollaboratorsParams, data: Partial<Collaborator>): Promise<void> {
    await this.notification.updateCollaborators(params, data)
  }

  async createNotification (
    contextId: ContextID,
    messageId: MessageID,
    messageCreated: Date,
    type: NotificationType,
    read: boolean,
    content: NotificationContent | undefined,
    created: Date
  ): Promise<NotificationID> {
    return await this.notification.createNotification(
      contextId,
      messageId,
      messageCreated,
      type,
      read,
      content,
      created
    )
  }

  async updateNotification (query: UpdateNotificationQuery, updates: NotificationUpdates): Promise<void> {
    await this.notification.updateNotification(query, updates)
  }

  async removeNotifications (
    contextId: ContextID,
    account: AccountID,
    ids: NotificationID[]
  ): Promise<NotificationID[]> {
    return await this.notification.removeNotifications(contextId, account, ids)
  }

  async createContext (
    account: AccountID,
    card: CardID,
    lastUpdate: Date,
    lastView: Date,
    lastNotify?: Date
  ): Promise<ContextID> {
    return await this.notification.createContext(account, card, lastUpdate, lastView, lastNotify)
  }

  async updateContext (context: ContextID, account: AccountID, updates: NotificationContextUpdates): Promise<void> {
    await this.notification.updateContext(context, account, updates)
  }

  async removeContext (contextId: ContextID, account: AccountID): Promise<void> {
    await this.notification.removeContext(contextId, account)
  }

  async findNotificationContexts (params: FindNotificationContextParams): Promise<NotificationContext[]> {
    return await this.notification.findContexts(params)
  }

  async findNotifications (params: FindNotificationsParams): Promise<Notification[]> {
    return await this.notification.findNotifications(params)
  }

  async findCollaborators (params: FindCollaboratorsParams): Promise<Collaborator[]> {
    return await this.notification.findCollaborators(params)
  }

  close (): void {
    this.sql.close()
  }

  getCollaboratorsCursor (card: CardID, date: Date, size?: number): AsyncIterable<Collaborator[]> {
    return this.notification.getCollaboratorsCursor(card, date, size)
  }

  createLabel (label: LabelID, card: CardID, cardType: CardType, account: AccountID, created: Date): Promise<void> {
    return this.label.createLabel(label, card, cardType, account, created)
  }

  removeLabels (query: RemoveLabelQuery): Promise<void> {
    return this.label.removeLabels(query)
  }

  findLabels (params: FindLabelsParams): Promise<Label[]> {
    return this.label.findLabels(params)
  }

  updateLabels (card: CardID, updates: LabelUpdates): Promise<void> {
    return this.label.updateLabels(card, updates)
  }

  async getAccountsByPersonIds (ids: string[]): Promise<AccountID[]> {
    if (ids.length === 0) return []
    const sql = `SELECT data ->> 'personUuid' AS "personUuid"
                 FROM public.contact
                 WHERE "workspaceId" = $1::uuid
                   AND _id = ANY($2::text[])`
    const result = await this.sql.execute(sql, [this.workspace, ids])

    return result?.map((it) => it.personUuid as AccountID).filter((it) => it != null) ?? []
  }

  async getNameByAccount (id: AccountID): Promise<string | undefined> {
    const sql = `SELECT data ->> 'name' AS name
                 FROM public.contact
                 WHERE "workspaceId" = $1::uuid
                   AND data ->> 'personUuid' = $2
                 LIMIT 1`
    const result = await this.sql.execute(sql, [this.workspace, id])
    const name: string | undefined = result[0]?.name

    return name != null ? formatName(name) : undefined
  }

  async getMessageCreated (cardId: CardID, messageId: MessageID): Promise<Date | undefined> {
    return await this.message.getMessageCreated(cardId, messageId)
  }

  async isMessageInDb (cardId: CardID, messageId: MessageID): Promise<boolean> {
    return await this.message.isMessageInDb(cardId, messageId)
  }
}

export async function createDbAdapter (
  connectionString: string,
  workspace: WorkspaceID,
  logger?: Logger,
  options?: Options
): Promise<DbAdapter> {
  const connection = connect(connectionString)
  const sql = await connection.getClient()
  await initSchema(sql)

  const client = new SqlClient(connection, sql)

  return new CockroachAdapter(client, workspace, logger, options)
}
