import {
  type Message,
  type MessageID,
  type CardID,
  type FindMessagesParams,
  type SocialID,
  type RichText,
  SortingOrder,
  PatchType,
  type Thread,
  type BlobID,
  type FindMessagesGroupsParams,
  type MessagesGroup
} from '@hcengineering/communication-types'
import { generateMessageId } from '@hcengineering/communication-shared'

import { BaseDb } from './base'
import {
  TableName,
  type MessageDb,
  type AttachmentDb,
  type ReactionDb,
  type PatchDb,
  toMessage,
  type ThreadDb,
  toThread,
  type MessagesGroupDb,
  toMessagesGroup
} from './schema'
import { getCondition } from './utils'

export class MessagesDb extends BaseDb {
  // Message
  async createMessage (card: CardID, content: RichText, creator: SocialID, created: Date): Promise<MessageID> {
    const id = generateMessageId()
    const db: MessageDb = {
      id,
      workspace_id: this.workspace,
      card_id: card,
      content,
      creator,
      created
    }

    const sql = `INSERT INTO ${TableName.Message} (workspace_id, card_id, id, content, creator, created)
                 VALUES ($1::uuid, $2::varchar, $3::bigint, $4::text, $5::varchar, $6::timestamptz)`

    await this.execute(sql, [db.workspace_id, db.card_id, db.id, db.content, db.creator, db.created], 'insert message')

    return id
  }

  async removeMessage (card: CardID, message: MessageID, socialIds?: SocialID[]): Promise<void> {
    if (socialIds === undefined || socialIds.length === 0) {
      const sql = `DELETE
                   FROM ${TableName.Message}
                   WHERE workspace_id = $1::uuid
                     AND card_id = $2::varchar
                     AND id = $2::bigint;`
      await this.execute(sql, [this.workspace, card, message], 'remove message')
    } else if (socialIds.length === 1) {
      const sql = `DELETE
                   FROM ${TableName.Message}
                   WHERE workspace_id = $1::uuid
                     AND card_id = $2::varchar
                     AND id = $2::bigint
                     AND creator = $3::varchar;`
      await this.execute(sql, [this.workspace, card, message, socialIds[0]], 'remove message')
    } else {
      const sql = `DELETE
                   FROM ${TableName.Message}
                   WHERE workspace_id = $1::uuid
                     AND card_id = $2::varchar
                     AND id = $2::bigint
                     AND creator = ANY ($3::varchar[]);`

      await this.execute(sql, [this.workspace, card, message, socialIds], 'remove message')
    }
  }

  async removeMessages (card: CardID, fromId: MessageID, toId: MessageID): Promise<void> {
    const sql = `DELETE
                 FROM ${TableName.Message}
                 WHERE workspace_id = $1::uuid
                   AND card_id = $2::varchar
                   AND id >= $3::bigint
                   AND id <= $4::bigint;`

    await this.execute(sql, [this.workspace, card, BigInt(fromId), BigInt(toId)], 'remove messages')
  }

  async createPatch (
    card: CardID,
    message: MessageID,
    type: PatchType,
    content: string,
    creator: SocialID,
    created: Date
  ): Promise<void> {
    const db: PatchDb = {
      workspace_id: this.workspace,
      card_id: card,
      message_id: message,
      type,
      content,
      creator,
      created
    }

    const sql = `INSERT INTO ${TableName.Patch} (workspace_id, card_id, message_id, type, content, creator, created)
                 VALUES ($1::uuid, $2::varchar, $3::bigint, $4::varchar, $5::text, $6::varchar, $7::timestamptz)`

    await this.execute(
      sql,
      [db.workspace_id, db.card_id, db.message_id, db.type, db.content, db.creator, db.created],
      'insert patch'
    )
  }

  async removePatches (card: CardID, fromId: MessageID, toId: MessageID): Promise<void> {
    const sql = `DELETE
                 FROM ${TableName.Patch}
                 WHERE workspace_id = $1::uuid
                   AND card_id = $2::varchar
                   AND message_id >= $3::bigint
                   AND message_id <= $4::bigint;`

    await this.execute(sql, [this.workspace, card, BigInt(fromId), BigInt(toId)], 'remove patches')
  }

