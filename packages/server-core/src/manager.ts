import {
  type BroadcastEvent,
  type ConnectionInfo,
  type DbAdapter,
  EventType,
  type NotificationContextCreatedEvent,
  type NotificationCreatedEvent,
  type Event,
  type EventResult
} from '@hcengineering/communication-sdk-types'
import type {
  FindMessagesParams,
  FindNotificationContextParams,
  FindNotificationsParams,
  Message,
  MessageID
} from '@hcengineering/communication-types'

import { Triggers } from './triggers.ts'
import { EventProcessor } from './eventProcessor.ts'
import type { MeasureContext } from '@hcengineering/core'

type QueryId = number | string
type QueryType = 'message' | 'notification' | 'context'

export type BroadcastSessionsFunc = (ctx: MeasureContext, sessionIds: string[], result: any) => void

type SessionInfo = {
  personalWorkspace: string
  messageQueries: Map<QueryId, FindMessagesParams>
  notificationQueries: Map<QueryId, FindNotificationsParams>
  contextQueries: Map<QueryId, FindNotificationContextParams>
}

export class Manager {
  private dataBySessionId: Map<string, SessionInfo> = new Map()
  private triggers: Triggers
  private readonly eventProcessor: EventProcessor

  constructor(
    private readonly ctx: MeasureContext,
    private readonly db: DbAdapter,
    private readonly workspace: string,
    private readonly broadcast: BroadcastSessionsFunc
  ) {
    this.eventProcessor = new EventProcessor(db, this.workspace)
    this.triggers = new Triggers(db, this.workspace)
  }

  async findMessages(info: ConnectionInfo, params: FindMessagesParams, queryId?: number): Promise<Message[]> {
    const result = await this.db.findMessages(this.workspace, params)
    if (queryId != null && info.sessionId != null && info.sessionId !== '') {
      this.subscribeQuery(info, 'message', queryId, params)
    }
    return result
  }

  async event(info: ConnectionInfo, event: Event): Promise<EventResult> {
    const { result, broadcastEvent } = await this.eventProcessor.process(info.personalWorkspace, event)
    if (broadcastEvent !== undefined) {
      void this.next(broadcastEvent)
    }
    return result
  }

  subscribeQuery(info: ConnectionInfo, type: QueryType, queryId: number, params: Record<string, any>): void {
    const { sessionId, personalWorkspace } = info
    const data = this.dataBySessionId.get(sessionId) ?? {
      personalWorkspace,
      messageQueries: new Map(),
      notificationQueries: new Map(),
      contextQueries: new Map()
    }
    if (!this.dataBySessionId.has(sessionId)) {
      this.dataBySessionId.set(sessionId, data)
    }

    if (type === 'message') {
      data.messageQueries.set(queryId, params)
    } else if (type === 'notification') {
      data.notificationQueries.set(queryId, params)
    } else if (type === 'context') {
      data.contextQueries.set(queryId, params)
    }
  }

  unsubscribeQuery(info: ConnectionInfo, queryId: number): void {
    const data = this.dataBySessionId.get(info.sessionId)
    if (data == null) return

    data.messageQueries.delete(queryId)
    data.notificationQueries.delete(queryId)
    data.contextQueries.delete(queryId)
  }

  closeSession(sessionId: string): void {
    this.dataBySessionId.delete(sessionId)
  }

  async next(event: BroadcastEvent): Promise<void> {
    await this.broadcastEvent(event)
    const derived = await this.triggers.process(event)
    await Promise.all(derived.map((it) => this.next(it)))
  }

  private async broadcastEvent(event: BroadcastEvent): Promise<void> {
    const sessionIds: string[] = []
    for (const [sessionId, session] of this.dataBySessionId.entries()) {
      if (this.match(event, session)) {
        sessionIds.push(sessionId)
      }
    }

    if (sessionIds.length > 0) {
      this.broadcast(this.ctx, sessionIds, event)
    }
  }

  private match(event: BroadcastEvent, info: SessionInfo): boolean {
    switch (event.type) {
      case EventType.MessageCreated:
        return this.matchMessagesQuery(
          { id: event.message.id, card: event.message.card },
          Array.from(info.messageQueries.values())
        )
      case EventType.PatchCreated:
        return this.matchMessagesQuery(
          { card: event.card, id: event.patch.message },
          Array.from(info.messageQueries.values())
        )
      case EventType.MessageRemoved:
        return this.matchMessagesQuery(
          { card: event.card, id: event.message },
          Array.from(info.messageQueries.values())
        )
      case EventType.ReactionCreated:
        return this.matchMessagesQuery(
          { card: event.card, id: event.reaction.message },
          Array.from(info.messageQueries.values())
        )
      case EventType.ReactionRemoved:
        return this.matchMessagesQuery(
          { card: event.card, id: event.message },
          Array.from(info.messageQueries.values())
        )
      case EventType.AttachmentCreated:
        return this.matchMessagesQuery(
          { card: event.card, id: event.attachment.message },
          Array.from(info.messageQueries.values())
        )
      case EventType.AttachmentRemoved:
        return this.matchMessagesQuery(
          { card: event.card, id: event.message },
          Array.from(info.messageQueries.values())
        )
      case EventType.NotificationCreated:
        return (
          info.personalWorkspace === event.personalWorkspace &&
          this.matchNotificationQuery(event, Array.from(info.notificationQueries.values()))
        )
      case EventType.NotificationRemoved:
        return info.personalWorkspace === event.personalWorkspace && info.notificationQueries.size > 0
      case EventType.NotificationContextCreated:
        return (
          info.personalWorkspace === event.context.personalWorkspace &&
          this.matchContextQuery(event, Array.from(info.contextQueries.values()))
        )
      case EventType.NotificationContextRemoved:
        return info.personalWorkspace === event.personalWorkspace && info.contextQueries.size > 0
      case EventType.NotificationContextUpdated:
        return info.personalWorkspace === event.personalWorkspace && info.contextQueries.size > 0
    }
  }

  private matchMessagesQuery(params: { id?: MessageID; card?: string }, queries: FindMessagesParams[]): boolean {
    if (queries.length === 0) return false

    for (const query of queries) {
      if (query.id != null && query.id !== params.id) continue
      if (query.card != null && query.card !== params.card) continue
      return true
    }

    return false
  }

  private matchNotificationQuery(event: NotificationCreatedEvent, queries: FindNotificationsParams[]): boolean {
    if (queries.length === 0) return false

    for (const query of queries) {
      if (query.context != null && query.context !== event.notification.context) continue
      if (query.message != null && query.message !== event.notification.message.id) continue
      if (query.read != null && query.read !== event.notification.read) continue
      if (query.archived != null && query.archived !== event.notification.archived) continue
      return true
    }

    return false
  }

  private matchContextQuery(event: NotificationContextCreatedEvent, queries: FindNotificationContextParams[]): boolean {
    if (queries.length === 0) return false

    for (const query of queries) {
      if (query.id != null && query.id !== event.context.id) continue
      if (query.card != null && query.card !== event.context.card) continue
      return true
    }

    return false
  }

  close(): void {
    this.db.close()
  }
}
