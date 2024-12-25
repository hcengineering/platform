import {
    type FindNotificationsParams,
    SortOrder,
    type Notification,
    type ID,
} from '@communication/types'
import {
    type NotificationCreatedEvent,
    EventType,
    type BroadcastEvent,
    type NotificationContextRemovedEvent,
    type NotificationRemovedEvent,
    type NotificationContextUpdatedEvent,
} from '@communication/sdk-types'

import {BaseQuery} from '../query.ts';

export class NotificationQuery extends BaseQuery<Notification, FindNotificationsParams> {
    override async find(params: FindNotificationsParams): Promise<Notification[]> {
        return this.client.findNotifications(params, this.id)
    }

    override getObjectId(object: Notification): ID {
        return object.message.id
    }

    override getObjectDate(object: Notification): Date {
        return object.message.created
    }

    override async onEvent(event: BroadcastEvent): Promise<void> {
        switch (event.type) {
            case EventType.NotificationCreated:
                return await this.onCreateNotificationEvent(event)
            case EventType.NotificationRemoved:
                return await this.onRemoveNotificationEvent(event)
            case EventType.NotificationContextUpdated:
                return await this.onUpdateNotificationContextEvent(event)
            case EventType.NotificationContextRemoved:
                return await this.onRemoveNotificationContextEvent(event)
        }
    }

    async onCreateNotificationEvent(event: NotificationCreatedEvent): Promise<void> {
        if (this.result instanceof Promise) {
            this.result = await this.result
        }

        const exists = this.result.get(event.notification.message.id)
        if (exists !== undefined) return

        if (this.params.message != null && this.params.message !== event.notification.message.id) return
        if (this.params.context != null && this.params.context !== event.notification.context) return

        if (this.result.isTail()) {
            if (this.params.sort === SortOrder.Asc) {
                this.result.push(event.notification)
            } else {
                this.result.unshift(event.notification)
            }
            await this.notify()
        }
    }


    private async onUpdateNotificationContextEvent(event: NotificationContextUpdatedEvent): Promise<void> {
        if (this.result instanceof Promise) {
            this.result = await this.result
        }

        if (this.params.context != null && this.params.context !== event.context) return
        if (event.update.lastView === undefined && event.update.archivedFrom === undefined) return

        const toUpdate = this.params.context === event.context ?
            this.result.getResult()
            : this.result.getResult().filter(it => it.context === event.context)
        if (toUpdate.length === 0) return

        for (const notification of toUpdate) {
            this.result.update({
                ...notification,
                ...event.update.lastView !== undefined ? {
                    read: event.update.lastView < notification.message.created
                } : {},
                ...event.update.archivedFrom !== undefined ? {
                    archived: event.update.archivedFrom < notification.message.created
                } : {}
            })
        }
    }

    private async onRemoveNotificationEvent(event: NotificationRemovedEvent): Promise<void> {
        if (this.result instanceof Promise) {
            this.result = await this.result
        }

        const deleted = this.result.delete(event.message)

        if (deleted !== undefined) {
            await this.notify()
        }
    }

    private async onRemoveNotificationContextEvent(event: NotificationContextRemovedEvent): Promise<void> {
        if (this.result instanceof Promise) {
            this.result = await this.result
        }

        if (this.params.context != null && this.params.context !== event.context) return

        if (event.context === this.params.context) {
            if (this.result.length === 0) return
            this.result.deleteAll()
            this.result.setHead(true)
            this.result.setTail(true)
            await this.notify()
        } else {
            const toRemove = this.result.getResult().filter(it => it.context === event.context)
            if (toRemove.length === 0) return

            for (const notification of toRemove) {
                this.result.delete(notification.message.id)
            }
            await this.notify()
        }

    }

}
