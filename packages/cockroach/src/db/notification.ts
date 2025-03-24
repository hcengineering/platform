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
    type NotificationID
} from '@hcengineering/communication-types'

import { BaseDb } from './base'
import { type ContextDb, type NotificationDb, TableName } from './schema'
import { getCondition } from './utils'
import { toCollaborator, toNotification, toNotificationContext } from './mapping'

export class NotificationsDb extends BaseDb {
  async addCollaborators (card: CardID, collaborators: AccountID[], date?: Date): Promise<void> {
    if (collaborators.length === 0) return
    const values: any[] = []

    const sqlValues = collaborators
      .map((account, index) => {
        const i = index * 3
        values.push(this.workspace, card, account, date ?? new Date())
        return `($${i + 1}::uuid, $${i + 2}::varchar, $${i + 3}::uuid, $${i + 4}::timestamptz)`
      })
      .join(', ')

    const sql = `INSERT INTO ${TableName.Collaborators} (workspace_id, card_id, account, date) VALUES ${sqlValues} ON CONFLICT DO NOTHING`

    await this.execute(sql, values, 'insert collaborators')
  }

  async removeCollaborators (card: CardID, collaborators: AccountID[]): Promise<void> {
    if (collaborators.length === 0) return

    if (collaborators.length === 1) {
      const sql = `DELETE
                         FROM ${TableName.Collaborators}
                         WHERE workspace_id = $1::uuid
                           AND card_id = $2::varchar
                           AND account = $3::uuid`
      await this.execute(sql, [this.workspace, card, collaborators[0]], 'remove collaborator')
    } else {
      const inValues = collaborators.map((_, index) => `$${index + 3}`).join(', ')
      const sql = `DELETE
                         FROM ${TableName.Collaborators}
                         WHERE workspace_id = $1::uuid
                           AND card_id = $2::varchar
                           AND account IN (${inValues})`

      await this.execute(sql, [this.workspace, card, ...collaborators], 'remove collaborators')
    }
  }

  getCollaboratorsCursor (
    card: CardID,
    date: Date,
    size?: number
  ): AsyncIterable<NonNullable<Collaborator[][number]>[]> {
    const sql = `
            SELECT account
            FROM ${TableName.Collaborators}
            WHERE workspace_id = $1::uuid
              AND card_id = $2::varchar
              AND date <= $3::timestamptz
            ORDER BY date ASC `

    return this.client.cursor<Collaborator>(sql, [this.workspace, card, date], size)
  }

  async createNotification (context: ContextID, message: MessageID, created: Date): Promise<NotificationID> {
    const db: Omit<NotificationDb, 'id'> = {
      message_id: message,
      context_id: context,
      created
    }
    const sql = `INSERT INTO ${TableName.Notification} (message_id, context_id, created)
                     VALUES ($1::bigint, $2::int8, $3::timestamptz)
                     RETURNING id`
    const result = await this.execute(sql, [db.message_id, db.context_id, db.created], 'insert notification')
    return result[0].id as NotificationID
  }

  async removeNotifications (context: ContextID, account: AccountID, untilDate: Date): Promise<void> {
    const sql = `
      DELETE FROM ${TableName.Notification} n
        USING ${TableName.NotificationContext} nc
      WHERE n.context_id = $1::int8
        AND nc.id = n.context_id
        AND nc.account = $2::uuid
        AND n.created < $3::timestamptz
    `
    await this.execute(sql, [context, account, untilDate], 'remove notification')
  }

  async createContext (account: AccountID, card: CardID, lastUpdate: Date, lastView: Date): Promise<ContextID> {
    const db: ContextDb = {
      workspace_id: this.workspace,
      card_id: card,
      account,
      last_view: lastView,
      last_update: lastUpdate
    }
    const sql = `INSERT INTO ${TableName.NotificationContext} (workspace_id, card_id, account, last_view, last_update)
                     VALUES ($1::uuid, $2::varchar, $3::uuid, $4::timestamptz, $5::timestamptz)
                     RETURNING id`
    const result = await this.execute(
      sql,
      [db.workspace_id, db.card_id, db.account, db.last_view, db.last_update],
      'insert notification context'
    )
    return result[0].id as ContextID
  }

