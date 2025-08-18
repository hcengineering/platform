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
  type NotificationContent,
  WithTotal
} from '@hcengineering/communication-types'
import { withTotal } from '@hcengineering/communication-shared'
import {
  Domain,
  type NotificationContextUpdates,
  type NotificationUpdates,
  type UpdateNotificationQuery
} from '@hcengineering/communication-sdk-types'

import { BaseDb } from './base'
import { getCondition } from './utils'
import { toCollaborator, toNotification, toNotificationContext } from './mapping'
import { DbModel, DbModelFilter, DbModelUpdate } from '../schema'

export class NotificationsDb extends BaseDb {
  async addCollaborators (
    card: CardID,
    cardType: CardType,
    collaborators: AccountID[],
    date: Date
  ): Promise<AccountID[]> {
    if (collaborators.length === 0) return []
    const models: DbModel<Domain.Collaborator>[] = collaborators.map((account, index) => ({
      workspace_id: this.workspace,
      card_id: card,
      account,
      date,
      card_type: cardType
    }))
    const { sql, values } = this.getBatchInsertSql(Domain.Collaborator, models, [{ column: 'account', cast: 'text' }], {
      conflictColumns: ['workspace_id', 'card_id', 'account'],
      conflictAction: 'DO NOTHING'
    })

    const result = await this.execute(sql, values, 'insert collaborators')
    return result.map((it: any) => it.account)
  }

  async removeCollaborators (card: CardID, accounts: AccountID[], unsafe = false): Promise<void> {
    if (accounts.length === 0 && unsafe) {
      const sql = `DELETE FROM ${Domain.Collaborator} WHERE workspace_id = $1::uuid AND card_id = $2::varchar`
      await this.execute(sql, [this.workspace, card], 'remove collaborators')
    } else {
      const { sql, values } = this.getDeleteSql(Domain.Collaborator, [
        { column: 'workspace_id', value: this.workspace },
        { column: 'card_id', value: card },
        { column: 'account', value: accounts }
      ])
      await this.execute(sql, values, 'remove collaborator')
    }
  }

  getCollaboratorsCursor (
    card: CardID,
    date: Date,
    size?: number
  ): AsyncIterable<NonNullable<Collaborator[][number]>[]> {
    const sql = `
            SELECT *
            FROM ${Domain.Collaborator}
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
    const db: Omit<DbModel<Domain.Notification>, 'id'> = {
      context_id: context,
      type,
      message_id: message,
      message_created: messageCreated,
      read,
      created,
      content
    }
    const { sql, values } = this.getInsertSql(Domain.Notification, db as DbModel<Domain.Notification>, [
      { column: 'id', cast: 'text' }
    ])
    const result = await this.execute(sql, values, 'insert notification')
    return result[0].id as NotificationID
  }

  async updateNotification (
    contextId: ContextID,
    account: AccountID,
    query: UpdateNotificationQuery,
    updates: NotificationUpdates
  ): Promise<number> {
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

    const whereClause = `WHERE ${where.join(' AND ')} AND read <>${index}::boolean`

    const sql = `
        UPDATE ${Domain.Notification} n
        SET read = $${index}::boolean
        FROM ${Domain.NotificationContext} nc 
        ${whereClause}
        `

    const result = await this.execute(sql, [...values, updates.read], 'update notification')
    return result?.count ?? 0
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

    const sql = `DELETE FROM ${Domain.Notification} n
                USING ${Domain.NotificationContext} nc
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
    const db: Omit<DbModel<Domain.NotificationContext>, 'id'> = {
      workspace_id: this.workspace,
      card_id: card,
      account,
      last_view: lastView,
      last_update: lastUpdate,
      last_notify: lastNotify
    }
    const { sql, values } = this.getInsertSql(Domain.NotificationContext, db as DbModel<Domain.NotificationContext>, [
      { column: 'id', cast: 'text' }
    ])

    const result = await this.execute(sql, values, 'insert notification context')
    return result[0].id as ContextID
  }

