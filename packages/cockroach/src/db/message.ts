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
  AddAttachmentsPatchData,
  AddReactionPatchData,
  AttachmentData,
  AttachmentID,
  AttachmentUpdateData,
  AttachThreadPatchData,
  type BlobID,
  type CardID,
  type CardType,
  type FindMessagesGroupsParams,
  type FindMessagesParams,
  FindThreadParams,
  type Markdown,
  type Message,
  type MessageExtra,
  type MessageID,
  type MessagesGroup,
  type MessageType,
  PatchType,
  RemoveAttachmentsPatchData,
  RemoveReactionPatchData,
  SetAttachmentsPatchData,
  type SocialID,
  SortingOrder,
  type Thread,
  UpdateAttachmentsPatchData,
  UpdateThreadPatchData
} from '@hcengineering/communication-types'
import { Domain, type ThreadQuery, type ThreadUpdates } from '@hcengineering/communication-sdk-types'
import postgres from 'postgres'

import { BaseDb } from './base'
import { DbModel, DbModelColumn, DbModelFilter, schemas } from '../schema'
import { getCondition } from './utils'
import { toMessage, toMessagesGroup, toThread } from './mapping'

export class MessagesDb extends BaseDb {
  // Message
  async createMessage (
    cardId: CardID,
    id: MessageID,
    type: MessageType,
    content: Markdown,
    extra: MessageExtra | undefined,
    creator: SocialID,
    created: Date
  ): Promise<boolean> {
    const messageDbModel: DbModel<Domain.Message> = {
      workspace_id: this.workspace,
      card_id: cardId,
      id,
      type,
      content,
      creator,
      created,
      data: extra
    }
    const messageCreatedDbModel: DbModel<Domain.MessageCreated> = {
      workspace_id: this.workspace,
      card_id: cardId,
      message_id: id,
      created
    }
    const insertMessageCreatedSql = this.getInsertSql(Domain.MessageCreated, messageCreatedDbModel, [], {
      conflictColumns: ['workspace_id', 'card_id', 'message_id'],
      conflictAction: 'DO NOTHING'
    })
    const insertMessageSql = this.getInsertSql(Domain.Message, messageDbModel, [
      {
        column: 'id',
        cast: 'text'
      },
      {
        column: 'created',
        cast: 'timestamptz'
      }
    ])

    return await this.getRowClient().begin(async (s) => {
      const result = await this.execute(
        insertMessageCreatedSql.sql,
        insertMessageCreatedSql.values,
        'insert message created',
        s
      )
      if (result.count === 0) {
        return false
      }

      await this.execute(insertMessageSql.sql, insertMessageSql.values, 'insert message', s)
      return true
    })
  }

  // Patch
  async createPatch (
    cardId: CardID,
    messageId: MessageID,
    type: PatchType,
    data: Record<string, any>,
    creator: SocialID,
    created: Date,
    client?: postgres.TransactionSql
  ): Promise<void> {
    const dbModel: Omit<DbModel<Domain.Patch>, 'message_created'> = {
      workspace_id: this.workspace,
      card_id: cardId,
      message_id: messageId,
      type,
      data,
      creator,
      created
    }

    const schema = schemas[Domain.Patch]
    const columns = Object.keys(dbModel) as Array<keyof Omit<DbModel<Domain.Patch>, 'message_created'>>

    const values = columns.map((c) => dbModel[c])
    const placeholders = columns.map((c, i) => {
      const sqlType = (schema as any)[c]
      return `$${i + 1}::${sqlType}`
    })

    const sql = `
        INSERT INTO ${Domain.Patch} (${columns.join(', ')}, message_created)
        SELECT ${placeholders.join(', ')}, mc.created
        FROM ${Domain.MessageCreated} mc
        WHERE mc.workspace_id = $1::${schema.workspace_id}
          AND mc.card_id = $2::${schema.card_id}
          AND mc.message_id = $3::${schema.message_id}
    `

    await this.execute(sql, values, 'insert patch', client)
  }

