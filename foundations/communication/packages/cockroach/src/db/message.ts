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
  BlobID,
  type CardID,
  type CardType,
  FindMessagesMetaParams,
  FindThreadMetaParams,
  type MessageID,
  MessageMeta,
  type SocialID,
  type ThreadMeta
} from '@hcengineering/communication-types'
import { Domain, ThreadMetaUpdate, ThreadMetaQuery } from '@hcengineering/communication-sdk-types'

import { BaseDb } from './base'
import { DbModel, DbModelFilter, schemas } from '../schema'
import { toMessageMeta, toThreadMeta } from './mapping'

export class MessagesDb extends BaseDb {
  // Message Index
  public async createMessageMeta (
    cardId: CardID,
    messageId: MessageID,
    creator: SocialID,
    created: Date,
    blobId: BlobID
  ): Promise<boolean> {
    const model: DbModel<Domain.MessageIndex> = {
      workspace_id: this.workspace,
      card_id: cardId,
      message_id: messageId,
      created,
      creator,
      blob_id: blobId
    }
    const insertSql = this.getInsertSql(Domain.MessageIndex, model, [], {
      conflictColumns: ['workspace_id', 'card_id', 'message_id'],
      conflictAction: 'DO NOTHING'
    })

    const result = await this.execute(insertSql.sql, insertSql.values, 'insert message meta')

    return result.count !== 0
  }

  async removeMessageMeta (cardId: CardID, messageId: MessageID): Promise<void> {
    const filter: DbModelFilter<Domain.MessageIndex> = [
      {
        column: 'workspace_id',
        value: this.workspace
      },
      {
        column: 'card_id',
        value: cardId
      },
      {
        column: 'message_id',
        value: messageId
      }
    ]

    const { sql, values } = this.getDeleteSql(Domain.MessageIndex, filter)

    await this.execute(sql, values, 'remove message meta')
  }

  public async findMessagesMeta (params: FindMessagesMetaParams): Promise<MessageMeta[]> {
    const select = `SELECT *
                      FROM ${Domain.MessageIndex} mi
                      `
    const limit = this.buildLimit(params.limit)
    const orderBy = this.buildOrderBy(params.order, 'mi.created')
    const { where, values } = this.buildMessageMetaWhere(params)

    const sql = [select, where, orderBy, limit].join(' ')
    const result = await this.execute(sql, values, 'find message meta')
    return result.map((it: any) => toMessageMeta(it))
  }

  private buildMessageMetaWhere (params: FindMessagesMetaParams): { where: string, values: any[] } {
    const where: string[] = []
    const values: any[] = []
    const schema = schemas[Domain.MessageIndex]

    let index = 1

    where.push(`mi.workspace_id = $${index++}::${schema.workspace_id}`)
    values.push(this.workspace)

    if (params.cardId != null) {
      where.push(`mi.card_id = $${index++}::${schema.card_id}`)
      values.push(params.cardId)
    }

    if (params.id != null) {
      where.push(`mi.message_id = $${index++}::${schema.message_id}`)
      values.push(params.id)
    }

    if (params.creator != null) {
      where.push(`mi.creator = $${index++}::${schema.creator}`)
      values.push(params.creator)
    }

    return { where: `WHERE ${where.join(' AND ')}`, values }
  }

  // Thread Index
  async attachThreadMeta (cardId: CardID, messageId: MessageID, threadId: CardID, threadType: CardType): Promise<void> {
    const db: DbModel<Domain.ThreadIndex> = {
      workspace_id: this.workspace,
      card_id: cardId,
      message_id: messageId,
      thread_id: threadId,
      thread_type: threadType,
      replies_count: 0,
      last_reply: new Date()
    }

    const { sql, values } = this.getInsertSql(Domain.ThreadIndex, db)

    await this.execute(sql, values, 'insert thread')
  }

  async updateThreadMeta (query: ThreadMetaQuery, update: ThreadMetaUpdate): Promise<void> {
    const set: string[] = []
    const values: any[] = []

    let index = 1

    if (update.threadType != null) {
      set.push(`thread_type = $${index++}::varchar`)
      values.push(update.threadType)
    }

    if (set.length === 0) return

    const updateSql = `UPDATE ${Domain.ThreadIndex}`
    const setSql = 'SET ' + set.join(', ')
    let where = `WHERE workspace_id = $${index++}::uuid`

    values.push(this.workspace)
    if (query.cardId != null) {
      where += ` AND card_id = $${index++}::varchar`
      values.push(query.cardId)
    }
    if (query.messageId != null) {
      where += ` AND message_id = $${index++}::varchar`
      values.push(query.messageId)
    }
    if (query.threadId != null) {
      where += ` AND thread_id = $${index++}::varchar`
      values.push(query.threadId)
    }

    const sql = [updateSql, setSql, where].join(' ')

    await this.execute(sql, values, 'update thread')
  }

  async removeThreadMeta (query: ThreadMetaQuery): Promise<void> {
    const filter: DbModelFilter<Domain.ThreadIndex> = [
      {
        column: 'workspace_id',
        value: this.workspace
      }
    ]

    if (query.cardId != null) filter.push({ column: 'card_id', value: query.cardId })
    if (query.messageId != null) filter.push({ column: 'message_id', value: query.messageId })
    if (query.threadId != null) filter.push({ column: 'thread_id', value: query.threadId })

    const { sql, values } = this.getDeleteSql(Domain.ThreadIndex, filter)

    await this.execute(sql, values, 'remove threads')
  }

  async findThreadMeta (params: FindThreadMetaParams): Promise<ThreadMeta[]> {
    const { where, values } = this.buildThreadMetaWhere(params)
    const select = `
            SELECT *
            FROM ${Domain.ThreadIndex} t
        `

    const limit = this.buildLimit(params.limit)
    const orderBy = this.buildOrderBy(params.order, 't.date')

    const sql = [select, where, orderBy, limit].join(' ')
    const result = await this.execute(sql, values, 'find threads')

    return result.map((it: any) => toThreadMeta(it))
  }

  private buildThreadMetaWhere (
    params: FindThreadMetaParams,
    startIndex: number = 0,
    prefix: string = 't.'
  ): { where: string, values: any[] } {
    const where: string[] = []
    const values: any[] = []
    let index = startIndex + 1

    where.push(`${prefix}workspace_id = $${index++}::uuid`)
    values.push(this.workspace)

    if (params.cardId != null) {
      where.push(`${prefix}card_id = $${index++}::varchar`)
      values.push(params.cardId)
    }

    if (params.messageId != null) {
      where.push(`${prefix}message_id = $${index++}::varchar`)
      values.push(params.messageId)
    }

    if (params.threadId != null) {
      where.push(`${prefix}thread_id = $${index++}::varchar`)
      values.push(params.threadId)
    }

    return { where: `WHERE ${where.join(' AND ')}`, values }
  }
}