  async removeContext (contextId: ContextID, account: AccountID): Promise<ContextID | undefined> {
    const sql = `DELETE
                 FROM ${Domain.NotificationContext}
                 WHERE workspace_id = $1::uuid
                   AND id = $2::int8
                   AND account = $3::uuid
                 RETURNING id::text`

    const result = await this.execute(sql, [this.workspace, contextId, account], 'remove notification context')

    return result[0]?.id as ContextID | undefined
  }

  async updateContext (context: ContextID, account: AccountID, updates: NotificationContextUpdates): Promise<void> {
    const update: DbModelUpdate<Domain.NotificationContext> = []

    if (updates.lastView != null) {
      update.push({
        column: 'last_view',
        value: updates.lastView
      })
    }
    if (updates.lastUpdate != null) {
      update.push({
        column: 'last_update',
        value: updates.lastUpdate
      })
    }
    if (updates.lastNotify != null) {
      update.push({
        column: 'last_notify',
        value: updates.lastNotify
      })
    }

    if (update.length === 0) return

    const filter: DbModelFilter<Domain.NotificationContext> = [
      {
        column: 'workspace_id',
        value: this.workspace
      },
      {
        column: 'id',
        value: context
      },
      {
        column: 'account',
        value: account
      }
    ]

    const { sql, values } = this.getUpdateSql(Domain.NotificationContext, filter, update)

    await this.execute(sql, values, 'update notification context')
  }