  // Attachment
  async addAttachments (
    cardId: CardID,
    messageId: MessageID,
    attachments: AttachmentData[],
    socialId: SocialID,
    date: Date
  ): Promise<void> {
    if (attachments.length === 0) return

    const models: DbModel<Domain.Attachment>[] = attachments.map((att) => ({
      workspace_id: this.workspace,
      card_id: cardId,
      message_id: messageId,
      id: att.id,
      type: att.type,
      params: att.params,
      creator: socialId,
      created: date
    }))

    const { sql, values } = this.getBatchInsertSql(Domain.Attachment, models)

    const inDb = await this.isMessageInDb(cardId, messageId)
    if (!inDb) {
      await this.getRowClient().begin(async (s) => {
        await this.execute(sql, values, 'insert attachments', s)

        const data: AddAttachmentsPatchData = {
          operation: 'add',
          attachments
        }
        await this.createPatch(cardId, messageId, PatchType.attachment, data, socialId, date, s)
        return true
      })
    } else {
      await this.execute(sql, values, 'insert attachments')
    }
  }

  async removeAttachments (
    cardId: CardID,
    messageId: MessageID,
    ids: AttachmentID[],
    socialId: SocialID,
    date: Date
  ): Promise<void> {
    if (ids.length === 0) return

    const { sql, values } = this.getDeleteSql(Domain.Attachment, [
      { column: 'workspace_id', value: this.workspace },
      { column: 'card_id', value: cardId },
      { column: 'message_id', value: messageId },
      { column: 'id', value: ids.length === 1 ? ids[0] : ids }
    ])

    const inDb = await this.isMessageInDb(cardId, messageId)
    if (!inDb) {
      await this.getRowClient().begin(async (s) => {
        await this.execute(sql, values, 'remove attachments', s)

        const data: RemoveAttachmentsPatchData = {
          operation: 'remove',
          ids
        }
        await this.createPatch(cardId, messageId, PatchType.attachment, data, socialId, date, s)
        return true
      })
    } else {
      await this.execute(sql, values, 'delete attachments')
    }
  }

  async setAttachments (
    cardId: CardID,
    messageId: MessageID,
    attachments: AttachmentData[],
    socialId: SocialID,
    date: Date
  ): Promise<void> {
    if (attachments.length === 0) return
    const { sql: deleteSql, values: deleteValues } = this.getDeleteSql(Domain.Attachment, [
      { column: 'workspace_id', value: this.workspace },
      { column: 'card_id', value: cardId },
      { column: 'message_id', value: messageId }
    ])

    const models: DbModel<Domain.Attachment>[] = attachments.map((att) => ({
      workspace_id: this.workspace,
      card_id: cardId,
      message_id: messageId,
      id: att.id,
      type: att.type,
      params: att.params,
      creator: socialId,
      created: date
    }))

    const { sql: insertSql, values: insertValues } = this.getBatchInsertSql(Domain.Attachment, models)

    const inDb = await this.isMessageInDb(cardId, messageId)

    await this.getRowClient().begin(async (s) => {
      await this.execute(deleteSql, deleteValues, 'delete attachments', s)
      await this.execute(insertSql, insertValues, 'insert attachments', s)

      if (!inDb) {
        const data: SetAttachmentsPatchData = {
          operation: 'set',
          attachments
        }
        await this.createPatch(cardId, messageId, PatchType.attachment, data, socialId, date, s)
      }
    })
  }

  async updateAttachments (
    cardId: CardID,
    messageId: MessageID,
    attachments: AttachmentUpdateData[],
    socialId: SocialID,
    date: Date
  ): Promise<void> {
    if (attachments.length === 0) return

    const filter: DbModelFilter<Domain.Attachment> = [
      { column: 'workspace_id', value: this.workspace },
      { column: 'card_id', value: cardId },
      { column: 'message_id', value: messageId }
    ]

    const updates: Array<{
      key: AttachmentID
      column: DbModelColumn<Domain.Attachment>
      innerKey?: string
      value: any
    }> = []

    for (const att of attachments) {
      if (Object.keys(att.params).length > 0) {
        const attachmentUpdates: Array<{
          key: AttachmentID
          column: DbModelColumn<Domain.Attachment>
          innerKey?: string
          value: any
        }> = []
        for (const [innerKey, val] of Object.entries(att.params)) {
          attachmentUpdates.push({
            key: att.id,
            column: 'params',
            innerKey,
            value: val
          })
        }

        if (attachmentUpdates.length > 0) {
          attachmentUpdates.push({
            key: att.id,
            column: 'modified',
            value: date
          })
          updates.push(...attachmentUpdates)
        }
      }
    }

    if (updates.length === 0) return

    const { sql, values } = this.getBatchUpdateSql(Domain.Attachment, 'id', filter, updates)

    const inDb = await this.isMessageInDb(cardId, messageId)
    if (!inDb) {
      await this.getRowClient().begin(async (s) => {
        await this.execute(sql, values, 'update attachments', s)

        const data: UpdateAttachmentsPatchData = {
          operation: 'update',
          attachments
        }
        await this.createPatch(cardId, messageId, PatchType.attachment, data, socialId, date, s)
      })
    } else {
      await this.execute(sql, values, 'update attachments')
    }
  }

