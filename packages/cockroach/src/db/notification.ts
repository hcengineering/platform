import {
    type MessageID,
    type ContextID,
    type CardID,
    type NotificationContext,
    type FindNotificationContextParams, SortOrder,
    type FindNotificationsParams, type Notification,
    type NotificationContextUpdate,
    type WorkspaceID
} from '@hcengineering/communication-types'

import {BaseDb} from './base.ts'
import {TableName, type ContextDb, type NotificationDb} from './schema.ts'

export class NotificationsDb extends BaseDb {
    async createNotification(message: MessageID, context: ContextID): Promise<void> {
        const dbData: NotificationDb = {
            message_id: message,
            context
        }
        await this.insert(TableName.Notification, dbData)
    }

    async removeNotification(message: MessageID, context: ContextID): Promise<void> {
        await this.remove(TableName.Notification, {
            message_id: message,
            context
        })
    }

    async createContext(personalWorkspace: WorkspaceID,card: CardID,  lastView?: Date, lastUpdate?: Date): Promise<ContextID> {
        const dbData: ContextDb = {
            workspace_id: this.workspace,
            card_id: card,
            personal_workspace: personalWorkspace,
            last_view: lastView,
            last_update: lastUpdate
        }
        return await this.insertWithReturn(TableName.NotificationContext, dbData, 'id') as ContextID
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

        const sql = `UPDATE ${TableName.NotificationContext}
                     SET ${keys.map((k, idx) => `"${k}" = $${idx + 1}`).join(', ')}
                     WHERE id = $${keys.length + 1}`

        await this.client.unsafe(sql, [values, context])
    }

    async findContexts(params: FindNotificationContextParams, personalWorkspaces: WorkspaceID[], workspace?: WorkspaceID,): Promise<NotificationContext[]> {
        const select = `
            SELECT nc.id, nc.card_id, nc.archived_from, nc.last_view, nc.last_update
            FROM ${TableName.NotificationContext} nc`;
        const {where, values} = this.buildContextWhere(params, personalWorkspaces, workspace)
        // const orderSql = `ORDER BY nc.created ${params.sort === SortOrder.Asc ? 'ASC' : 'DESC'}`
        const limit = params.limit ? ` LIMIT ${params.limit}` : ''
        const sql = [select, where, limit].join(' ')

        const result = await this.client.unsafe(sql, values);

        return result.map(this.toNotificationContext);
    }


    async findNotifications(params: FindNotificationsParams, personalWorkspace: WorkspaceID, workspace?: WorkspaceID): Promise<Notification[]> {
        //TODO: experiment with select to improve performance, should join with attachments and reactions?
        const select = `
            SELECT n.message_id,
                   n.context,
                   m.card_id                 AS message_card,
                   m.content                   AS message_content,
                   m.creator                   AS message_creator,
                   m.created                   AS message_created,
                   nc.card_id,
                   nc.archived_from,
                   nc.last_view,
                   nc.last_update,
                   (SELECT json_agg(
                                   jsonb_build_object(
                                           'id', p.id,
                                           'content', p.content,
                                           'creator', p.creator,
                                           'created', p.created
                                   )
                           )
                    FROM ${TableName.Patch} p
                    WHERE p.message_id = m.id) AS patches
            FROM ${TableName.Notification} n
                     JOIN ${TableName.NotificationContext} nc ON n.context = nc.id
                     JOIN ${TableName.Message} m ON n.message_id = m.id
        `;
        const {where, values} = this.buildNotificationWhere(params, personalWorkspace, workspace)
        const orderBy = params.sort ? `ORDER BY m.created ${params.sort === SortOrder.Asc ? 'ASC' : 'DESC'}` : ''
        const limit = params.limit ? ` LIMIT ${params.limit}` : ''
        const sql = [select, where, orderBy, limit].join(' ')

        const result = await this.client.unsafe(sql, values);

        return result.map(this.toNotification);
    }

    buildContextWhere(params: FindNotificationContextParams, personalWorkspaces: WorkspaceID[], workspace?: WorkspaceID): {
        where: string,
        values: any[]
    } {
        const where: string[] = []
        const values: any[] = []
        let index = 1

        if (workspace != null) {
            where.push(`nc.workspace_id = $${index++}`)
            values.push(workspace)
        }

        if (personalWorkspaces.length > 0) {
            where.push(`nc.personal_workspace IN (${personalWorkspaces.map((it) => `$${index++}`).join(', ')})`)
            values.push(...personalWorkspaces)
        }

        if (params.card != null) {
            where.push(`nc.card_id = $${index++}`)
            values.push(params.card)
        }

        return {where: `WHERE ${where.join(' AND ')}`, values}
    }

    buildNotificationWhere(params: FindNotificationsParams, personalWorkspace: WorkspaceID, workspace?: WorkspaceID): {
        where: string,
        values: any[]
    } {
        const where: string[] = ['nc.personal_workspace = $1']
        const values: any[] = [personalWorkspace]
        let index = 2

        if (workspace != null) {
            where.push(`nc.workspace_id = $${index++}`)
            values.push(workspace)
        }

        if (params.context != null) {
            where.push(`n.context = $${index++}`)
            values.push(params.context)
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


        return {where: `WHERE ${where.join(' AND ')}`, values}
    }

    toNotificationContext(row: any): NotificationContext {
        return {
            id: row.id,
            card: row.card_id,
            workspace: row.workspace_id,
            personalWorkspace: row.personal_workspace,
            archivedFrom: row.archived_from ? new Date(row.archived_from) : undefined,
            lastView: row.last_view ? new Date(row.last_view) : undefined,
            lastUpdate: row.last_update ? new Date(row.last_update) : undefined
        }
    }

    toNotification(row: any): Notification {
        const lastPatch = row.patches?.[0]
        const lastView = row.last_view ? new Date(row.last_view) : undefined
        const archivedFrom = row.archived_from ? new Date(row.archived_from) : undefined
        const created = new Date(row.message_created)

        return {
            message: {
                id: row.id,
                card: row.message_card,
                content: lastPatch?.content ?? row.message_content,
                creator: row.message_creator,
                created,
                edited: new Date(lastPatch?.created ?? row.message_created),
                reactions: row.reactions ?? [],
                attachments: row.attachments ?? []
            },
            context: row.context,
            read: lastView != null && lastView >= created,
            archived: archivedFrom != null && archivedFrom >= created
        }
    }
}

