import type { DbAdapter, Event, EventResult } from '@communication/sdk-types'
import type {
  FindMessagesParams,
  FindNotificationContextParams,
  FindNotificationsParams,
  Message,
  Notification,
  NotificationContext
} from '@communication/types'

import type { ConnectionInfo } from './types'
import { EventProcessor } from './eventProcessor.ts'
import type { Manager } from './manager.ts'

export class Session {
  binary: boolean = false
  lastRequest: number = Date.now()

  private readonly eventProcessor: EventProcessor

  constructor(
    readonly id: number,
    readonly info: ConnectionInfo,
    private readonly db: DbAdapter,
    private readonly manager: Manager
  ) {
    this.eventProcessor = new EventProcessor(db, info.workspace, info.personWorkspace)
  }

  ping(): string {
    this.lastRequest = Date.now()
    return 'pong'
  }

  async findMessages(params: FindMessagesParams, queryId?: number): Promise<Message[]> {
    const result = await this.db.findMessages(this.info.workspace, params)
    if (queryId != null) {
      this.manager.subscribeQuery(this.id, this.info.workspace, 'message', queryId, params)
    }
    return result
  }

  async unsubscribeQuery(id: number): Promise<void> {
    this.manager.unsubscribeQuery(this.id, this.info.workspace, id)
  }

  async findNotifications(params: FindNotificationsParams, queryId?: number): Promise<Notification[]> {
    //TODO: do we need filter by workspace by default?
    const result = await this.db.findNotifications(params, this.info.personWorkspace)
    if (queryId != null) {
      this.manager.subscribeQuery(this.id, this.info.workspace, 'notification', queryId, params)
    }
    return result
  }

  async findNotificationContexts(
    params: FindNotificationContextParams,
    queryId?: number
  ): Promise<NotificationContext[]> {
    //TODO: do we need filter by workspace by default?
    const result = await this.db.findContexts(params, [this.info.personWorkspace])
    if (queryId != null) {
      this.manager.subscribeQuery(this.id, this.info.workspace, 'context', queryId, params)
    }

    return result
  }

  async event(event: Event): Promise<EventResult> {
    const { result, broadcastEvent } = await this.eventProcessor.process(event)
    if (broadcastEvent !== undefined) {
      void this.manager.next(broadcastEvent, this.info.workspace)
    }
    return result
  }
}