  // Reaction
  async addReaction (
    cardId: CardID,
    messageId: MessageID,
    reaction: string,
    creator: SocialID,
    created: Date
  ): Promise<void> {
    const inDb = await this.isMessageInDb(cardId, messageId)
    if (inDb) {
      const db: DbModel<Domain.Reaction> = {
        workspace_id: this.workspace,
        card_id: cardId,
        message_id: messageId,
        reaction,
        creator,
        created
      }

      const { sql, values } = this.getInsertSql(Domain.Reaction, db, [], {
        conflictColumns: ['workspace_id', 'card_id', 'message_id', 'reaction', 'creator'],
        conflictAction: 'DO NOTHING'
      })

      await this.execute(sql, values, 'insert reaction')
    } else {
      const data: AddReactionPatchData = {
        operation: 'add',
        reaction
      }
      await this.createPatch(cardId, messageId, PatchType.reaction, data, creator, created)
    }
  }

  async removeReaction (
    cardId: CardID,
    messageId: MessageID,
    reaction: string,
    socialId: SocialID,
    date: Date
  ): Promise<void> {
    const inDb = await this.isMessageInDb(cardId, messageId)
    if (inDb) {
      const { sql, values } = this.getDeleteSql(Domain.Reaction, [
        { column: 'workspace_id', value: this.workspace },
        { column: 'card_id', value: cardId },
        { column: 'message_id', value: messageId },
        { column: 'reaction', value: reaction },
        { column: 'creator', value: socialId }
      ])
      await this.execute(sql, values, 'remove reaction')
    } else {
      const data: RemoveReactionPatchData = {
        operation: 'remove',
        reaction
      }
      await this.createPatch(cardId, messageId, PatchType.reaction, data, socialId, date)
    }
  }

  // Thread
  async attachThread (
    cardId: CardID,
    messageId: MessageID,
    threadId: CardID,
    threadType: CardType,
    socialId: SocialID,
    date: Date
  ): Promise<void> {
    const db: DbModel<Domain.Thread> = {
      workspace_id: this.workspace,
      card_id: cardId,
      message_id: messageId,
      thread_id: threadId,
      thread_type: threadType,
      replies_count: 0,
      last_reply: date
    }

    const { sql, values } = this.getInsertSql(Domain.Thread, db)

    const inDb = await this.isMessageInDb(cardId, messageId)
    if (!inDb) {
      await this.getRowClient().begin(async (s) => {
        await this.execute(sql, values, 'insert thread', s)

        const data: AttachThreadPatchData = {
          operation: 'attach',
          threadId,
          threadType
        }
        await this.createPatch(cardId, messageId, PatchType.thread, data, socialId, date, s)

        return true
      })
    } else {
      await this.execute(
        sql,
        [db.workspace_id, db.card_id, db.message_id, db.thread_id, db.thread_type, db.replies_count, db.last_reply],
        'insert thread'
      )
    }
  }

  async updateThread (
    cardId: CardID,
    messageId: MessageID,
    threadId: CardID,
    update: ThreadUpdates,
    socialId: SocialID,
    date: Date
  ): Promise<void> {
    const set: string[] = []
    const values: any[] = []

    let index = 1
    if (update.lastReply != null) {
      set.push(`last_reply = $${index++}::timestamptz`)
      values.push(update.lastReply)
    }

    if (update.repliesCountOp === 'increment') {
      set.push('replies_count = replies_count + 1')
    } else if (update.repliesCountOp === 'decrement') {
      set.push('replies_count = GREATEST(replies_count - 1, 0)')
    }

    if (update.threadType != null) {
      set.push(`thread_type = $${index++}::varchar`)
      values.push(update.threadType)
    }

    if (set.length === 0) return

    const updateSql = `UPDATE ${Domain.Thread}`
    const setSql = 'SET ' + set.join(', ')
    const where = `WHERE workspace_id = $${index++}::uuid AND thread_id = $${index++}::varchar AND card_id = $${index++}::varchar AND message_id = $${index++}::varchar`
    const sql = [updateSql, setSql, where].join(' ')

    const inDb = await this.isMessageInDb(cardId, messageId)

    if (!inDb) {
      await this.getRowClient().begin(async (s) => {
        const res = await this.execute(
          sql,
          [...values, this.workspace, threadId, cardId, messageId],
          'update thread',
          s
        )

        if (res.count === 0) {
          return
        }

        const data: UpdateThreadPatchData = {
          operation: 'update',
          threadId,
          threadType: update.threadType,
          repliesCountOp: update.repliesCountOp,
          lastReply: update.lastReply
        }
        await this.createPatch(cardId, messageId, PatchType.thread, data, socialId, date, s)

        return true
      })
    } else {
      await this.execute(sql, [...values, this.workspace, threadId, cardId, messageId], 'update thread')
    }
  }