  // Attachment
  async createAttachment (message: MessageID, card: CardID, creator: SocialID, created: Date): Promise<void> {
    const db: AttachmentDb = {
      message_id: message,
      card_id: card,
      creator,
      created
    }
    const sql = `INSERT INTO ${TableName.Attachment} (message_id, card_id, creator, created)
                 VALUES ($1::bigint, $2::varchar, $3::varchar, $4::timestamptz)`

    await this.execute(sql, [db.message_id, db.card_id, db.creator, db.created], 'insert attachment')
  }

  async removeAttachment (message: MessageID, card: CardID): Promise<void> {
    const sql = `DELETE
                 FROM ${TableName.Attachment}
                 WHERE message_id = $1::bigint
                   AND card_id = $2::varchar`
    await this.execute(sql, [message, card], 'remove attachment')
  }

  // Reaction
  async createReaction (
    card: CardID,
    message: MessageID,
    reaction: string,
    creator: SocialID,
    created: Date
  ): Promise<void> {
    const select = `SELECT m.id
                    FROM ${TableName.Message} m
                    WHERE m.id = $1::bigint`

    const messageDb = await this.execute(select, [message], 'select message')

    if (messageDb.length > 0) {
      const db: ReactionDb = {
        workspace_id: this.workspace,
        card_id: card,
        message_id: message,
        reaction,
        creator,
        created
      }
      const sql = `INSERT INTO ${TableName.Reaction} (workspace_id, card_id, message_id, reaction, creator, created)
                   VALUES ($1::uuid, $2::varchar, $3::bigint, $4::varchar, $5::varchar, $6::timestamptz)`

      await this.execute(
        sql,
        [db.workspace_id, db.card_id, db.message_id, db.reaction, db.creator, db.created],
        'insert reaction'
      )
    } else {
      await this.createPatch(card, message, PatchType.addReaction, reaction, creator, created)
    }
  }

  async removeReaction (
    card: CardID,
    message: MessageID,
    reaction: string,
    creator: SocialID,
    created: Date
  ): Promise<void> {
    const select = `SELECT m.id
                    FROM ${TableName.Message} m
                    WHERE m.id = $1::bigint`

    const messageDb = await this.execute(select, [message], 'select message')

    if (messageDb.length > 0) {
      const sql = `DELETE
                   FROM ${TableName.Reaction}
                   WHERE workspace_id = $1::uuid
                     AND card_id = $2::varchar
                     AND message_id = $3::bigint
                     AND reaction = $4::varchar
                     AND creator = $5::varchar`
      await this.execute(sql, [this.workspace, card, message, reaction, creator], 'remove reaction')
    } else {
      await this.createPatch(card, message, PatchType.removeReaction, reaction, creator, created)
    }
  }

  // Thread
  async createThread (card: CardID, message: MessageID, thread: CardID, created: Date): Promise<void> {
    const db: ThreadDb = {
      workspace_id: this.workspace,
      card_id: card,
      message_id: message,
      thread_id: thread,
      replies_count: 0,
      last_reply: created
    }
    const sql = `INSERT INTO ${TableName.Thread} (workspace_id, card_id, message_id, thread_id, replies_count,
                                                  last_reply)
                 VALUES ($1::uuid, $2::varchar, $3::bigint, $4::varchar, $5::int, $6::timestamptz)`
    await this.execute(
      sql,
      [db.workspace_id, db.card_id, db.message_id, db.thread_id, db.replies_count, db.last_reply],
      'insert thread'
    )
  }

