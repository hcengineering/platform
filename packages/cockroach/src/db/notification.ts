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
  type AccountID,
  type CardID,
  type Collaborator,
  type ContextID,
  type FindCollaboratorsParams,
  type FindNotificationContextParams,
  type FindNotificationsParams,
  type MessageID,
  type Notification,
  type NotificationContext,
  SortingOrder,
  type NotificationID,
  type CardType,
  type NotificationType,
  type NotificationContent
} from '@hcengineering/communication-types'

import { BaseDb } from './base'
import { type CollaboratorDb, type ContextDb, type NotificationDb, TableName } from '../schema'
import { getCondition } from './utils'
import { toCollaborator, toNotification, toNotificationContext } from './mapping'
import type {
  NotificationContextUpdates,
  NotificationUpdates,
  UpdateNotificationQuery
} from '@hcengineering/communication-sdk-types'

export class NotificationsDb extends BaseDb {
  async addCollaborators (
    card: CardID,
    cardType: CardType,
    collaborators: AccountID[],
    date?: Date
  ): Promise<AccountID[]> {
    if (collaborators.length === 0) return []
    const values: any[] = []

    const sqlValues = collaborators
      .map((account, index) => {
        const i = index * 5
        values.push(this.workspace, card, account, date ?? new Date(), cardType)
        return `($${i + 1}::uuid, $${i + 2}::varchar, $${i + 3}::uuid, $${i + 4}::timestamptz, $${i + 5}::varchar)`
      })
      .join(', ')

    const sql = `INSERT INTO ${TableName.Collaborators} (workspace_id, card_id, account, date, card_type) VALUES ${sqlValues} ON CONFLICT DO NOTHING RETURNING account`

    const result = await this.execute(sql, values, 'insert collaborators')
    return result.map((it: any) => it.account)
  }

  async removeCollaborators (card: CardID, accounts: AccountID[], unsafe = false): Promise<void> {
    if (accounts.length === 0 && unsafe) {
      const sql = `DELETE FROM ${TableName.Collaborators} WHERE workspace_id = $1::uuid AND card_id = $2::varchar`
      await this.execute(sql, [this.workspace, card], 'remove collaborators')
    } else if (accounts.length === 1) {
      const sql = `DELETE
                         FROM ${TableName.Collaborators}
                         WHERE workspace_id = $1::uuid
                           AND card_id = $2::varchar
                           AND account = $3::uuid`
      await this.execute(sql, [this.workspace, card, accounts[0]], 'remove collaborator')
    } else {
      const inValues = accounts.map((_, index) => `$${index + 3}`).join(', ')
      const sql = `DELETE
                         FROM ${TableName.Collaborators}
                         WHERE workspace_id = $1::uuid
                           AND card_id = $2::varchar
                           AND account IN (${inValues})`

      await this.execute(sql, [this.workspace, card, accounts], 'remove collaborators')
    }
  }

  getCollaboratorsCursor (
    card: CardID,
    date: Date,
    size?: number
  ): AsyncIterable<NonNullable<Collaborator[][number]>[]> {
    const sql = `
            SELECT *
            FROM ${TableName.Collaborators}
            WHERE workspace_id = $1::uuid
              AND card_id = $2::varchar
              AND date <= $3::timestamptz
            ORDER BY date ASC `

    return this.client.cursor<Collaborator>(sql, [this.workspace, card, date], size)
  }

  async createNotification (
    context: ContextID,
    message: MessageID,
    messageCreated: Date,
    type: NotificationType,
    read: boolean,
    content: NotificationContent,
    created: Date
  ): Promise<NotificationID> {
    const db: Omit<NotificationDb, 'id'> = {
      type,
      message_id: message,
      message_created: messageCreated,
      read,
      context_id: context,
      created,
      content
    }
    const sql = `INSERT INTO ${TableName.Notification} (message_id, message_created, context_id, read, created, type, content)
                     VALUES ($1::varchar, $2::timestamptz, $3::int8, $4::boolean, $5::timestamptz, $6::varchar, $7::jsonb)
                     RETURNING id::text`
    const result = await this.execute(
      sql,
      [db.message_id, db.message_created, db.context_id, db.read, db.created, db.type, db.content],
      'insert notification'
    )
    return result[0].id as NotificationID
  }

