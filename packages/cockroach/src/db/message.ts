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
  AddReactionPatchData,
  AttachBlobsPatchData,
  AttachLinkPreviewsPatchData,
  AttachThreadPatchData,
  type BlobData,
  type BlobID,
  BlobUpdateData,
  type CardID,
  type CardType,
  DetachBlobsPatchData,
  DetachLinkPreviewsPatchData,
  type FindMessagesGroupsParams,
  type FindMessagesParams,
  type LinkPreviewData,
  type LinkPreviewID,
  type Markdown,
  type Message,
  type MessageExtra,
  type MessageID,
  type MessagesGroup,
  type MessageType,
  PatchType,
  RemoveReactionPatchData,
  SetLinkPreviewsPatchData,
  type SocialID,
  SortingOrder,
  type Thread,
  UpdateBlobsPatchData,
  UpdateThreadPatchData
} from '@hcengineering/communication-types'
import type { ThreadUpdates, ThreadQuery } from '@hcengineering/communication-sdk-types'
import postgres from 'postgres'

import { BaseDb } from './base'
import {
  type MessageDb,
  messageSchema,
  type MessagesGroupDb,
  type PatchDb,
  type ReactionDb,
  TableName,
  type ThreadDb
} from '../schema'
import { getCondition } from './utils'
import { toMessage, toMessagesGroup, toThread } from './mapping'

export class MessagesDb extends BaseDb {
  // Message
  async createMessage (
    id: MessageID,
    cardId: CardID,
    type: MessageType,
    content: Markdown,
    extra: MessageExtra | undefined,
    creator: SocialID,
    created: Date
  ): Promise<boolean> {
    const db: MessageDb = {
      type,
      workspace_id: this.workspace,
      card_id: cardId,
      content,
      creator,
      created,
      data: extra,
      id
    }

    const values: any[] = []
    const keys: string[] = []

    for (const key in db) {
      const value: any = (db as any)[key]
      if (value == null) continue
      keys.push(key)
      values.push(value)
    }

    const placeholders = keys.map((key, i) => `$${i + 1}::${(messageSchema as any)[key]}`)

    const insertSql = `INSERT INTO ${TableName.Message} (${keys.join(', ')})
                   VALUES (${placeholders.join(', ')})
                   RETURNING id::text, created`

    return await this.getRowClient().begin(async (s) => {
      const sql = `INSERT INTO ${TableName.MessageCreated} (workspace_id, card_id, message_id, created)
                     VALUES ($1::uuid, $2::varchar, $3::varchar, $4::timestamptz)
                     ON CONFLICT (workspace_id, card_id, message_id) DO NOTHING`
      const result = await s.unsafe(sql, [this.workspace, cardId, db.id, created])
      if (result.count === 0) {
        return false
      }

      await s.unsafe(insertSql, values)
      return true
    })
  }

  async createPatch (
    cardId: CardID,
    messageId: MessageID,
    type: PatchType,
    data: Record<string, any>,
    creator: SocialID,
    created: Date,
    client?: postgres.TransactionSql
  ): Promise<void> {
    const db: Omit<PatchDb, 'message_created'> = {
      workspace_id: this.workspace,
      card_id: cardId,
      message_id: messageId,
      type,
      data,
      creator,
      created
    }

    const sql = `
        INSERT INTO ${TableName.Patch} (
            workspace_id, card_id, message_id,
            type, data, creator, created, message_created
        )
        SELECT
            $1::uuid, $2::varchar, $3::varchar,
            $4::varchar, $5::jsonb, $6::varchar, $7::timestamptz,
            mc.created
        FROM ${TableName.MessageCreated} mc
        WHERE mc.workspace_id = $1::uuid
          AND mc.card_id = $2::varchar
          AND mc.message_id = $3::varchar
    `

    await this.execute(
      sql,
      [this.workspace, db.card_id, db.message_id, db.type, db.data, db.creator, db.created],
      'insert patch',
      client
    )
  }