  async findContexts (params: FindNotificationContextParams): Promise<NotificationContext[]> {
    const withNotification = params.notifications != null
    const withMessage = params.notifications?.message === true
    const withTotal = params.notifications?.total === true
    const notificationsLimit = params.notifications?.limit
    const notificationOrder = params.notifications?.order === SortingOrder.Ascending ? 'ASC' : 'DESC'

    const { where, values } = this.buildContextWhere(params)
    const orderBy =
      params.order != null ? `ORDER BY nc.last_notify ${params.order === SortingOrder.Ascending ? 'ASC' : 'DESC'}` : ''
    const limit = params.limit != null ? `LIMIT ${Number(params.limit)}` : ''

    if (!withNotification) {
      const sql = `
      SELECT nc.id::text,
             nc.card_id,
             nc.account,
             nc.last_view,
             nc.last_update,
             nc.last_notify
      FROM ${Domain.NotificationContext} nc
      ${where}
      ${orderBy}
      ${limit};
    `
      const rows = await this.execute(sql, values, 'find contexts (no notifications)')
      return rows.map((it: any) => toNotificationContext(it))
    }

    const { where: notificationWhere, values: notificationValues } = this.buildNotificationWhere(
      { read: params.notifications?.read, type: params.notifications?.type },
      values.length,
      true
    )
    values.push(...notificationValues)

    const contextsCte = `
    WITH ctx AS (
      SELECT id, card_id, account, last_view, last_update, last_notify, workspace_id
      FROM ${Domain.NotificationContext} nc
      ${where}
      ${orderBy}
      ${limit}
    )
  `

    const notificationsCte = `
  , last_notifs AS (
      SELECT *
      FROM (
        SELECT n.*,
               ROW_NUMBER() OVER (PARTITION BY n.context_id ORDER BY n.created ${notificationOrder}) AS rn
        FROM ${Domain.Notification} n
        WHERE n.context_id IN (SELECT id FROM ctx)
          ${notificationWhere.length > 0 ? `AND (${notificationWhere.replace(/^WHERE/i, '')})` : ''}
      ) t
      WHERE rn <= ${notificationsLimit}
    )
  `

    const msgKeysCte = `
  , message_keys AS (
      SELECT DISTINCT
             c.workspace_id,
             c.card_id,
             n.message_id
      FROM last_notifs n
      JOIN ctx c ON c.id = n.context_id
      WHERE n.message_id IS NOT NULL
    )
  `

    const statsCte = withTotal
      ? `
  , stats AS (
      SELECT context_id, COUNT(*) AS total
      FROM ${Domain.Notification} n
      WHERE n.context_id IN (SELECT id FROM ctx)
        ${notificationWhere.length > 0 ? `AND (${notificationWhere.replace(/^WHERE/i, '')})` : ''}
      GROUP BY context_id
    )`
      : ''

    const patchesCte = `
  , patches_json AS (
      SELECT
        p.workspace_id,
        p.card_id,
        p.message_id,
        COALESCE(
          JSON_AGG(
            JSONB_BUILD_OBJECT(
              'type',    p.type,
              'data',    p.data,
              'creator', p.creator,
              'created', p.created
            )
          ), '[]'::jsonb
        ) AS patches
      FROM ${Domain.Patch} p
      JOIN message_keys mk
        ON mk.workspace_id = p.workspace_id
       AND mk.card_id      = p.card_id
       AND mk.message_id   = p.message_id
      GROUP BY p.workspace_id, p.card_id, p.message_id
    )
  `

    const attachCte = `
  , attachments_json AS (
      SELECT
        a.workspace_id,
        a.card_id,
        a.message_id,
        COALESCE(
          JSON_AGG(
            JSONB_BUILD_OBJECT(
               'id',      a.id,
                'type',    a.type,
                'params',  a.params,
                'creator', a.creator,
                'created', a.created,
                'modified',a.modified
            )
          ), '[]'::jsonb
        ) AS attachments
      FROM ${Domain.Attachment} a
      JOIN message_keys mk
        ON mk.workspace_id = a.workspace_id
       AND mk.card_id      = a.card_id
       AND mk.message_id   = a.message_id
      GROUP BY a.workspace_id, a.card_id, a.message_id
    )
  `

    const msgJoin = withMessage
      ? `
    LEFT JOIN ${Domain.Message} m
           ON  m.workspace_id = nc.workspace_id
           AND m.card_id      = nc.card_id
           AND m.id           = n.message_id
           AND n.message_id IS NOT NULL
           AND n.blob_id   IS NULL`
      : ''

    const sql = `
    ${contextsCte}
    ${notificationsCte}
    ${msgKeysCte}
    ${statsCte}
    ${patchesCte}
    ${attachCte}
    SELECT
      nc.id::text,
      nc.card_id,
      nc.account,
      nc.last_view,
      nc.last_update,
      ${withTotal ? ' MAX(s.total) AS total,' : ''}
      nc.last_notify,
      COALESCE(
        JSON_AGG(
          JSONB_BUILD_OBJECT(
            'id',               n.id::text,
            'read',             n.read,
            'type',             n.type,
            'content',          n.content,
            'created',          n.created,
            'blob_id',          n.blob_id,
            'message_created',  n.message_created,
            'message_id',       n.message_id::text,
            ${
              withMessage
                ? `
            'message_type',     m.type,
            'message_content',  m.content,
            'message_data',     m.data,
            'message_creator',  m.creator,`
                : ''
            }
            'message_patches',          pj.patches,
            'message_attachments',      aj.attachments
          )
          ORDER BY n.created ${notificationOrder}
        ), '[]'::jsonb
      ) AS notifications
    FROM ctx nc
    ${withTotal ? 'LEFT JOIN stats s ON s.context_id = nc.id' : ''}
    LEFT JOIN last_notifs n
           ON n.context_id = nc.id
    ${msgJoin}
    LEFT JOIN patches_json    pj
           ON pj.workspace_id = nc.workspace_id
          AND pj.card_id      = nc.card_id
          AND pj.message_id   = n.message_id
    LEFT JOIN attachments_json aj
           ON aj.workspace_id = nc.workspace_id
          AND aj.card_id      = nc.card_id
          AND aj.message_id   = n.message_id
    GROUP BY
      nc.id, nc.card_id, nc.account, nc.last_view, nc.last_update, nc.last_notify
    ${orderBy}
  `.trim()

    const rows = await this.execute(sql, values, 'find contexts (cte)')
    return rows.map((it: any) => toNotificationContext(it))
  }