  async updateNotification (
    contextId: ContextID,
    account: AccountID,
    query: UpdateNotificationQuery,
    updates: NotificationUpdates
  ): Promise<void> {
    const where: string[] = [
      'nc.workspace_id = $1::uuid',
      'nc.id = $2::int8',
      'nc.account = $3::uuid',
      'nc.id = n.context_id'
    ]
    const values: any[] = [this.workspace, contextId, account]
    let index = values.length + 1

    if (query.id != null) {
      where.push(`n.id = $${index++}::int8`)
      values.push(query.id)
    }

    if (query.type != null) {
      where.push(`n.type = $${index++}::varchar`)
      values.push(query.type)
    }

    if (query.untilDate != null) {
      const createdCondition = getCondition('n', 'created', index, { lessOrEqual: query.untilDate }, 'timestamptz')
      if (createdCondition != null) {
        where.push(createdCondition.where)
        values.push(...createdCondition.values)
        index = createdCondition.index
      }
    }

    const whereClause = `WHERE ${where.join(' AND ')}`

    const sql = `
        UPDATE ${TableName.Notification} n
        SET read = $${index++}::boolean
        FROM ${TableName.NotificationContext} nc ${whereClause}`

    await this.execute(sql, [...values, updates.read], 'update notification')
  }

  async removeNotifications (
    contextId: ContextID,
    account: AccountID,
    ids: NotificationID[]
  ): Promise<NotificationID[]> {
    if (ids.length === 0) return []
    const where: string[] = [
      'nc.workspace_id = $1::uuid',
      'nc.id = $2::int8',
      'nc.account = $3::uuid',
      'nc.id = n.context_id'
    ]
    const values: any[] = [this.workspace, contextId, account]
    let index = values.length + 1

    if (ids.length === 1) {
      where.push(`n.id = $${index++}::int8`)
      values.push(ids[0])
    } else {
      where.push(`n.id = ANY($${index++}::int8[])`)
      values.push(ids)
    }

    const sql = `DELETE FROM ${TableName.Notification} n
                USING ${TableName.NotificationContext} nc
                 WHERE ${where.join(' AND ')}
                 RETURNING n.id::text`

    const result = await this.execute(sql, values, 'remove notifications')

    return result.map((row: any) => row.id)
  }

  async createContext (
    account: AccountID,
    card: CardID,
    lastUpdate: Date,
    lastView: Date,
    lastNotify: Date
  ): Promise<ContextID> {
    const db: ContextDb = {
      workspace_id: this.workspace,
      card_id: card,
      account,
      last_view: lastView,
      last_update: lastUpdate,
      last_notify: lastNotify
    }
    const sql = `INSERT INTO ${TableName.NotificationContext} (workspace_id, card_id, account, last_view, last_update, last_notify)
                     VALUES ($1::uuid, $2::varchar, $3::uuid, $4::timestamptz, $5::timestamptz, $6::timestamptz)
                     RETURNING id::text`
    const result = await this.execute(
      sql,
      [db.workspace_id, db.card_id, db.account, db.last_view, db.last_update, db.last_notify ?? null],
      'insert notification context'
    )
    return result[0].id as ContextID
  }

  async removeContext (contextId: ContextID, account: AccountID): Promise<ContextID | undefined> {
    const sql = `DELETE
                 FROM ${TableName.NotificationContext}
                 WHERE workspace_id = $1::uuid
                   AND id = $2::int8
                   AND account = $3::uuid
                 RETURNING id::text`

    const result = await this.execute(sql, [this.workspace, contextId, account], 'remove notification context')

    return result[0]?.id as ContextID | undefined
  }

  async updateContext (context: ContextID, account: AccountID, updates: NotificationContextUpdates): Promise<void> {
    const dbData: Partial<ContextDb> = {}

    if (updates.lastView != null) {
      dbData.last_view = updates.lastView
    }
    if (updates.lastUpdate != null) {
      dbData.last_update = updates.lastUpdate
    }

    if (updates.lastNotify != null) {
      dbData.last_notify = updates.lastNotify
    }

    if (Object.keys(dbData).length === 0) {
      return
    }

    const keys = Object.keys(dbData)
    const values = Object.values(dbData)

    const sql = `UPDATE ${TableName.NotificationContext}
                     SET ${keys.map((k, idx) => `"${k}" = $${idx + 4}::timestamptz`).join(', ')}
                     WHERE workspace_id = $1::uuid AND id = $2::int8 AND account = $3::uuid;`

    await this.execute(sql, [this.workspace, context, account, ...values], 'update notification context')
  }