  async removeThreads (query: ThreadQuery): Promise<void> {
    const filter: DbModelFilter<Domain.Thread> = [
      {
        column: 'workspace_id',
        value: this.workspace
      }
    ]

    if (query.cardId != null) filter.push({ column: 'card_id', value: query.cardId })
    if (query.messageId != null) filter.push({ column: 'message_id', value: query.messageId })
    if (query.threadId != null) filter.push({ column: 'thread_id', value: query.threadId })

    const { sql, values } = this.getDeleteSql(Domain.Thread, filter)

    await this.execute(sql, values, 'remove threads')
  }

  // MessagesGroup
  async createMessagesGroup (card: CardID, blobId: BlobID, fromDate: Date, toDate: Date, count: number): Promise<void> {
    const db: DbModel<Domain.MessagesGroup> = {
      workspace_id: this.workspace,
      card_id: card,
      blob_id: blobId,
      from_date: fromDate,
      to_date: toDate,
      count
    }

    const { sql, values } = this.getInsertSql(Domain.MessagesGroup, db)
    await this.execute(sql, values, 'insert messages group')
  }

  async removeMessagesGroup (card: CardID, blobId: BlobID): Promise<void> {
    const { sql, values } = this.getDeleteSql(Domain.MessagesGroup, [
      {
        column: 'workspace_id',
        value: this.workspace
      },
      {
        column: 'card_id',
        value: card
      },
      {
        column: 'blob_id',
        value: blobId
      }
    ])
    await this.execute(sql, values, 'remove messages group')
  }

  async find (params: FindMessagesParams): Promise<Message[]> {
    const { where, values } = this.buildMessageWhere(params)
    const orderBy = this.buildOrderBy(params)
    const limit = this.buildLimit(params)

    const sql = `
    WITH
    ${this.buildCteLimitedMessages(where, orderBy, limit)}
    ${this.buildCteAggregatedAttachments(params)}
    ${this.buildCteAggregatedReactions(params)}
    ${this.buildCteAggregatedPatches()}
    ${this.buildMainSelect(params)}
  `

    const result = await this.execute(sql, values, 'find messages')
    return result.map((it: any) => toMessage(it))
  }

  private buildOrderBy (params: FindMessagesParams): string {
    return params.order != null ? `ORDER BY m.created ${params.order === SortingOrder.Ascending ? 'ASC' : 'DESC'}` : ''
  }

  private buildLimit (params: FindMessagesParams): string {
    return params.limit != null ? `LIMIT ${params.limit}` : ''
  }

  private buildCteLimitedMessages (where: string, orderBy: string, limit: string): string {
    return `
    limited_messages AS (
      SELECT *
      FROM ${Domain.Message} m
      ${where}
      ${orderBy}
      ${limit}
    )
  `
  }

  private buildCteAggregatedAttachments (params: FindMessagesParams): string {
    if (params.attachments !== true) return ''
    return `,
    agg_attachments AS (
      SELECT
        a.workspace_id,
        a.card_id,
        a.message_id,
        jsonb_agg(jsonb_build_object(
          'id', a.id,
          'type', a.type,
          'params', a.params,
          'creator', a.creator,
          'created', a.created,
          'modified', a.modified
        )) AS attachments
      FROM ${Domain.Attachment} a
      INNER JOIN limited_messages m
        ON m.workspace_id = a.workspace_id
        AND m.card_id = a.card_id
        AND m.id = a.message_id
      GROUP BY a.workspace_id, a.card_id, a.message_id
    )
  `
  }

