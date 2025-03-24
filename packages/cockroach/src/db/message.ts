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
  type BlobID,
  type CardID,
  type FindMessagesGroupsParams,
  type FindMessagesParams,
  type Message,
  type MessageID,
  type MessagesGroup,
  type MessageType,
  PatchType,
  type RichText,
  type SocialID,
  SortingOrder,
  type Thread
} from '@hcengineering/communication-types'
import { generateMessageId, parseMessageId } from '@hcengineering/communication-shared'

import { BaseDb } from './base'
import {type FileDb, type MessageDb, type MessagesGroupDb, type PatchDb, type ReactionDb, TableName, type ThreadDb } from './schema'
import { getCondition } from './utils'
import { toMessage, toMessagesGroup, toThread } from './mapping'

export class MessagesDb extends BaseDb {
  // Message
  async createMessage (
    card: CardID,
    type: MessageType,
    content: RichText,
    creator: SocialID,
    created: Date,
    data?: any
  ): Promise<MessageID> {
    const id = generateMessageId()
    const db: MessageDb = {
      id,
      type,
      workspace_id: this.workspace,
      card_id: card,
      content,
      creator,
      created,
      data
    }

    const sql = `INSERT INTO ${TableName.Message} (workspace_id, card_id, id, content, creator, created, type, data)
                     VALUES ($1::uuid, $2::varchar, $3::bigint, $4::text, $5::varchar, $6::timestamptz, $7::varchar, $8::jsonb)`

    await this.execute(
      sql,
      [db.workspace_id, db.card_id, db.id, db.content, db.creator, db.created, db.type, db.data ?? {}],
      'insert message'
    )

    return id
  }

  async removeMessages (card: CardID, messages: MessageID[], socialIds?: SocialID[]): Promise<MessageID[]> {
    if (messages.length === 0) return []

    const where: string[] = ['workspace_id = $1::uuid', 'card_id = $2::varchar']
    const values: any[] = [this.workspace, card]

    let index = values.length + 1

    if (socialIds?.length === 1) {
      where.push(`creator = $${index++}::varchar`)
      values.push(socialIds[0])
    }

    if (socialIds != null && socialIds.length > 1) {
      where.push(`creator = ANY($${index++}::varchar[])`)
      values.push(socialIds)
    }

    if (messages.length === 1) {
      where.push(`id = $${index++}::bigint`)
      values.push(messages[0])
    } else {
      where.push(`id = ANY($${index++}::bigint[])`)
      values.push(messages)
    }

    const sql = `DELETE FROM ${TableName.Message} WHERE ${where.join(' AND ')} RETURNING id`

    const result = await this.execute(sql, values, 'remove messages')

    return result.map((row: any) => row.id)
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
      created,
      message_created_sec: parseMessageId(message)
    }

    const sql = `INSERT INTO ${TableName.Patch} (workspace_id, card_id, message_id, type, content, creator, created, message_created_sec)
                     VALUES ($1::uuid, $2::varchar, $3::bigint, $4::varchar, $5::text, $6::varchar, $7::timestamptz, $8::timestamptz)`