  // Blob
  async attachBlobs (
    cardId: CardID,
    messageId: MessageID,
    blobs: BlobData[],
    socialId: SocialID,
    date: Date
  ): Promise<void> {
    if (blobs.length === 0) return

    const values: any[] = []
    const placeholders: string[] = []

    blobs.forEach((blob, i) => {
      const baseIndex = i * 10
      placeholders.push(`($${baseIndex + 1}::uuid, $${baseIndex + 2}::varchar, $${baseIndex + 3}::varchar, $${baseIndex + 4}::uuid,
                        $${baseIndex + 5}::varchar, $${baseIndex + 6}::varchar, $${baseIndex + 7}::varchar,
                        $${baseIndex + 8}::timestamptz, $${baseIndex + 9}::int8, $${baseIndex + 10}::jsonb)`)

      values.push(
        this.workspace,
        cardId,
        messageId,
        blob.blobId,
        blob.mimeType,
        blob.fileName,
        socialId,
        date,
        blob.size,
        blob.metadata ?? {}
      )
    })

    const insertSql = `
            INSERT INTO ${TableName.File} (workspace_id, card_id, message_id, blob_id,
                                           type, filename, creator, created, size, meta)
            VALUES ${placeholders.join(', ')}`

    const inDb = await this.isMessageInDb(cardId, messageId)
    if (!inDb) {
      await this.getRowClient().begin(async (s) => {
        await this.execute(insertSql, values, 'insert files', s)

        const data: AttachBlobsPatchData = {
          operation: 'attach',
          blobs
        }
        await this.createPatch(cardId, messageId, PatchType.blob, data, socialId, date, s)
        return true
      })
    } else {
      await this.execute(insertSql, values, 'insert files')
    }
  }

  async detachBlobs (
    cardId: CardID,
    messageId: MessageID,
    blobIds: BlobID[],
    socialId: SocialID,
    date: Date
  ): Promise<void> {
    if (blobIds.length === 0) return

    const sql = `
        DELETE FROM ${TableName.File}
        WHERE workspace_id = $1::uuid
          AND card_id = $2::varchar
          AND message_id = $3::varchar
          AND blob_id = ANY($4::uuid[])
    `

    const inDb = await this.isMessageInDb(cardId, messageId)
    if (!inDb) {
      await this.getRowClient().begin(async (s) => {
        await this.execute(sql, [this.workspace, cardId, messageId, blobIds], 'remove files', s)

        const data: DetachBlobsPatchData = {
          operation: 'detach',
          blobIds
        }
        await this.createPatch(cardId, messageId, PatchType.blob, data, socialId, date, s)
        return true
      })
    } else {
      await this.execute(sql, [this.workspace, cardId, messageId, blobIds], 'remove files')
    }
  }

  async setBlobs (
    cardId: CardID,
    messageId: MessageID,
    blobs: BlobData[],
    socialId: SocialID,
    date: Date
  ): Promise<void> {
    if (blobs.length === 0) return

    const values: any[] = []
    const placeholders: string[] = []

    blobs.forEach((blob, i) => {
      const baseIndex = i * 10
      placeholders.push(`($${baseIndex + 1}::uuid, $${baseIndex + 2}::varchar, $${baseIndex + 3}::varchar, $${baseIndex + 4}::uuid,
                        $${baseIndex + 5}::varchar, $${baseIndex + 6}::varchar, $${baseIndex + 7}::varchar,
                        $${baseIndex + 8}::timestamptz, $${baseIndex + 9}::int8, $${baseIndex + 10}::jsonb)`)

      values.push(
        this.workspace,
        cardId,
        messageId,
        blob.blobId,
        blob.mimeType,
        blob.fileName,
        socialId,
        date,
        blob.size,
        blob.metadata ?? {}
      )
    })

    const insertSql = `
            INSERT INTO ${TableName.File} (workspace_id, card_id, message_id, blob_id,
                                           type, filename, creator, created, size, meta)
            VALUES ${placeholders.join(', ')}`
    const deleteSql = `
        DELETE FROM ${TableName.File}
        WHERE workspace_id = $1::uuid
          AND card_id = $2::varchar
          AND message_id = $3::varchar
    `
    await this.getRowClient().begin(async (s) => {
      await this.execute(deleteSql, [this.workspace, cardId, messageId], 'delete blobs', s)
      await this.execute(insertSql, values, 'insert blobs', s)

      const data: AttachBlobsPatchData = {
        operation: 'attach',
        blobs
      }

      await this.createPatch(cardId, messageId, PatchType.blob, data, socialId, date, s)

      return true
    })
  }