  async updateThread (thread: CardID, lastReply: Date, op: 'increment' | 'decrement'): Promise<void> {
    if (op === 'increment') {
      const sql = `UPDATE ${TableName.Thread}
                   SET replies_count = replies_count + 1,
                       last_reply    = $3::timestamptz
                   WHERE workspace_id = $1::uuid
                     AND thread_id = $2::varchar`
      await this.execute(sql, [this.workspace, thread, lastReply], 'update thread')
    } else if (op === 'decrement') {
      const sql = `UPDATE ${TableName.Thread}
                   SET replies_count = GREATEST(replies_count - 1, 0)
                   WHERE workspace_id = $1::uuid
                     AND thread_id = $2::varchar`
      await this.execute(sql, [this.workspace, thread], 'update thread')
    }
  }

  // MessagesGroup
  async createMessagesGroup (
    card: CardID,
    blobId: BlobID,
    fromDate: Date,
    toDate: Date,
    fromId: MessageID,
    toId: MessageID,
    count: number
  ): Promise<void> {
    const db: MessagesGroupDb = {
      workspace_id: this.workspace,
      card_id: card,
      blob_id: blobId,
      from_date: fromDate,
      to_date: toDate,
      from_id: fromId,
      to_id: toId,
      count
    }

    const sql = `INSERT INTO ${TableName.MessagesGroup} (workspace_id, card_id, blob_id, from_date, to_date, from_id,
                                                         to_id, count)
                 VALUES ($1::uuid, $2::varchar, $3::uuid, $4::timestamptz, $5::timestamptz, $6::bigint, $7::bigint,
                         $8::int)`
    await this.execute(
      sql,
      [db.workspace_id, db.card_id, db.blob_id, db.from_date, db.to_date, db.from_id, db.to_id, db.count],
      'insert messages group'
    )
  }

  async removeMessagesGroup (card: CardID, blobId: BlobID): Promise<void> {
    const sql = `DELETE
                 FROM ${TableName.MessagesGroup}
                 WHERE workspace_id = $1::uuid
                   AND card_id = $2::varchar
                   AND blob_id = $3::uuid`
    await this.execute(sql, [this.workspace, card, blobId], 'remove messages group')
  }

  // Find messages
  async find (params: FindMessagesParams): Promise<Message[]> {
    // TODO: experiment with select to improve performance
    const select = `SELECT m.id,
                           m.card_id,
                           m.content,
                           m.creator,
                           m.created,
                           t.thread_id     as thread_id,
                           t.replies_count as replies_count,
                           t.last_reply    as last_reply,
                           ${this.subSelectPatches()},
                           ${this.subSelectReactions()}
                    FROM ${TableName.Message} m
                             LEFT JOIN ${TableName.Thread} t
                                       ON t.workspace_id = m.workspace_id AND t.card_id = m.card_id AND
                                          t.message_id = m.id`

    const { where, values } = this.buildMessageWhere(params)
    const orderBy =
      params.order != null ? `ORDER BY m.created ${params.order === SortingOrder.Ascending ? 'ASC' : 'DESC'}` : ''
    const limit = params.limit != null ? ` LIMIT ${params.limit}` : ''
    const sql = [select, where, orderBy, limit].join(' ')

    const result = await this.execute(sql, values, 'find messages')

    return result.map((it: any) => toMessage(it))
  }

  buildMessageWhere (params: FindMessagesParams): { where: string, values: any[] } {
    const where: string[] = ['m.workspace_id = $1::uuid']
    const values: any[] = [this.workspace]

    let index = 2

    if (params.id != null) {
      where.push(`m.id = $${index++}::bigint`)
      values.push(params.id)
    }

    if (params.card != null) {
      where.push(`m.card_id = $${index++}::varchar`)
      values.push(params.card)
    }

    const createdCondition = getCondition('m', 'created', index, params.created, 'timestamptz')

    if (createdCondition != null) {
      where.push(createdCondition.where)
      values.push(createdCondition.value)
      index++
    }

    return { where: `WHERE ${where.join(' AND ')}`, values }
  }