  async findContexts (params: FindNotificationContextParams): Promise<NotificationContext[]> {
    const withNotifications = params.notifications != null
    const withMessages = params.notifications?.message === true

    const { where, values } = this.buildContextWhere(params)
    const limit = params.limit != null ? `LIMIT ${Number(params.limit)}` : ''
    const orderBy =
      params.order != null ? `ORDER BY nc.last_notify ${params.order === SortingOrder.Ascending ? 'ASC' : 'DESC'}` : ''

    let notificationsJoin = ''
    let notificationsSelect = ''
    let groupBy = ''

    if (withNotifications) {
      const { where: whereNotifications, values: valuesNotifications } = this.buildNotificationWhere(
        { read: params.notifications?.read, type: params.notifications?.type },
        values.length,
        true
      )
      values.push(...valuesNotifications)

      const notificationLimit = params.notifications?.limit ?? 10
      const notificationOrder = params.notifications?.order === SortingOrder.Ascending ? 'ASC' : 'DESC'

      notificationsJoin = `
      LEFT JOIN LATERAL (
        SELECT *
        FROM ${TableName.Notification} n
        ${whereNotifications} ${whereNotifications.length > 1 ? 'AND' : 'WHERE'} n.context_id = nc.id
        ORDER BY n.created ${notificationOrder}
        LIMIT ${notificationLimit}
      ) n ON TRUE

      ${
        withMessages
          ? `
      LEFT JOIN ${TableName.Message} m 
        ON m.workspace_id = nc.workspace_id 
        AND m.card_id = nc.card_id
        AND m.id = n.message_id
        AND n.message_id IS NOT NULL
        AND n.blob_id IS NULL`
          : ''
      }

      LEFT JOIN LATERAL (
        SELECT COALESCE(
          JSON_AGG(
            JSONB_BUILD_OBJECT(
              'type', p.type,
              'data', p.data,
              'creator', p.creator,
              'created', p.created
            ) ORDER BY p.created DESC
          ), '[]'::JSONB
        ) AS patches
        FROM ${TableName.Patch} p
        WHERE p.workspace_id = nc.workspace_id AND p.card_id = nc.card_id AND p.message_id = n.message_id
      ) p ON TRUE

      LEFT JOIN LATERAL (
        SELECT COALESCE(
          JSON_AGG(
            JSONB_BUILD_OBJECT(
              'blob_id', f.blob_id,
              'type', f.type,
              'size', f.size,
              'filename', f.filename,
              'meta', f.meta,
              'creator', f.creator,
              'created', f.created
            ) ORDER BY f.created ASC
          ), '[]'::JSONB
        ) AS files
        FROM ${TableName.File} f
        WHERE f.workspace_id = nc.workspace_id AND f.card_id = nc.card_id AND f.message_id = n.message_id
      ) f ON TRUE
    `

      notificationsSelect = `,
      COALESCE(
        JSON_AGG(
          JSONB_BUILD_OBJECT(
            'id', n.id::text,
            'read', n.read,
            'type', n.type,
            'content', n.content,
            'created', n.created,
            'message_created', n.message_created,
            'message_id', n.message_id::text,
            ${
              withMessages
                ? `
            'message_type', m.type,
            'message_content', m.content,
            'message_data', m.data,
            'message_creator', m.creator,`
                : ''
            }
            'blob_id', n.blob_id,
            'patches', p.patches,
            'files', f.files
          )
          ORDER BY n.created ${notificationOrder}
        ), '[]'::JSONB
      ) AS notifications`

      groupBy = `
      GROUP BY nc.id, nc.card_id, nc.account, nc.last_view, nc.last_update, nc.last_notify
    `
    }

    const sql = `
        SELECT nc.id::text,
               nc.card_id,
               nc.account,
               nc.last_view,
               nc.last_update,
               nc.last_notify
                   ${notificationsSelect}
        FROM ${TableName.NotificationContext} nc
            ${notificationsJoin} ${where}
            ${groupBy}
            ${orderBy}
            ${limit};
    `

    const result = await this.execute(sql, values, 'find contexts')
    return result.map((it: any) => toNotificationContext(it))
  }