    await this.execute(
      sql,
      [db.workspace_id, db.card_id, db.message_id, db.type, db.content, db.creator, db.created, db.message_created_sec],
      'insert patch'
    )
  }

  // File
  async createFile (card: CardID, message: MessageID,  blobId: BlobID, fileType: string, filename: string, size: number,creator: SocialID, created: Date): Promise<void> {
    const db: FileDb = {
      workspace_id: this.workspace,
      card_id: card,
      message_id: message,
      blob_id: blobId,
      type: fileType,
      filename,
      size,
      creator,
      created,
      message_created_sec: parseMessageId(message)
    }
    const sql = `INSERT INTO ${TableName.File} (workspace_id, card_id, message_id, blob_id, type, filename, creator, created, message_created_sec, size)
                     VALUES ($1::uuid, $2::varchar, $3::int8, $4::uuid, $5::varchar, $6::varchar, $7::varchar, $8::timestamptz, $9::timestamptz, $10::int8)`

    await this.execute(sql, [db.workspace_id, db.card_id, db.message_id, db.blob_id, db.type, db.filename, db.creator, db.created, db.message_created_sec, db.size], 'insert file')
  }

  async removeFile (card: CardID, message: MessageID, blobId: BlobID): Promise<void> {
    const sql = `DELETE
                 FROM ${TableName.File}
                 WHERE workspace_id = $1::uuid
                   AND card_id = $2::varchar
                   AND message_id = $3::bigint
                   AND blob_id = $4::uuid`
    await this.execute(sql, [this.workspace, card, message, blobId], 'remove file')
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

  async updateThread (thread: CardID, op: 'increment' | 'decrement', lastReply?: Date): Promise<void> {
    const set: string[] = []
    const values: any[] = []

    if (lastReply != null) {
      set.push('last_reply = $3::timestamptz')
      values.push(lastReply)
    }

    if (op === 'increment') {
      set.push('replies_count = replies_count + 1')
    } else if (op === 'decrement') {
      set.push('replies_count = GREATEST(replies_count - 1, 0)')
    }

    const update = `UPDATE ${TableName.Thread}`
    const setSql = 'SET ' + set.join(', ')
    const where = 'WHERE workspace_id = $1::uuid AND thread_id = $2::varchar'
    const sql = [update, setSql, where].join(' ')
    await this.execute(sql, [this.workspace, thread, ...values], 'update thread')
  }

  // MessagesGroup
  async createMessagesGroup (card: CardID, blobId: BlobID, fromSec: Date, toSec: Date, count: number): Promise<void> {
    const db: MessagesGroupDb = {
      workspace_id: this.workspace,
      card_id: card,
      blob_id: blobId,
      from_sec: fromSec,
      to_sec: toSec,
      count
    }

    const sql = `INSERT INTO ${TableName.MessagesGroup} (workspace_id, card_id, blob_id, from_sec, to_sec, count)
                     VALUES ($1::uuid, $2::varchar, $3::uuid, $4::timestamptz, $5::timestamptz, $6::int)`
    await this.execute(
      sql,
      [db.workspace_id, db.card_id, db.blob_id, db.from_sec, db.to_sec, db.count],
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

  async find(params: FindMessagesParams): Promise<Message[]> {
    const { where, values } = this.buildMessageWhere(params);
    const orderBy = this.buildOrderBy(params);
    const limit = this.buildLimit(params);

    const sql = `
    WITH
    ${this.buildCteLimitedMessages(where, orderBy, limit)}
    ${this.buildCteAggregatedFiles(params)}
    ${this.buildCteAggregatedReactions(params)}
    ${this.buildCteAggregatedPatches()}
    ${this.buildMainSelect(params)}
  `;

    const result = await this.execute(sql, values, 'find messages');
    return result.map((it: any) => toMessage(it));
  }

  private buildOrderBy(params: FindMessagesParams): string {
    return params.order != null
      ? `ORDER BY m.created ${params.order === SortingOrder.Ascending ? 'ASC' : 'DESC'}`
      : '';
  }

  private buildLimit(params: FindMessagesParams): string {
    return params.limit != null ? `LIMIT ${params.limit}` : '';
  }

  private buildCteLimitedMessages(where: string, orderBy: string, limit: string): string {
    return `
    limited_messages AS (
      SELECT *
      FROM ${TableName.Message} m
      ${where}
      ${orderBy}
      ${limit}
    )
  `;
  }

  private buildCteAggregatedFiles(params: FindMessagesParams): string {
    if (!params.files) return '';
    return `,
    agg_files AS (
      SELECT
        f.workspace_id,
        f.card_id,
        f.message_id,
        jsonb_agg(jsonb_build_object(
          'card_id', f.card_id,
          'message_id', f.message_id,
          'blob_id', f.blob_id,
          'type', f.type,
          'filename', f.filename,
          'creator', f.creator,
          'created', f.created
        )) AS files
      FROM ${TableName.File} f
      INNER JOIN limited_messages m
        ON m.workspace_id = f.workspace_id
        AND m.card_id = f.card_id
        AND m.id = f.message_id
      GROUP BY f.workspace_id, f.card_id, f.message_id
    )
  `;
  }

  private buildCteAggregatedReactions(params: FindMessagesParams): string {
    if (!params.reactions) return '';
    return `,
    agg_reactions AS (
      SELECT
        r.workspace_id,
        r.card_id,
        r.message_id,
        jsonb_agg(jsonb_build_object(
          'message_id', r.message_id,
          'reaction', r.reaction,
          'creator', r.creator,
          'created', r.created
        )) AS reactions
      FROM ${TableName.Reaction} r
      INNER JOIN limited_messages m
        ON m.workspace_id = r.workspace_id
        AND m.card_id = r.card_id
        AND m.id = r.message_id
      GROUP BY r.workspace_id, r.card_id, r.message_id
    )
  `;
  }

  private buildCteAggregatedPatches(): string {
    return `,
    agg_patches AS (
      SELECT
        p.workspace_id,
        p.card_id,
        p.message_id,
        jsonb_agg(
          jsonb_build_object(
            'content', p.content,
            'creator', p.creator,
            'created', p.created
          ) ORDER BY p.created DESC
        ) AS patches
      FROM ${TableName.Patch} p
      INNER JOIN limited_messages m
        ON m.workspace_id = p.workspace_id
        AND m.card_id = p.card_id
        AND m.id = p.message_id
      WHERE p.type = 'update'
      GROUP BY p.workspace_id, p.card_id, p.message_id
    )
  `;
  }

  private buildMainSelect(params: FindMessagesParams): string {
    const orderBy = this.buildOrderBy(params);
    const selectReplies = params.replies
      ? `t.thread_id as thread_id, t.replies_count as replies_count, t.last_reply as last_reply,`
      : '';

    const selectFiles = params.files
      ? `COALESCE(f.files, '[]'::jsonb) AS files,`
      : `'[]'::jsonb AS files,`;

    const selectReactions = params.reactions
      ? `COALESCE(r.reactions, '[]'::jsonb) AS reactions,`
      : `'[]'::jsonb AS reactions,`;

    const joinFiles = params.files ? `
    LEFT JOIN agg_files f
      ON f.workspace_id = m.workspace_id
      AND f.card_id = m.card_id
      AND f.message_id = m.id` : '';

    const joinReactions = params.reactions ? `
    LEFT JOIN agg_reactions r
      ON r.workspace_id = m.workspace_id
      AND r.card_id = m.card_id
      AND r.message_id = m.id` : '';

    return `
    SELECT
      m.id,
      m.card_id,
      m.type,
      m.content,
      m.creator,
      m.created,
      m.data,
      ${selectReplies}
      ${selectFiles}
      ${selectReactions}
      COALESCE(p.patches, '[]'::jsonb) AS patches
    FROM limited_messages m
    LEFT JOIN ${TableName.Thread} t
      ON t.workspace_id = m.workspace_id
      AND t.card_id = m.card_id
      AND t.message_id = m.id
    ${joinFiles}
    ${joinReactions}
    LEFT JOIN agg_patches p
      ON p.workspace_id = m.workspace_id
      AND p.card_id = m.card_id
      AND p.message_id = m.id
    ${orderBy}
  `;
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
      values.push(...createdCondition.values)
      index = createdCondition.index
    }

    return { where: `WHERE ${where.join(' AND ')}`, values }
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
    const select = `
            SELECT mg.card_id,
                   mg.blob_id,
                   mg.from_sec,
                   mg.to_sec,
                   mg.count,
                   patches
            FROM ${TableName.MessagesGroup} mg
                     CROSS JOIN LATERAL (
                SELECT jsonb_agg(jsonb_build_object(
                                         'message_id', p.message_id,
                                         'type', p.type,
                                         'content', p.content,
                                         'creator', p.creator,
                                         'created', p.created
                                 ) ORDER BY p.created) AS patches
                FROM ${TableName.Patch} p
                WHERE p.workspace_id = mg.workspace_id
                  AND p.card_id = mg.card_id
                  AND p.message_created_sec BETWEEN mg.from_sec AND mg.to_sec
                ) sub`

    const { where, values } = this.buildMessagesGroupWhere(params)
    const orderBy =
      params.orderBy === 'toSec'
        ? `ORDER BY mg.to_sec ${params.order === SortingOrder.Ascending ? 'ASC' : 'DESC'}`
        : `ORDER BY mg.from_sec ${params.order === SortingOrder.Ascending ? 'ASC' : 'DESC'}`
    const limit = params.limit != null ? ` LIMIT ${params.limit}` : ''

    const sql = [select, where, orderBy, limit].join(' ')
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

    where.push(`mg.card_id = $${index++}::varchar`)
    values.push(params.card)

    if (params.blobId != null) {
      where.push(`mg.blob_id = $${index++}`)
      values.push(params.blobId)
    }

    const fromDateCondition = getCondition('mg', 'from_sec', index, params.fromSec, 'timestamptz')
    if (fromDateCondition != null) {
      where.push(fromDateCondition.where)
      values.push(...fromDateCondition.values)
      index = fromDateCondition.index
    }

    const toDateCondition = getCondition('mg', 'to_sec', index, params.toSec, 'timestamptz')
    if (toDateCondition != null) {
      where.push(toDateCondition.where)
      values.push(...toDateCondition.values)
      index = toDateCondition.index
    }

    if (params.patches === true) {
      where.push('sub.patches IS NOT NULL')
    }

    return { where: `WHERE ${where.join(' AND ')}`, values }
  }
}
