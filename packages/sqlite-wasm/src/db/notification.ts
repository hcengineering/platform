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
    type MessageID,
    type ContextID,
    type CardID,
    type NotificationContext,
    type FindNotificationContextParams, SortingOrder,
    type FindNotificationsParams, type Notification,
    type NotificationContextUpdate
} from '@hcengineering/communication-types'

import {BaseDb} from './base.ts'
import {TableName, type ContextDb, type NotificationDb} from './types.ts'

export class NotificationsDb extends BaseDb {
    async createNotification(message: MessageID, context: ContextID): Promise<void> {
        const dbData: NotificationDb = {
            message_id: message,
            context_id: context
        }
        await this.insert(TableName.Notification, dbData)
    }

    async removeNotification(message: MessageID, context: ContextID): Promise<void> {
        await this.remove(TableName.Notification, {
            message_id: message,
            context
        })
    }

    async createContext(workspace: string, card: CardID, personalWorkspace: string, lastView?: Date, lastUpdate?: Date): Promise<ContextID> {
        const dbData: ContextDb = {
            id: self.crypto.randomUUID(),
            workspace_id: workspace,
            card_id: card,
            personal_workspace: personalWorkspace,
            last_view: lastView,
            last_update: lastUpdate
        }
        await this.insert(TableName.NotificationContext, dbData)
        return dbData.id as ContextID
    }

    async removeContext(context: ContextID): Promise<void> {
        await this.remove(TableName.NotificationContext, {
            id: context
        })
    }

    async updateContext(context: ContextID, update: NotificationContextUpdate): Promise<void> {
        const dbData: Partial<ContextDb> = {}

        if (update.archivedFrom != null) {
            dbData.archived_from = update.archivedFrom
        }
        if (update.lastView != null) {
            dbData.last_view = update.lastView
        }
        if (update.lastUpdate != null) {
            dbData.last_update = update.lastUpdate
        }

        if (Object.keys(dbData).length === 0) {
            return
        }

        const keys = Object.keys(dbData)
        const values = Object.values(dbData)

        const sql = `
            UPDATE ${TableName.NotificationContext}
            SET ${keys.map((k, idx) => `"${k}" = '${values[idx]}'`).join(', ')}
            WHERE id = '${context}'
        `;

        await this.worker('exec', {
            dbId: this.dbId,
            sql
        });
    }

    async findContexts(params: FindNotificationContextParams, personalWorkspaces: string[], workspace?: string,): Promise<NotificationContext[]> {
        const select = `
            SELECT nc.id,
                   nc.card_id,
                   nc.archived_from,
                   nc.last_view,
                   nc.last_update,
                   nc.workspace_id,
                   nc.personal_workspace
            FROM ${TableName.NotificationContext} nc`;
        const where = this.buildContextWhere(params, personalWorkspaces, workspace);
        // const orderSql = `ORDER BY nc.created ${params.sort === SortOrder.Asc ? 'ASC' : 'DESC'}`
        const limit = params.limit ? ` LIMIT ${params.limit}` : ''
        const sql = [select, where, limit].join(' ')

        const result = await this.select(sql)

        return result.map(it => this.toNotificationContext(it));
    }


    async findNotifications(params: FindNotificationsParams, personalWorkspace: string, workspace?: string): Promise<Notification[]> {
        //TODO: should join with attachments and reactions?
        const select = `
            SELECT n.message_id,
                   n.context_id,
                   m.card_id AS message_card,
                   m.content   AS message_content,
                   m.creator   AS message_creator,
                   m.created   AS message_created,
                   nc.card_id,
                   nc.archived_from,
                   nc.last_view,
                   nc.last_update,
                   json_group_array(
                           json_object(
                                   'id', p.id,
                                   'content', p.content,
                                   'creator', p.creator,
                                   'created', p.created
                           )
                   )           AS patches
            FROM ${TableName.Notification} n
                     JOIN
                 ${TableName.NotificationContext} nc ON n.context_id = nc.id
                     JOIN
                 ${TableName.Message} m ON n.message_id = m.id
                     LEFT JOIN
                 ${TableName.Patch} p ON p.message_id = m.id
        `;
        const where = this.buildNotificationWhere(params, personalWorkspace, workspace)
        const groupBy = `GROUP BY n.message_id, n.context_id, m.id, nc.card_id, nc.archived_from, nc.last_view, nc.last_update`;
        const orderBy = `ORDER BY m.created ${params.order === SortingOrder.Ascending ? 'ASC' : 'DESC'}`
        const limit = params.limit ? ` LIMIT ${params.limit}` : ''
        const sql = [select, where, groupBy, orderBy, limit].join(' ')

        const result = await this.select(sql)

        return result.map(it => this.toNotification(it));
    }

    buildContextWhere(params: FindNotificationContextParams, personalWorkspaces: string[], workspace?: string,): string {
        const where: string[] = []

        if (workspace != null) {
            where.push(`nc.workspace_id = '${workspace}'`)
        }
        if (personalWorkspaces.length > 0) {
            where.push(`nc.personal_workspace IN (${personalWorkspaces.map(it => `'${it}'`).join(', ')})`)
        }

        if (params.card != null) {
            where.push(`nc.card_id = '${params.card}'`)
        }

        return `WHERE ${where.join(' AND ')}`
    }

    buildNotificationWhere(params: FindNotificationsParams, personalWorkspace: string, workspace?: string): string {
        const where: string[] = [`nc.personal_workspace = '${personalWorkspace}'`]
        if (workspace != null) {
            where.push(`nc.workspace_id = '${workspace}'`)
        }

        if (params.context != null) {
            where.push(`n.context_id = '${params.context}'`)
        }

        if (params.read === true) {
            where.push(`nc.last_view IS NOT NULL AND nc.last_view >= m.created`)
        }

        if (params.read === false) {
            where.push(`(nc.last_view IS NULL OR nc.last_view > m.created)`)
        }

        if (params.archived === true) {
            where.push(`nc.archived_from IS NOT NULL AND nc.archived_from >= m.created`)
        }

        if (params.archived === false) {
            where.push(`(nc.archived_from IS NULL OR nc.archived_from > m.created)`)
        }

        return `WHERE ${where.join(' AND ')}`
    }

    toNotificationContext(row: any): NotificationContext {
        return {
            id: row.id,
            card: row.card_id,
            archivedFrom: row.archived_from ? new Date(row.archived_from) : undefined,
            lastView: row.last_view ? new Date(row.last_view) : undefined,
            lastUpdate: row.last_update ? new Date(row.last_update) : undefined,
            workspace: row.workspace,
            personalWorkspace: row.personal_workspace
        }
    }

    toNotification(row: any): Notification {
        const patches = JSON.parse(row.patches).filter((p: any) => p.created != null)
        const lastPatch = patches[patches.length - 1]
        const lastView = row.last_view ? new Date(row.last_view) : undefined
        const archivedFrom = row.archived_from ? new Date(row.archived_from) : undefined
        const created = new Date(row.message_created)
        return {
            message: {
                id: row.message_id,
                card: row.message_card,
                content: lastPatch?.content ?? row.message_content,
                creator: row.message_creator,
                created,
                edited: new Date(lastPatch?.created ?? row.message_created),
                reactions: [],
                attachments: []
            },
            context: row.context_id,
            read: lastView != null && lastView >= created,
            archived: archivedFrom != null && archivedFrom >= created
        }
    }
}