  async findNotifications (params: FindNotificationsParams): Promise<Notification[]> {
    const withMessage = params.message === true

    let select =
      'SELECT  n.id, n.created, n.read, n.message_id, n.message_created, n.type, n.content, n.context_id, nc.card_id, nc.account, nc.last_view '

    let joinMessages = ''

    if (withMessage) {
      select += `,
      m.type AS message_type,
      m.content AS message_content,
      m.creator AS message_creator,
      m.data AS message_data,
      (SELECT json_agg(
        jsonb_build_object(
          'type', p.type,
          'data', p.data,
          'creator', p.creator,
          'created', p.created
        )
      )
      FROM ${TableName.Patch} p
      WHERE p.workspace_id = m.workspace_id AND p.card_id = m.card_id AND p.message_id = m.id) AS message_patches,
      (SELECT json_agg(
        jsonb_build_object(
            'blob_id', f.blob_id,
            'type', f.type,
            'size', f.size,
            'filename', f.filename,
            'meta', f.meta,
            'creator', f.creator,
            'created', f.created
        )
      )
      FROM ${TableName.File} f
      WHERE f.workspace_id = m.workspace_id AND f.card_id = m.card_id AND f.message_id = m.id) AS message_files
    `
      joinMessages = `
      LEFT JOIN ${TableName.Message} m 
        ON nc.workspace_id = m.workspace_id
        AND nc.card_id = m.card_id
        AND n.message_id = m.id `
    }

    select += ` FROM ${TableName.Notification} n
    JOIN ${TableName.NotificationContext} nc  ON n.context_id = nc.id`

    const { where, values } = this.buildNotificationWhere(params)
    const orderBy =
      params.order != null ? `ORDER BY n.created ${params.order === SortingOrder.Ascending ? 'ASC' : 'DESC'}` : ''
    const limit = params.limit != null ? `LIMIT ${params.limit}` : ''

    const sql = [select, joinMessages, where, orderBy, limit].join(' ')

    const result = await this.execute(sql, values, 'find notifications')

    return result.map((it: any) => toNotification(it))
  }

  async updateCollaborators (params: FindCollaboratorsParams, data: Partial<Collaborator>): Promise<void> {
    const dbData: Partial<CollaboratorDb> = {
      account: data.account,
      card_id: data.cardId,
      card_type: data.cardType
    }

    const entries = Object.entries(dbData).filter(([_, value]) => value != null)
    if (entries.length === 0) return

    entries.unshift(['workspace_id', this.workspace])
    const setClauses = entries.map(([key], index) => `${key} = $${index + 1}`)
    const setValues = entries.map(([_, value]) => value)

    const { where, values: whereValues } = this.buildCollaboratorsWhere(params, setValues.length, '')

    const sql = `UPDATE ${TableName.Collaborators}
             SET ${setClauses.join(', ')}
             ${where}`

    await this.execute(sql, [...setValues, ...whereValues], 'update collaborators')
  }

  async findCollaborators (params: FindCollaboratorsParams): Promise<Collaborator[]> {
    const { where, values } = this.buildCollaboratorsWhere(params)
    const select = `
            SELECT *
            FROM ${TableName.Collaborators} c
        `

    const limit = params.limit != null ? ` LIMIT ${params.limit}` : ''
    const orderBy =
      params.order != null ? `ORDER BY c.date ${params.order === SortingOrder.Ascending ? 'ASC' : 'DESC'}` : ''

    const sql = [select, where, orderBy, limit].join(' ')
    const result = await this.execute(sql, values, 'find collaborators')

    return result.map((it: any) => toCollaborator(it))
  }

  private buildCollaboratorsWhere (
    params: FindCollaboratorsParams,
    startIndex: number = 0,
    prefix: string = 'c.'
  ): { where: string, values: any[] } {
    const where: string[] = []
    const values: any[] = []
    let index = startIndex + 1

    where.push(`${prefix}workspace_id = $${index++}::uuid`)
    values.push(this.workspace)
    where.push(`${prefix}card_id = $${index++}::varchar`)
    values.push(params.card)

    if (params.account != null) {
      const accounts = Array.isArray(params.account) ? params.account : [params.account]
      if (accounts.length === 1) {
        where.push(`${prefix}account = $${index++}::uuid`)
        values.push(accounts[0])
      } else if (accounts.length > 1) {
        where.push(`${prefix}account = ANY($${index++}::uuid[])`)
        values.push(accounts)
      }
    }

    return { where: `WHERE ${where.join(' AND ')}`, values }
  }