  async removeContext (context: ContextID, account: AccountID): Promise<void> {
    const sql = `DELETE
                     FROM ${TableName.Notification}
                     WHERE context = $1::int8 AND account = $2::uuid`
    await this.execute(sql, [context, account], 'remove notification context')
  }

  async updateContext (context: ContextID, account: AccountID, lastUpdate?: Date, lastView?: Date): Promise<void> {
    const dbData: Partial<ContextDb> = {}

    if (lastView != null) {
      dbData.last_view = lastView
    }
    if (lastUpdate != null) {
      dbData.last_update = lastUpdate
    }

    if (Object.keys(dbData).length === 0) {
      return
    }

    const keys = Object.keys(dbData)
    const values = Object.values(dbData)

    const sql = `UPDATE ${TableName.NotificationContext}
                     SET ${keys.map((k, idx) => `"${k}" = $${idx + 3}::timestamptz`).join(', ')}
                     WHERE id = $1::int8 AND account = $2::uuid;`

    await this.execute(sql, [context, account, ...values], 'update notification context')
  }

  async findContexts (params: FindNotificationContextParams): Promise<NotificationContext[]> {
    const withNotifications = params.notifications != null
    const withMessages = params.notifications?.message === true

    const { where, values, index } = this.buildContextWhere(params)
    const limit = params.limit != null ? `LIMIT ${Number(params.limit)}` : ''
    const orderBy =
      params.order != null ? `ORDER BY nc.last_update ${params.order === SortingOrder.Ascending ? 'ASC' : 'DESC'}` : ''

    let joinMessages = ''
    let buildObject = `
    JSONB_BUILD_OBJECT(
      'id', n.id,
      'created', n.created,
      'message_id', n.message_id
    )`

    if (withMessages) {
      joinMessages = `
      LEFT JOIN ${TableName.Message} m 
        ON n.message_id = m.id 
        AND nc.workspace_id = m.workspace_id 
        AND nc.card_id = m.card_id
      LEFT JOIN ${TableName.MessagesGroup} mg 
        ON nc.workspace_id = mg.workspace_id 
        AND nc.card_id = mg.card_id 
        AND n.created BETWEEN mg.from_sec AND mg.to_sec`

      buildObject = `
      JSONB_BUILD_OBJECT(
        'id', n.id,
        'created', n.created,
        'message_id', n.message_id,
        'message_type', m.type,
        'message_content', m.content,
        'message_data', m.data,
        'message_creator', m.creator,
        'message_created', m.created,
        'message_group_blob_id', mg.blob_id,
        'message_group_from_sec', mg.from_sec,
        'message_group_to_sec', mg.to_sec,
        'message_group_count', mg.count,
        'message_patches', (
          SELECT COALESCE(
            JSON_AGG(
              JSONB_BUILD_OBJECT(
                'patch_type', p.type,
                'patch_content', p.content,
                'patch_creator', p.creator,
                'patch_created', p.created
              ) ORDER BY p.created DESC
            ), 
            '[]'::JSONB
          ) 
          FROM ${TableName.Patch} p
          WHERE p.message_id = n.message_id
        )
      )`
    }

    let joinNotifications = ''
    let notificationsSelect = ''
    let groupBy = ''

    if (withNotifications) {
      const { where: whereNotifications, values: valuesNotifications } = this.buildNotificationWhere(
        { read: params.notifications?.read },
        index,
        true
      )

      values.push(...valuesNotifications)

      joinNotifications = `
      LEFT JOIN LATERAL (
        SELECT 
          n.*, 
          ROW_NUMBER() OVER (
            PARTITION BY n.context_id 
            ORDER BY n.created ${params.notifications?.order === SortingOrder.Ascending ? 'ASC' : 'DESC'}
          ) AS rn
        FROM ${TableName.Notification} n
        ${whereNotifications} ${whereNotifications.length > 1 ? 'AND n.context_id = nc.id' : 'WHERE n.context_id = nc.id'}
      ) n ON n.rn <= ${params.notifications?.limit ?? 1}`

      notificationsSelect = `,
      COALESCE(
        JSON_AGG(
          ${buildObject}
          ORDER BY n.created ${params.notifications?.order === SortingOrder.Ascending ? 'ASC' : 'DESC'}
        ), 
        '[]'::JSONB
      ) AS notifications`

      groupBy = 'GROUP BY nc.id'
    }

    const sql = `
      SELECT nc.id,
             nc.card_id,
             nc.account,
             nc.last_view,
             nc.last_update
               ${notificationsSelect}
      FROM ${TableName.NotificationContext} nc
        ${joinNotifications}
        ${joinMessages}
        ${where}
        ${groupBy}
        ${orderBy}
        ${limit};
    `

    const result = await this.execute(sql, values, 'find contexts')

    return result.map((it: any) => toNotificationContext(it))
  }