  async findNotifications (params: FindNotificationsParams): Promise<WithTotal<Notification>> {
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
      FROM ${Domain.Patch} p
      WHERE p.workspace_id = m.workspace_id AND p.card_id = m.card_id AND p.message_id = m.id) AS message_patches,
      (SELECT json_agg(
        jsonb_build_object(
            'id', a.id,
            'type', a.type,
            'params', a.params,
            'creator', a.creator,
            'created', a.created,
            'modified', a.modified
        )
      )
      FROM ${Domain.Attachment} a
      WHERE a.workspace_id = m.workspace_id AND a.card_id = m.card_id AND a.message_id = m.id) AS message_attachments
    `
      joinMessages = `
      LEFT JOIN ${Domain.Message} m 
        ON nc.workspace_id = m.workspace_id
        AND nc.card_id = m.card_id
        AND n.message_id = m.id `
    }

    select += ` FROM ${Domain.Notification} n
    JOIN ${Domain.NotificationContext} nc  ON n.context_id = nc.id`

    const { where, values } = this.buildNotificationWhere(params)
    const orderBy =
      params.order != null ? `ORDER BY n.created ${params.order === SortingOrder.Ascending ? 'ASC' : 'DESC'}` : ''
    const limit = params.limit != null ? `LIMIT ${params.limit}` : ''

    const sql = [select, joinMessages, where, orderBy, limit].join(' ')

    const result = await this.execute(sql, values, 'find notifications')

    let total: number | undefined

    if (params.total === true) {
      const totalSql = this.buildNotificationsTotalSql(params)
      const result = await this.execute(totalSql.sql, totalSql.values, 'find notifications total')
      total = result[0]?.total != null ? Number(result[0]?.total ?? 0) : undefined
    }

    return withTotal(
      result.map((it: any) => toNotification(it)),
      total
    )
  }

  private buildNotificationsTotalSql (params: FindNotificationsParams): { sql: string, values: any[] } {
    const select = `
        SELECT COUNT(*) AS total
        FROM ${Domain.Notification} n
                 JOIN ${Domain.NotificationContext} nc ON n.context_id = nc.id`

    const { where, values } = this.buildNotificationWhere(params)

    const sql = [select, where].join(' ')

    return { sql, values }
  }

  async updateCollaborators (params: FindCollaboratorsParams, data: Partial<Collaborator>): Promise<void> {
    const update: Partial<DbModel<Domain.Collaborator>> = {
      account: data.account,
      card_id: data.cardId,
      card_type: data.cardType
    }

    const entries = Object.entries(update).filter(([_, value]) => value != null)
    if (entries.length === 0) return

    entries.unshift(['workspace_id', this.workspace])
    const setClauses = entries.map(([key], index) => `${key} = $${index + 1}`)
    const setValues = entries.map(([_, value]) => value)

    const { where, values: whereValues } = this.buildCollaboratorsWhere(params, setValues.length, '')

    const sql = `UPDATE ${Domain.Collaborator}
             SET ${setClauses.join(', ')}
             ${where}`

    await this.execute(sql, [...setValues, ...whereValues], 'update collaborators')
  }

  async findCollaborators (params: FindCollaboratorsParams): Promise<Collaborator[]> {
    const { where, values } = this.buildCollaboratorsWhere(params)
    const select = `
            SELECT *
            FROM ${Domain.Collaborator} c
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
        UPDATE ${Domain.Notification} AS n
        SET blob_id = $3::uuid
        FROM ${Domain.NotificationContext} AS nc
        WHERE
            n.context_id = nc.id
          AND nc.workspace_id = $1::uuid
          AND nc.card_id      = $2::varchar
          AND n.message_created BETWEEN $4::timestamptz AND $5::timestamptz
          AND n.blob_id IS NULL
    `
    await this.execute(sql, [this.workspace, cardId, blobId, from, to])
  }

  public async removeNotificationsBlobId (cardId: CardID, blobId: string): Promise<void> {
    const sql = `
        UPDATE ${Domain.Notification} AS n
        SET blob_id = NULL
        FROM ${Domain.NotificationContext} AS nc
        WHERE
            n.context_id    = nc.id
          AND nc.workspace_id = $1::uuid
          AND nc.card_id      = $2::varchar
          AND n.blob_id       = $3::uuid;
    `
    await this.execute(sql, [this.workspace, cardId, blobId])
  }
}