  async updateBlobs (
    cardId: CardID,
    messageId: MessageID,
    blobs: BlobUpdateData[],
    socialId: SocialID,
    date: Date
  ): Promise<void> {
    if (blobs.length === 0) return

    const colMap = {
      mimeType: { col: 'type', cast: '::varchar' },
      fileName: { col: 'filename', cast: '::varchar' },
      size: { col: 'size', cast: '::int8' },
      metadata: { col: 'meta', cast: '::jsonb' }
    } as const
    type UpdateKey = keyof typeof colMap
    const updateKeys = Object.keys(colMap) as UpdateKey[]

    const params: any[] = [this.workspace, cardId, messageId]

    const rowLen = 1 + updateKeys.length

    const tuples = blobs.map((blob, i) => {
      params.push(blob.blobId)
      updateKeys.forEach((k) => params.push(blob[k] ?? null))

      const offset = 3 + i * rowLen
      const casts = ['::uuid', ...updateKeys.map((k) => colMap[k].cast)]
      const placeholders = casts.map((cast, idx) => `$${offset + idx + 1}${cast}`)
      return `(${placeholders.join(', ')})`
    })

    const setClauses = updateKeys.map((k) => {
      const col = colMap[k].col
      return `${col} = COALESCE(v.${col}, f.${col})`
    })

    const updateSql = `
        UPDATE ${TableName.File} AS f
        SET ${setClauses.join(',\n  ')}
        FROM (VALUES ${tuples.join(',\n    ')}) AS v(blob_id, ${updateKeys.map((k) => colMap[k].col).join(', ')})
        WHERE f.workspace_id = $1::uuid
          AND f.card_id = $2::varchar
          AND f.message_id = $3::varchar
          AND f.blob_id = v.blob_id;
    `

    const inDb = await this.isMessageInDb(cardId, messageId)
    if (!inDb) {
      await this.getRowClient().begin(async (txn) => {
        await this.execute(updateSql, params, 'update blobs', txn)
        const data: UpdateBlobsPatchData = { operation: 'update', blobs }
        await this.createPatch(cardId, messageId, PatchType.blob, data, socialId, date, txn)
      })
    } else {
      await this.execute(updateSql, params, 'update blobs')
    }
  }

  async attachLinkPreviews (
    cardId: CardID,
    messageId: MessageID,
    previews: (LinkPreviewData & { previewId: LinkPreviewID })[],
    socialId: SocialID,
    date: Date
  ): Promise<void> {
    if (previews.length === 0) return

    const values: any[] = []
    const placeholders: string[] = []

    previews.forEach((preview, i) => {
      const base = i * 12
      placeholders.push(`($${base + 1}::uuid, $${base + 2}::varchar, $${base + 3}::varchar, $${base + 4}::varchar,
                        $${base + 5}::varchar, $${base + 6}::varchar, $${base + 7}::varchar,
                        $${base + 8}::varchar, $${base + 9}::varchar, $${base + 10}::jsonb,
                        $${base + 11}::varchar, $${base + 12}::timestamptz, $${base + 13}::int8)`)

      values.push(
        this.workspace,
        cardId,
        messageId,
        preview.url,
        preview.host,
        preview.title ?? null,
        preview.description ?? null,
        preview.iconUrl ?? null,
        preview.siteName ?? null,
        preview.previewImage ?? null,
        socialId,
        date,
        preview.previewId
      )
    })

    const insertSql = `
    INSERT INTO ${TableName.LinkPreview} (
      workspace_id, card_id, message_id, url, host, title, description,
      favicon, hostname, image, creator, created, id
    ) VALUES ${placeholders.join(', ')}`

    const inDb = await this.isMessageInDb(cardId, messageId)
    if (!inDb) {
      await this.getRowClient().begin(async (s) => {
        await this.execute(insertSql, values, 'insert link previews', s)

        const data: AttachLinkPreviewsPatchData = {
          operation: 'attach',
          previews
        }
        await this.createPatch(cardId, messageId, PatchType.linkPreview, data, socialId, date, s)
      })
    } else {
      await this.execute(insertSql, values, 'insert link previews')
    }
  }