  async findNotifications (params: FindNotificationsParams): Promise<Notification[]> {
    const withMessage = params.message === true

    let select = 'SELECT  n.id, n.created,n.message_id, n.context_id, nc.last_view '

    let joinMessages = ''

    if (withMessage) {
      select += `,
      m.card_id AS card_id,
      m.type AS message_type,
      m.content AS message_content,
      m.creator AS message_creator,
      m.created AS message_created,
      m.data AS message_data,
      mg.blob_id AS message_group_blob_id,
      mg.from_sec AS message_group_from_sec,
      mg.to_sec AS message_group_to_sec,
      mg.count AS message_group_count,
      (SELECT json_agg(
        jsonb_build_object(
          'id', p.id,
          'content', p.content,
          'creator', p.creator,
          'created', p.created
        )
      )
      FROM ${TableName.Patch} p
      WHERE p.message_id = m.id) AS message_patches
    `

      joinMessages = `
      LEFT JOIN ${TableName.Message} m 
        ON n.message_id = m.id
        AND nc.workspace_id = m.workspace_id
        AND nc.card_id = m.card_id
      LEFT JOIN ${TableName.MessagesGroup} mg
        ON nc.workspace_id = mg.workspace_id
        AND nc.card_id = mg.card_id
        AND n.created BETWEEN mg.from_sec AND mg.to_sec
    `
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

  async findCollaborators (params: FindCollaboratorsParams): Promise<Collaborator[]> {
    const { where, values } = this.buildCollaboratorsWhere(params)
    const select = `
            SELECT c.account
            FROM ${TableName.Collaborators} c
        `

    const limit = params.limit != null ? ` LIMIT ${params.limit}` : ''
    const orderBy =
      params.order != null ? `ORDER BY c.date ${params.order === SortingOrder.Ascending ? 'ASC' : 'DESC'}` : ''

    const sql = [select, where, orderBy, limit].join(' ')
    const result = await this.execute(sql, values, 'find collaborators')

    return result.map((it: any) => toCollaborator(it))
  }

  private buildCollaboratorsWhere (params: FindCollaboratorsParams): { where: string, values: any[] } {
    const where: string[] = ['c.workspace_id = $1::uuid', 'c.card_id = $2::varchar']
    const values: any[] = [this.workspace, params.card]
    let index = values.length + 1

    if (params.account != null) {
      const accounts = Array.isArray(params.account) ? params.account : [params.account]
      if (accounts.length === 1) {
        where.push(`c.account = $${index++}::uuid`)
        values.push(accounts[0])
      } else if (accounts.length > 1) {
        where.push(`c.account = ANY($${index++}::uuid[])`)
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
      where.push(`nc.card_id = $${index++}::varchar`)
      values.push(params.card)
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

    const lastUpdateCondition = getCondition('nc', 'last_update', index, params.lastUpdate, 'timestamptz')

    if (lastUpdateCondition != null) {
      where.push(lastUpdateCondition.where)
      values.push(...lastUpdateCondition.values)
      index= lastUpdateCondition.index
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

    if (params.read === true) {
      where.push('nc.last_view IS NOT NULL AND nc.last_view >= n.created')
    }

    if (params.read === false) {
      where.push('(nc.last_view IS NULL OR nc.last_view < n.created)')
    }

    return { where: where.length > 0 ? `WHERE ${where.join(' AND ')}` : '', values }
  }
}