  private buildCteAggregatedReactions (params: FindMessagesParams): string {
    if (params.reactions !== true) return ''
    return `,
    agg_reactions AS (
      SELECT
        r.workspace_id,
        r.card_id,
        r.message_id,
        jsonb_agg(jsonb_build_object(
          'reaction', r.reaction,
          'creator', r.creator,
          'created', r.created
        )) AS reactions
      FROM ${Domain.Reaction} r
      INNER JOIN limited_messages m
        ON m.workspace_id = r.workspace_id
        AND m.card_id = r.card_id
        AND m.id = r.message_id
      GROUP BY r.workspace_id, r.card_id, r.message_id
    )
  `
  }

  private buildCteAggregatedPatches (): string {
    return `,
    agg_patches AS (
      SELECT
        p.workspace_id,
        p.card_id,
        p.message_id,
        jsonb_agg(
          jsonb_build_object(
            'type', p.type,
            'data', p.data,
            'creator', p.creator,
            'created', p.created
          ) ORDER BY p.created ASC
        ) AS patches
      FROM ${Domain.Patch} p
      INNER JOIN limited_messages m
        ON m.workspace_id = p.workspace_id
        AND m.card_id = p.card_id
        AND m.id = p.message_id
      GROUP BY p.workspace_id, p.card_id, p.message_id
    )
  `
  }

  private buildMainSelect (params: FindMessagesParams): string {
    const orderBy = this.buildOrderBy(params)
    const selectReplies =
      params.replies === true
        ? 't.thread_id as thread_id, t.thread_type as thread_type, t.replies_count::int as replies_count, t.last_reply as last_reply,'
        : ''

    const selectAttachments =
      params.attachments === true
        ? "COALESCE(a.attachments, '[]'::jsonb) AS attachments,"
        : "'[]'::jsonb AS attachments,"

    const selectReactions =
      params.reactions === true ? "COALESCE(r.reactions, '[]'::jsonb) AS reactions," : "'[]'::jsonb AS reactions,"

    const joinAttachments =
      params.attachments === true
        ? `
    LEFT JOIN agg_attachments a
      ON a.workspace_id = m.workspace_id
      AND a.card_id = m.card_id
      AND a.message_id = m.id`
        : ''

    const joinReactions =
      params.reactions === true
        ? `
    LEFT JOIN agg_reactions r
      ON r.workspace_id = m.workspace_id
      AND r.card_id = m.card_id
      AND r.message_id = m.id`
        : ''

    return `
        SELECT m.id::text,
               m.card_id,
               m.type,
               m.content,
               m.creator,
               m.created,
               m.data,
               ${selectReplies}
                   ${selectAttachments}
                   ${selectReactions}
                   COALESCE(p.patches, '[]'::jsonb) AS patches
        FROM limited_messages m
                 LEFT JOIN ${Domain.Thread} t
                           ON t.workspace_id = m.workspace_id
                               AND t.card_id = m.card_id
                               AND t.message_id = m.id
                                   ${joinAttachments}
                                   ${joinReactions}
                 LEFT JOIN agg_patches p
                           ON p.workspace_id = m.workspace_id
                               AND p.card_id = m.card_id
                               AND p.message_id = m.id
                                   ${orderBy}
    `
  }

  buildMessageWhere (params: FindMessagesParams): { where: string, values: any[] } {
    const where: string[] = ['m.workspace_id = $1::uuid']
    const values: any[] = [this.workspace]

    let index = 2

    if (params.id != null) {
      where.push(`m.id = $${index++}::varchar`)
      values.push(params.id)
    }

    if (params.card != null) {
      where.push(`m.card_id = $${index++}::varchar`)
      values.push(params.card)
    }

    const createdCondition = getCondition('m', 'created', index, params.created, 'timestamptz')

    if (createdCondition != null) {
      where.push(createdCondition.where)
      values.push(...createdCondition.values)
      index = createdCondition.index
    }

    return { where: `WHERE ${where.join(' AND ')}`, values }
  }

  // Find threads
  async findThreads (params: FindThreadParams): Promise<Thread[]> {
    const { where, values } = this.buildThreadWhere(params)
    const select = `
            SELECT *
            FROM ${Domain.Thread} t
        `

    const limit = params.limit != null ? ` LIMIT ${params.limit}` : ''
    const orderBy =
      params.order != null ? `ORDER BY t.date ${params.order === SortingOrder.Ascending ? 'ASC' : 'DESC'}` : ''

    const sql = [select, where, orderBy, limit].join(' ')
    const result = await this.execute(sql, values, 'find threads')

    return result.map((it: any) => toThread(it))
  }