  private buildContextWhere (params: FindNotificationContextParams): {
    where: string
    values: any[]
    index: number
  } {
    const where: string[] = ['nc.workspace_id = $1::uuid']
    const values: any[] = [this.workspace]
    let index = 2

    if (params.id != null) {
      where.push(`nc.id = $${index++}::int8`)
      values.push(params.id)
    }

    if (params.card != null) {
      const cards = Array.isArray(params.card) ? params.card : [params.card]
      if (cards.length === 1) {
        where.push(`nc.card_id = $${index++}::varchar`)
        values.push(cards[0])
      } else {
        where.push(`nc.card_id = ANY($${index++}::varchar[])`)
        values.push(cards)
      }
    }

    if (params.account != null) {
      const accounts = Array.isArray(params.account) ? params.account : [params.account]
      if (accounts.length === 1) {
        where.push(`nc.account = $${index++}::uuid`)
        values.push(accounts[0])
      } else if (accounts.length > 1) {
        where.push(`nc.account IN (${accounts.map((it) => `$${index++}::uuid`).join(', ')})`)
        values.push(...accounts)
      }
    }

    const lastUpdateCondition = getCondition('nc', 'last_notify', index, params.lastNotify, 'timestamptz')

    if (lastUpdateCondition != null) {
      where.push(lastUpdateCondition.where)
      values.push(...lastUpdateCondition.values)
      index = lastUpdateCondition.index
    }

    return { where: `WHERE ${where.join(' AND ')}`, values, index }
  }

  private buildNotificationWhere (
    params: FindNotificationsParams,
    initialIndex?: number,
    skipWorkspace?: boolean
  ): {
      where: string
      values: any[]
    } {
    const where: string[] = skipWorkspace === true ? [] : ['nc.workspace_id = $1::uuid']
    const values: any[] = skipWorkspace === true ? [] : [this.workspace]
    let index = (initialIndex ?? 0) + values.length + 1

    if (params.context != null) {
      where.push(`n.context_id = $${index++}::int8`)
      values.push(params.context)
    }

    if (params.account != null) {
      const accounts = Array.isArray(params.account) ? params.account : [params.account]
      if (accounts.length === 1) {
        where.push(`nc.account = $${index++}::uuid`)
        values.push(accounts[0])
      } else if (accounts.length > 1) {
        where.push(`nc.account = ANY ($${index++}::uuid[])`)
        values.push(accounts)
      }
    }

    if (params.card != null) {
      where.push(`nc.card_id = $${index++}::varchar`)
      values.push(params.card)
    }

    if (params.messageId != null) {
      where.push(`n.message_id = $${index++}::varchar`)
      values.push(params.messageId)
    }

    if (params.type != null) {
      where.push(`n.type = $${index++}::varchar`)
      values.push(params.type)
    }

    const createdCondition = getCondition('n', 'created', index, params.created, 'timestamptz')
    if (createdCondition != null) {
      where.push(createdCondition.where)
      values.push(...createdCondition.values)
      index = createdCondition.index
    }

    if (params.read === true) {
      where.push('n.read = true')
    }

    if (params.read === false) {
      where.push('n.read = false')
    }

    return { where: where.length > 0 ? `WHERE ${where.join(' AND ')}` : '', values }
  }

  public async updateNotificationsBlobId (cardId: CardID, blobId: string, from: Date, to: Date): Promise<void> {
    const sql = `
        UPDATE ${TableName.Notification} AS n
        SET blob_id = $3::uuid
        FROM ${TableName.NotificationContext} AS nc
        WHERE
            n.context_id = nc.id
          AND nc.workspace_id = $1::uuid
          AND nc.card_id      = $2::uuid
          AND n.message_created BETWEEN $4::timestamptz AND $5::timestamptz
          AND n.blob_id IS NULL
    `
    await this.execute(sql, [this.workspace, cardId, blobId, from, to])
  }

  public async removeNotificationsBlobId (cardId: CardID, blobId: string): Promise<void> {
    const sql = `
        UPDATE ${TableName.Notification} AS n
        SET blob_id = NULL
        FROM ${TableName.NotificationContext} AS nc
        WHERE
            n.context_id    = nc.id
          AND nc.workspace_id = $1::uuid
          AND nc.card_id      = $2::uuid
          AND n.blob_id       = $3::uuid;
    `
    await this.execute(sql, [this.workspace, cardId, blobId])
  }
}