  async detachLinkPreviews (
    cardId: CardID,
    messageId: MessageID,
    previewIds: LinkPreviewID[],
    socialId: SocialID,
    date: Date
  ): Promise<void> {
    if (previewIds.length === 0) return

    const sql =
      previewIds.length > 1
        ? `
        DELETE FROM ${TableName.LinkPreview}
        WHERE workspace_id = $1::uuid
          AND card_id = $2::varchar
          AND message_id = $3::varchar
          AND id = ANY($4::int8[])
      `
        : `
        DELETE FROM ${TableName.LinkPreview}
        WHERE workspace_id = $1::uuid
          AND card_id = $2::varchar
          AND message_id = $3::varchar
          AND id = $4::int8
    `

    const inDb = await this.isMessageInDb(cardId, messageId)

    if (!inDb) {
      await this.getRowClient().begin(async (s) => {
        await this.execute(
          sql,
          [this.workspace, cardId, messageId, previewIds.length === 1 ? previewIds[0] : previewIds],
          'remove link previews',
          s
        )

        const data: DetachLinkPreviewsPatchData = {
          operation: 'detach',
          previewIds
        }

        await this.createPatch(cardId, messageId, PatchType.linkPreview, data, socialId, date, s)

        return true
      })
    } else {
      await this.execute(
        sql,
        [this.workspace, cardId, messageId, previewIds.length === 1 ? previewIds[0] : previewIds],
        'remove link previews'
      )
    }
  }