  subSelectPatches (): string {
    return `COALESCE(
            (SELECT jsonb_agg(jsonb_build_object(
                'content', p.content,
                'creator', p.creator,
                'created', p.created
            ) ORDER BY p.created DESC)
            FROM ${TableName.Patch} p
            WHERE p.message_id = m.id 
              AND p.workspace_id = m.workspace_id 
              AND p.card_id = m.card_id
              AND p.type = 'update'
            ), '[]'::jsonb) AS patches`
  }

  subSelectAttachments (): string {
    return `COALESCE(
                (SELECT jsonb_agg(jsonb_build_object(
                    'card_id', a.card_id,
                    'message_id', a.message_id,
                    'creator', a.creator,
                    'created', a.created
                ))
                FROM ${TableName.Attachment} a
                WHERE a.message_id = m.id
                ), '[]'::jsonb) AS attachments`
  }

  subSelectReactions (): string {
    return `COALESCE(
                (SELECT jsonb_agg(jsonb_build_object(
                    'message_id', r.message_id,
                    'reaction', r.reaction,
                    'creator', r.creator,
                    'created', r.created
                ))
                FROM ${TableName.Reaction} r
                WHERE r.workspace_id = m.workspace_id 
                  AND r.card_id = m.card_id
                  AND r.message_id = m.id
                ), '[]'::jsonb) AS reactions`
  }

  // Find thread
  async findThread (thread: CardID): Promise<Thread | undefined> {
    const sql = `SELECT t.card_id,
                        t.message_id,
                        t.thread_id,
                        t.replies_count,
                        t.last_reply
                 FROM ${TableName.Thread} t
                 WHERE t.workspace_id = $1::uuid
                   AND t.thread_id = $2::varchar
                 LIMIT 1;`

    const result = await this.execute(sql, [this.workspace, thread], 'find thread')
    return result.map((it: any) => toThread(it))[0]
  }

  // Find messages groups
  async findMessagesGroups (params: FindMessagesGroupsParams): Promise<MessagesGroup[]> {
    const select = `SELECT mg.card_id,
                           mg.blob_id,
                           mg.from_date,
                           mg.to_date,
                           mg.from_id,
                           mg.to_id,
                           mg.count,
                           jsonb_agg(jsonb_build_object(
                                             'message_id', p.message_id,
                                             'type', p.type,
                                             'content', p.content,
                                             'creator', p.creator,
                                             'created', p.created
                                     ) ORDER BY p.created) AS patches
                    FROM ${TableName.MessagesGroup} mg
                             LEFT JOIN ${TableName.Patch} p
                                       ON p.workspace_id = mg.workspace_id
                                           AND p.card_id = mg.card_id
                                           AND p.message_id BETWEEN mg.from_id AND mg.to_id`

    const { where, values } = this.buildMessagesGroupWhere(params)
    const orderBy =
      params.orderBy === 'toDate'
        ? `ORDER BY mg.to_date ${params.order === SortingOrder.Ascending ? 'ASC' : 'DESC'}`
        : `ORDER BY mg.from_date ${params.order === SortingOrder.Ascending ? 'ASC' : 'DESC'}`
    const groupBy = 'GROUP BY mg.card_id, mg.blob_id, mg.from_date, mg.to_date, mg.from_id, mg.to_id, mg.count'

    const limit = params.limit != null ? ` LIMIT ${params.limit}` : ''
    const sql = [select, where, groupBy, orderBy, limit].join(' ')

    const result = await this.execute(sql, values, 'find messages groups')

    return result.map((it: any) => toMessagesGroup(it))
  }

  buildMessagesGroupWhere (params: FindMessagesGroupsParams): {
    where: string
    values: any[]
  } {
    const where: string[] = ['mg.workspace_id = $1::uuid']
    const values: any[] = [this.workspace]

    let index = 2

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
      values.push(fromDateCondition.value)
      index++
    }

    const toDateCondition = getCondition('mg', 'to_date', index, params.toDate, 'timestamptz')
    if (toDateCondition != null) {
      where.push(toDateCondition.where)
      values.push(toDateCondition.value)
      index++
    }

    return { where: `WHERE ${where.join(' AND ')}`, values }
  }
}
