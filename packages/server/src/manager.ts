import WebSocket from 'ws'
import {
  type BroadcastEvent,
  type DbAdapter,
  EventType,
  type NotificationContextCreatedEvent,
  type NotificationCreatedEvent,
  type Response
} from '@communication/sdk-types'
import type {
  FindMessagesParams,
  FindNotificationContextParams,
  FindNotificationsParams,
  MessageID
} from '@communication/types'

import { Session } from './session'
import type { ConnectionInfo } from './types'
import { serializeResponse } from './utils/serialize.ts'
import { Triggers } from './triggers.ts'

type QueryId = number | string
type QueryType = 'message' | 'notification' | 'context'

type SessionInfo = {
  session: Session
  ws: WebSocket
  messageQueries: Map<QueryId, FindMessagesParams>
  notificationQueries: Map<QueryId, FindNotificationsParams>
  contextQueries: Map<QueryId, FindNotificationContextParams>
}

export class Manager {
  private sessionsByWorkspace: Map<string, SessionInfo[]> = new Map()
  private triggers: Triggers
  private lastSessionId: number = 0

  constructor(private readonly db: DbAdapter) {
    this.triggers = new Triggers(db)
  }

  createSession(ws: WebSocket, info: ConnectionInfo): Session {
    const current = this.sessionsByWorkspace.get(info.workspace) ?? []
    this.lastSessionId++
    const session = new Session(this.lastSessionId, info, this.db, this)
    current.push({ session, ws, messageQueries: new Map(), notificationQueries: new Map(), contextQueries: new Map() })
    this.sessionsByWorkspace.set(info.workspace, current)
    return session
  }

  closeSession(ws: WebSocket, workspace: string): void {
    const sessions = this.sessionsByWorkspace.get(workspace) ?? []
    if (sessions.length === 0) return
    const newSessions = sessions.filter((it) => it.ws !== ws)
    if (newSessions.length === 0) {
      this.sessionsByWorkspace.delete(workspace)
    } else {
      this.sessionsByWorkspace.set(workspace, newSessions)
    }
  }

  getSessionInfo(sessionId: number, workspace: string): SessionInfo | undefined {
    const sessions = this.sessionsByWorkspace.get(workspace) ?? []
    return sessions.find((it) => it.session.id === sessionId)
  }

  subscribeQuery(
    sessionId: number,
    workspace: string,
    type: QueryType,
    queryId: number,
    params: Record<string, any>
  ): void {
    const info = this.getSessionInfo(sessionId, workspace)
    if (info == null) return

    if (type === 'message') {
      info.messageQueries.set(queryId, params)
    } else if (type === 'notification') {
      info.notificationQueries.set(queryId, params)
    } else if (type === 'context') {
      info.contextQueries.set(queryId, params)
    }
  }

  unsubscribeQuery(sessionId: number, workspace: string, queryId: number): void {
    const info = this.getSessionInfo(sessionId, workspace)
    if (info == null) return

    info.messageQueries.delete(queryId)
    info.notificationQueries.delete(queryId)
    info.contextQueries.delete(queryId)
  }

  async next(event: BroadcastEvent, workspace: string): Promise<void> {
    await this.broadcast(event, workspace)
    const derived = await this.triggers.process(event, workspace)
    const derivedPromises: Promise<void>[] = []
    for (const d of derived) {
      derivedPromises.push(this.next(d, workspace))
    }
    await Promise.all(derivedPromises)
  }

  private async broadcast(event: BroadcastEvent, workspace: string): Promise<void> {
    const sessions = this.sessionsByWorkspace.get(workspace) ?? []
    const response: Response = { result: event }
    for (const session of sessions) {
      const msg = serializeResponse(response, session.session.binary)
      if (this.match(event, session)) {
        session.ws.send(msg)
      }
    }
  }

  private match(event: BroadcastEvent, info: SessionInfo): boolean {
    switch (event.type) {
      case EventType.MessageCreated:
        return this.matchMessagesQuery(
          { id: event.message.id, thread: event.message.thread },
          Array.from(info.messageQueries.values())
        )
      case EventType.PatchCreated:
        return this.matchMessagesQuery(
          { thread: event.thread, id: event.patch.message },
          Array.from(info.messageQueries.values())
        )
      case EventType.MessageRemoved:
        return this.matchMessagesQuery(
          { thread: event.thread, id: event.message },
          Array.from(info.messageQueries.values())
        )
      case EventType.ReactionCreated:
        return this.matchMessagesQuery(
          { thread: event.thread, id: event.reaction.message },
          Array.from(info.messageQueries.values())
        )
      case EventType.ReactionRemoved:
        return this.matchMessagesQuery(
          { thread: event.thread, id: event.message },
          Array.from(info.messageQueries.values())
        )
      case EventType.AttachmentCreated:
        return this.matchMessagesQuery(
          { thread: event.thread, id: event.attachment.message },
          Array.from(info.messageQueries.values())
        )
      case EventType.AttachmentRemoved:
        return this.matchMessagesQuery(
          { thread: event.thread, id: event.message },
          Array.from(info.messageQueries.values())
        )
      case EventType.NotificationCreated:
        return (
          info.session.info.personWorkspace === event.personWorkspace &&
          this.matchNotificationQuery(event, Array.from(info.notificationQueries.values()))
        )
      case EventType.NotificationRemoved:
        return info.session.info.personWorkspace === event.personWorkspace && info.notificationQueries.size > 0
      case EventType.NotificationContextCreated:
        return (
          info.session.info.personWorkspace === event.context.personWorkspace &&
          this.matchContextQuery(event, Array.from(info.contextQueries.values()))
        )
      case EventType.NotificationContextRemoved:
        return info.session.info.personWorkspace === event.personWorkspace && info.contextQueries.size > 0
      case EventType.NotificationContextUpdated:
        return info.session.info.personWorkspace === event.personWorkspace && info.contextQueries.size > 0
    }
  }

  private matchMessagesQuery(params: { id?: MessageID; thread?: string }, queries: FindMessagesParams[]): boolean {
    if (queries.length === 0) return false

    for (const query of queries) {
      if (query.id != null && query.id !== params.id) continue
      if (query.thread != null && query.thread !== params.thread) continue
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
}