  public async setLinkPreviews (
    cardId: CardID,
    messageId: MessageID,
    previews: (LinkPreviewData & { previewId: LinkPreviewID })[],
    socialId: SocialID,
    date: Date
  ): Promise<void> {
    if (previews.length === 0) return
    const deleteSql = `
    DELETE FROM ${TableName.LinkPreview}
    WHERE workspace_id = $1::uuid
      AND card_id = $2::varchar
      AND message_id = $3::varchar
  `

    const values: any[] = []
    const placeholders: string[] = []

    previews.forEach((preview, i) => {
      const base = i * 12
      placeholders.push(`($${base + 1}::uuid, $${base + 2}::varchar, $${base + 3}::varchar, $${base + 4}::varchar,
                        $${base + 5}::varchar, $${base + 6}::varchar, $${base + 7}::varchar,
                        $${base + 8}::varchar, $${base + 9}::varchar, $${base + 10}::jsonb,
                        $${base + 11}::varchar, $${base + 12}::timestamptz, $${base + 13}::int8)`)

      values.push(
        this.workspace,
        cardId,
        messageId,
        preview.url,
        preview.host,
        preview.title ?? null,
        preview.description ?? null,
        preview.iconUrl ?? null,
        preview.siteName ?? null,
        preview.previewImage ?? null,
        socialId,
        date,
        preview.previewId
      )
    })

    const insertSql = `INSERT INTO ${TableName.LinkPreview} (
      workspace_id, card_id, message_id, url, host, title, description,
      favicon, hostname, image, creator, created, id
    ) VALUES ${placeholders.join(', ')} `

    await this.getRowClient().begin(async (s) => {
      await this.execute(deleteSql, [this.workspace, cardId, messageId], 'delete link previews', s)
      await this.execute(insertSql, values, 'insert new link previews', s)

      const data: SetLinkPreviewsPatchData = {
        operation: 'set',
        previews
      }

      await this.createPatch(cardId, messageId, PatchType.linkPreview, data, socialId, date, s)

      return true
    })
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
      const db: ReactionDb = {
        workspace_id: this.workspace,
        card_id: cardId,
        message_id: messageId,
        reaction,
        creator,
        created
      }
      const sql = `INSERT INTO ${TableName.Reaction} (workspace_id, card_id, message_id, reaction, creator, created)
                   VALUES ($1::uuid, $2::varchar, $3::varchar, $4::varchar, $5::varchar, $6::timestamptz)
                   ON CONFLICT DO NOTHING`

      await this.execute(
        sql,
        [db.workspace_id, db.card_id, db.message_id, db.reaction, db.creator, db.created],
        'insert reaction'
      )
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
      const sql = `DELETE
                   FROM ${TableName.Reaction}
                   WHERE workspace_id = $1::uuid
                     AND card_id = $2::varchar
                     AND message_id = $3::varchar
                     AND reaction = $4::varchar
                     AND creator = $5::varchar`
      await this.execute(sql, [this.workspace, cardId, messageId, reaction, socialId], 'remove reaction')
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
    const db: ThreadDb = {
      workspace_id: this.workspace,
      card_id: cardId,
      message_id: messageId,
      thread_id: threadId,
      thread_type: threadType,
      replies_count: 0,
      last_reply: date
    }
    const sql = `INSERT INTO ${TableName.Thread} (workspace_id, card_id, message_id, thread_id, thread_type,
                                                  replies_count,
                                                  last_reply)
                 VALUES ($1::uuid, $2::varchar, $3::varchar, $4::varchar, $5::varchar, $6::int, $7::timestamptz)`

    const inDb = await this.isMessageInDb(cardId, messageId)
    if (!inDb) {
      await this.getRowClient().begin(async (s) => {
        await this.execute(
          sql,
          [db.workspace_id, db.card_id, db.message_id, db.thread_id, db.thread_type, db.replies_count, db.last_reply],
          'insert thread',
          s
        )

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

    const updateSql = `UPDATE ${TableName.Thread}`
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
    const db: Partial<ThreadDb> = {
      card_id: query.cardId,
      message_id: query.messageId,
      thread_id: query.threadId
    }

    const entries = Object.entries(db).filter(([_, value]) => value !== undefined)

    if (entries.length === 0) return

    entries.unshift(['workspace_id', this.workspace])

    const whereClauses = entries.map(([key], index) => `${key} = $${index + 1}`)
    const whereValues = entries.map(([_, value]) => value)

    const sql = `DELETE
                 FROM ${TableName.Thread}
                 WHERE ${whereClauses.join(' AND ')}`

    await this.execute(sql, whereValues, 'remove threads')
  }

  // MessagesGroup
  async createMessagesGroup (card: CardID, blobId: BlobID, fromDate: Date, toDate: Date, count: number): Promise<void> {
    const db: MessagesGroupDb = {
      workspace_id: this.workspace,
      card_id: card,
      blob_id: blobId,
      from_date: fromDate,
      to_date: toDate,
      count
    }

    const sql = `INSERT INTO ${TableName.MessagesGroup} (workspace_id, card_id, blob_id, from_date, to_date, count)
                 VALUES ($1::uuid, $2::varchar, $3::uuid, $4::timestamptz, $5::timestamptz, $6::int)`
    await this.execute(
      sql,
      [db.workspace_id, db.card_id, db.blob_id, db.from_date, db.to_date, db.count],
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

  async find (params: FindMessagesParams): Promise<Message[]> {
    const { where, values } = this.buildMessageWhere(params)
    const orderBy = this.buildOrderBy(params)
    const limit = this.buildLimit(params)

    const sql = `
    WITH
    ${this.buildCteLimitedMessages(where, orderBy, limit)}
    ${this.buildCteAggregatedFiles(params)}
    ${this.buildCteAggregatedLinkPreviews(params)}
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
      FROM ${TableName.Message} m
      ${where}
      ${orderBy}
      ${limit}
    )
  `
  }

  private buildCteAggregatedFiles (params: FindMessagesParams): string {
    if (params.files !== true) return ''
    return `,
    agg_files AS (
      SELECT
        f.workspace_id,
        f.card_id,
        f.message_id,
        jsonb_agg(jsonb_build_object(
          'blob_id', f.blob_id,
          'type', f.type,
          'size', f.size,
          'filename', f.filename,
          'meta', f.meta,
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
  `
  }

  private buildCteAggregatedLinkPreviews (params: FindMessagesParams): string {
    if (params.links !== true) return ''
    return `,
    agg_link_previews AS (
      SELECT
        l.workspace_id,
        l.card_id,
        l.message_id,
        jsonb_agg(jsonb_build_object(
          'id', l.id::text,
          'url', l.url,
          'host', l.host,
          'title', l.title,
          'description', l.description,
          'favicon', l.favicon,
          'hostname', l.hostname,
          'image', l.image,
          'creator', l.creator,
          'created', l.created
      )) AS link_previews
      FROM ${TableName.LinkPreview} l
      INNER JOIN limited_messages m
        ON m.workspace_id = l.workspace_id
        AND m.card_id = l.card_id
        AND m.id = l.message_id
      GROUP BY l.workspace_id, l.card_id, l.message_id
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
      FROM ${TableName.Reaction} r
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
      FROM ${TableName.Patch} p
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

    const selectFiles = params.files === true ? "COALESCE(f.files, '[]'::jsonb) AS files," : "'[]'::jsonb AS files,"
    const selectLinks =
      params.links === true
        ? "COALESCE(l.link_previews, '[]'::jsonb) AS link_previews,"
        : "'[]'::jsonb AS link_previews,"

    const selectReactions =
      params.reactions === true ? "COALESCE(r.reactions, '[]'::jsonb) AS reactions," : "'[]'::jsonb AS reactions,"

    const joinFiles =
      params.files === true
        ? `
    LEFT JOIN agg_files f
      ON f.workspace_id = m.workspace_id
      AND f.card_id = m.card_id
      AND f.message_id = m.id`
        : ''

    const joinLinks =
      params.links === true
        ? `
    LEFT JOIN agg_link_previews l
      ON l.workspace_id = m.workspace_id
      AND l.card_id = m.card_id
      AND l.message_id = m.id`
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
                   ${selectFiles}
                   ${selectLinks}
                   ${selectReactions}
                   COALESCE(p.patches, '[]'::jsonb) AS patches
        FROM limited_messages m
                 LEFT JOIN ${TableName.Thread} t
                           ON t.workspace_id = m.workspace_id
                               AND t.card_id = m.card_id
                               AND t.message_id = m.id
                                   ${joinFiles}
                                       ${joinLinks}
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

  // Find thread
  async findThread (thread: CardID): Promise<Thread | undefined> {
    const sql = `SELECT t.card_id,
                        t.message_id::text,
                        t.thread_id,
                        t.thread_type,
                        t.replies_count::int,
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
               mg.from_date,
               mg.to_date,
               mg.count,
               patches
        FROM ${TableName.MessagesGroup} mg
                 CROSS JOIN LATERAL (
            SELECT jsonb_agg(jsonb_build_object(
                                     'message_id', p.message_id::text,
                                     'type', p.type,
                                     'data', p.data,
                                     'creator', p.creator,
                                     'created', p.created
                             ) ORDER BY p.created) AS patches
            FROM ${TableName.Patch} p
            WHERE p.workspace_id = mg.workspace_id
              AND p.card_id = mg.card_id
              AND p.message_created BETWEEN mg.from_date AND mg.to_date
            ) sub`

    const { where, values } = this.buildMessagesGroupWhere(params)
    const orderBy =
      params.orderBy === 'toDate'
        ? `ORDER BY mg.to_date ${params.order === SortingOrder.Ascending ? 'ASC' : 'DESC'}`
        : `ORDER BY mg.from_date ${params.order === SortingOrder.Ascending ? 'ASC' : 'DESC'}`
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

    return { where: `WHERE ${where.join(' AND ')}`, values }
  }

  public async isMessageInDb (cardId: CardID, messageId: MessageID): Promise<boolean> {
    const sql = `
        SELECT 1
        FROM ${TableName.Message} m
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
                      FROM ${TableName.MessageCreated} mc
                      WHERE mc.workspace_id = $1::uuid
                        AND mc.card_id = $2::varchar
                        AND mc.message_id = $3::varchar
                      LIMIT 1`
    const result = await this.execute(select, [this.workspace, cardId, messageId])
    const created = result[0]?.created
    return created != null ? new Date(created) : undefined
  }
}