  private buildThreadWhere (
    params: FindThreadParams,
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

  // Find messages groups
  async findMessagesGroups (params: FindMessagesGroupsParams): Promise<MessagesGroup[]> {
    const useMessageIdCte = params.messageId != null
    const values: any[] = [this.workspace]
    if (useMessageIdCte) values.push(params.messageId)

    const cte = useMessageIdCte
      ? `
      WITH msg_created AS (
        SELECT card_id, created
        FROM ${Domain.MessageCreated}
        WHERE workspace_id = $1::uuid
          AND message_id = $2::varchar
      )
    `
      : ''

    const select = `
    ${cte}
    SELECT mg.card_id,
           mg.blob_id,
           mg.from_date,
           mg.to_date,
           mg.count,
           patches
    FROM ${Domain.MessagesGroup} mg
    ${useMessageIdCte ? 'JOIN msg_created mc ON mg.card_id = mc.card_id AND mc.created BETWEEN mg.from_date AND mg.to_date' : ''}
    CROSS JOIN LATERAL (
      SELECT jsonb_agg(jsonb_build_object(
        'message_id', p.message_id::varchar,
        'type', p.type,
        'data', p.data,
        'creator', p.creator,
        'created', p.created
      )) AS patches
      FROM ${Domain.Patch} p
      WHERE p.workspace_id = mg.workspace_id
        AND p.card_id = mg.card_id
        AND p.message_created BETWEEN mg.from_date AND mg.to_date
    ) sub
  `

    const { where, values: additionalValues } = this.buildMessagesGroupWhere(params, values.length + 1)
    values.push(...additionalValues)

    const orderBy =
      params.orderBy === 'toDate'
        ? `ORDER BY mg.to_date ${params.order === SortingOrder.Descending ? 'DESC' : 'ASC'}`
        : `ORDER BY mg.from_date ${params.order === SortingOrder.Descending ? 'DESC' : 'ASC'}`
    const limit = params.limit != null ? ` LIMIT ${params.limit}` : ''

    const sql = [select, where, orderBy, limit].join(' ')
    const result = await this.execute(sql, values, 'find messages groups')

    return result.map((it: any) => toMessagesGroup(it))
  }

  buildMessagesGroupWhere (
    params: FindMessagesGroupsParams,
    startIndex = 1
  ): {
      where: string
      values: any[]
    } {
    const where: string[] = ['mg.workspace_id = $1::uuid']
    const values: any[] = []

    let index = startIndex

    if (params.card != null) {
      where.push(`mg.card_id = $${index++}::varchar`)
      values.push(params.card)
    }

    if (params.blobId != null) {
      where.push(`mg.blob_id = $${index++}`)
      values.push(params.blobId)
    }

    const fromDateCondition = getCondition('mg', 'from_date', index, params.fromDate, 'timestamptz')
    if (fromDateCondition != null) {
      where.push(fromDateCondition.where)
      values.push(...fromDateCondition.values)
      index = fromDateCondition.index
    }

    const toDateCondition = getCondition('mg', 'to_date', index, params.toDate, 'timestamptz')
    if (toDateCondition != null) {
      where.push(toDateCondition.where)
      values.push(...toDateCondition.values)
      index = toDateCondition.index
    }

    if (params.patches === true) {
      where.push('sub.patches IS NOT NULL')
    }

    return {
      where: where.length > 0 ? `WHERE ${where.join(' AND ')}` : '',
      values
    }
  }

  public async isMessageInDb (cardId: CardID, messageId: MessageID): Promise<boolean> {
    const sql = `
        SELECT 1
        FROM ${Domain.Message} m
        WHERE m.workspace_id = $1::uuid
          AND m.card_id = $2::varchar
          AND m.id = $3::varchar
        LIMIT 1
    `

    const result = await this.execute(sql, [this.workspace, cardId, messageId])
    return result.length > 0
  }

  public async getMessageCreated (cardId: CardID, messageId: MessageID): Promise<Date | undefined> {
    const select = `SELECT mc.created
                      FROM ${Domain.MessageCreated} mc
                      WHERE mc.workspace_id = $1::uuid
                        AND mc.card_id = $2::varchar
                        AND mc.message_id = $3::varchar
                      LIMIT 1`
    const result = await this.execute(select, [this.workspace, cardId, messageId])
    const created = result[0]?.created
    return created != null ? new Date(created) : undefined
  }
}
