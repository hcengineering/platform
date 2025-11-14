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
  type AccountUuid,
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
  WithTotal,
  BlobID,
  SocialID
} from '@hcengineering/communication-types'
import { withTotal } from '@hcengineering/communication-shared'
import {
  CollaboratorQuery,
  CollaboratorUpdate,
  Domain,
  NotificationContextQuery,
  NotificationContextUpdate,
  NotificationQuery,
  NotificationUpdate
} from '@hcengineering/communication-sdk-types'

import { BaseDb } from './base'
import { getCondition } from './utils'
import { toCollaborator, toNotification, toNotificationContext } from './mapping'
import { DbModel, DbModelFilter, DbModelUpdate } from '../schema'

export class NotificationsDb extends BaseDb {
  async addCollaborators (
    card: CardID,
    cardType: CardType,
    collaborators: AccountUuid[],
    date: Date
  ): Promise<AccountUuid[]> {
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

  async removeCollaborators (query: CollaboratorQuery): Promise<void> {
    if (query.cardId == null) return

    const filter: DbModelFilter<Domain.Collaborator> = [
      { column: 'workspace_id', value: this.workspace },
      { column: 'card_id', value: query.cardId }
    ]
    if (query.account != null) {
      filter.push({ column: 'account', value: query.account ?? [] })
    }
    const { sql, values } = this.getDeleteSql(Domain.Collaborator, filter)

    await this.execute(sql, values, 'remove collaborator')
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
    contextId: ContextID,
    messageId: MessageID,
    blobId: BlobID,
    type: NotificationType,
    read: boolean,
    content: NotificationContent,
    creator: SocialID,
    created: Date
  ): Promise<NotificationID> {
    const db: Omit<DbModel<Domain.Notification>, 'id'> = {
      context_id: contextId,
      type,
      message_id: messageId,
      blob_id: blobId,
      read,
      created,
      content,
      creator
    }
    const { sql, values } = this.getInsertSql(Domain.Notification, db as DbModel<Domain.Notification>, [
      { column: 'id', cast: 'text' }
    ])
    const result = await this.execute(sql, values, 'insert notification')
    return result[0].id as NotificationID
  }

  async updateNotification (query: NotificationQuery, update: NotificationUpdate): Promise<number> {
    const where: string[] = [
      'nc.workspace_id = $1::uuid',
      'nc.id = $2::int8',
      'nc.account = $3::uuid',
      'nc.id = n.context_id'
    ]
    const values: any[] = [this.workspace]
    let index = values.length + 1

    if (query.contextId != null) {
      where.push(`n.context_id = $${index++}::int8`)
      values.push(query.contextId)
    }

    if (query.account != null) {
      where.push(`nc.account = $${index++}::uuid`)
      values.push(query.account)
    }
    if (query.id != null) {
      if (Array.isArray(query.id)) {
        if (query.id.length === 1) {
          where.push(`n.id = $${index++}::int8`)
          values.push(query.id[0])
        } else {
          where.push(`n.id = ANY($${index++}::int8[])`)
          values.push(query.id)
        }
      } else {
        where.push(`n.id = $${index++}::int8`)
        values.push(query.id)
      }
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

    const result = await this.execute(sql, [...values, update.read], 'update notification')
    return result?.count ?? 0
  }

  async removeNotifications (query: NotificationQuery): Promise<NotificationID[]> {
    const ids = query.id == null || Array.isArray(query.id) ? query.id : [query.id]

    const where: string[] = ['nc.workspace_id = $1::uuid']
    const values: any[] = [this.workspace]
    let index = values.length + 1

    if (query.contextId != null) {
      where.push(`n.context_id = $${index++}::int8`)
      values.push(query.contextId)
    }
    if (query.account != null) {
      where.push(`nc.account = $${index++}::uuid`)
      values.push(query.account)
    }
    if (query.type != null) {
      where.push(`n.type = $${index++}::varchar`)
      values.push(query.type)
    }
    if (ids != null && ids.length > 0) {
      if (ids.length === 1) {
        where.push(`n.id = $${index++}::int8`)
        values.push(ids[0])
      } else {
        where.push(`n.id = ANY($${index++}::int8[])`)
        values.push(ids)
      }
    }

    if (values.length <= 1) return []

    const sql = `DELETE FROM ${Domain.Notification} n
                USING ${Domain.NotificationContext} nc
                 WHERE ${where.join(' AND ')}
                 RETURNING n.id::text`

    const result = await this.execute(sql, values, 'remove notifications')

    return result.map((row: any) => row.id)
  }

  async createContext (
    account: AccountUuid,
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

  async removeContext (query: NotificationContextQuery): Promise<ContextID | undefined> {
    const sql = `DELETE
                 FROM ${Domain.NotificationContext}
                 WHERE workspace_id = $1::uuid
                   AND id = $2::int8
                   AND account = $3::uuid
                 RETURNING id::text`

    const result = await this.execute(sql, [this.workspace, query.id, query.account], 'remove notification context')

    return result[0]?.id as ContextID | undefined
  }

  async updateContext (query: NotificationContextQuery, update: NotificationContextUpdate): Promise<void> {
    const dbUpdate: DbModelUpdate<Domain.NotificationContext> = []

    if (update.lastView != null) {
      dbUpdate.push({
        column: 'last_view',
        value: update.lastView
      })
    }
    if (update.lastUpdate != null) {
      dbUpdate.push({
        column: 'last_update',
        value: update.lastUpdate
      })
    }
    if (update.lastNotify != null) {
      dbUpdate.push({
        column: 'last_notify',
        value: update.lastNotify
      })
    }

    if (dbUpdate.length === 0) return

    const filter: DbModelFilter<Domain.NotificationContext> = [
      {
        column: 'workspace_id',
        value: this.workspace
      }
    ]

    if (query.id != null) {
      filter.push({ column: 'id', value: query.id })
    }
    if (query.account != null) {
      filter.push({ column: 'account', value: query.account })
    }

    const { sql, values } = this.getUpdateSql(Domain.NotificationContext, filter, dbUpdate)

    await this.execute(sql, values, 'update notification context')
  }

  async findContexts (params: FindNotificationContextParams): Promise<NotificationContext[]> {
    const withNotification = params.notifications != null
    const withTotal = params.notifications?.total === true
    const notificationsLimit = params.notifications?.limit
    const notificationOrder = params.notifications?.order === SortingOrder.Ascending ? 'ASC' : 'DESC'

    const { where, values } = this.buildContextWhere(params)
    const orderBy = this.buildOrderBy(params.order, 'nc.last_notify')
    const limit = this.buildLimit(params.limit)

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

    const sql = `
    ${contextsCte}
    ${notificationsCte}
    ${msgKeysCte}
    ${statsCte}
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
            'message_id',       n.message_id::text,
            'creator',          n.creator
          )
          ORDER BY n.created ${notificationOrder}
        ), '[]'::jsonb
      ) AS notifications
    FROM ctx nc
    ${withTotal ? 'LEFT JOIN stats s ON s.context_id = nc.id' : ''}
    LEFT JOIN last_notifs n
           ON n.context_id = nc.id
    GROUP BY
      nc.id, nc.card_id, nc.account, nc.last_view, nc.last_update, nc.last_notify
    ${orderBy}
  `.trim()

    const rows = await this.execute(sql, values, 'find contexts (cte)')
    return rows.map((it: any) => toNotificationContext(it))
  }

  async findNotifications (params: FindNotificationsParams): Promise<WithTotal<Notification>> {
    let select =
      'SELECT  n.id, n.created, n.read, n.message_id, n.blob_id, n.type, n.content, n.context_id, n.creator, nc.card_id, nc.account, nc.last_view '

    select += ` FROM ${Domain.Notification} n
    JOIN ${Domain.NotificationContext} nc  ON n.context_id = nc.id`

    const { where, values } = this.buildNotificationWhere(params)
    const orderBy = this.buildOrderBy(params.order, 'n.created')
    const limit = this.buildLimit(params.limit)

    const sql = [select, where, orderBy, limit].join(' ')

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

  async updateCollaborators (query: CollaboratorQuery, update: CollaboratorUpdate): Promise<void> {
    const dbUpdate: Partial<DbModel<Domain.Collaborator>> = {
      account: update.account,
      card_id: update.cardId,
      card_type: update.cardType
    }

    const entries = Object.entries(dbUpdate).filter(([_, value]) => value != null)
    if (entries.length === 0) return

    entries.unshift(['workspace_id', this.workspace])
    const setClauses = entries.map(([key], index) => `${key} = $${index + 1}`)
    const setValues = entries.map(([_, value]) => value)

    const { where, values: whereValues } = this.buildCollaboratorsWhere(query, setValues.length, '')

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
    values.push(params.cardId)

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

    if (params.cardId != null) {
      const cards = Array.isArray(params.cardId) ? params.cardId : [params.cardId]
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

    if (params.contextId != null) {
      where.push(`n.context_id = $${index++}::int8`)
      values.push(params.contextId)
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

    if (params.cardId != null) {
      where.push(`nc.card_id = $${index++}::varchar`)
      values.push(params.cardId)
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
}
