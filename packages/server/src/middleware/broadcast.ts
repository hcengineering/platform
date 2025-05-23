//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License. You may
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
  CardResponseEventType,
  type EventResult,
  LabelResponseEventType,
  MessageResponseEventType,
  NotificationResponseEventType,
  type RequestEvent,
  type ResponseEvent,
  type SessionData
} from '@hcengineering/communication-sdk-types'
import type {
  AccountID,
  CardID,
  FindLabelsParams,
  FindMessagesGroupsParams,
  FindMessagesParams,
  FindNotificationContextParams,
  FindNotificationsParams,
  Label,
  Message,
  MessageID,
  MessagesGroup,
  Notification,
  NotificationContext
} from '@hcengineering/communication-types'

import type { BroadcastSessionsFunc, Middleware, MiddlewareContext, QueryId } from '../types'
import { BaseMiddleware } from './base'

interface SessionInfo {
  account: AccountID
  messageQueries: Map<QueryId, FindMessagesParams>
  contextQueries: Map<QueryId, Set<CardID>>
}

export class BroadcastMiddleware extends BaseMiddleware implements Middleware {
  private readonly dataBySessionId = new Map<string, SessionInfo>()

  constructor(
    private readonly broadcastFn: BroadcastSessionsFunc,
    readonly context: MiddlewareContext,
    next?: Middleware
  ) {
    super(context, next)
  }
  async findMessages(session: SessionData, params: FindMessagesParams, queryId?: QueryId): Promise<Message[]> {
    this.createSession(session)

    const result = await this.provideFindMessages(session, params, queryId)
    if (queryId != null && session.sessionId != null && session.sessionId !== '') {
      this.subscribeMessageQuery(session, queryId, params)
    }
    return result
  }

  async findMessagesGroups(
    session: SessionData,
    params: FindMessagesGroupsParams,
    queryId?: QueryId
  ): Promise<MessagesGroup[]> {
    this.createSession(session)
    return await this.provideFindMessagesGroups(session, params, queryId)
  }

  async findNotificationContexts(
    session: SessionData,
    params: FindNotificationContextParams,
    queryId?: QueryId
  ): Promise<NotificationContext[]> {
    this.createSession(session)

    const result = await this.provideFindNotificationContexts(session, params, queryId)
    if (queryId != null && session.sessionId != null && session.sessionId !== '') {
      this.subscribeContextQuery(session, queryId, result)
    }
    return result
  }

  async findNotifications(
    session: SessionData,
    params: FindNotificationsParams,
    queryId?: QueryId
  ): Promise<Notification[]> {
    this.createSession(session)
    return await this.provideFindNotifications(session, params, queryId)
  }

  async findLabels(session: SessionData, params: FindLabelsParams, queryId?: QueryId): Promise<Label[]> {
    this.createSession(session)
    return await this.provideFindLabels(session, params, queryId)
  }

  async event(session: SessionData, event: RequestEvent, derived: boolean): Promise<EventResult> {
    this.createSession(session)
    return await this.provideEvent(session, event, derived)
  }

  unsubscribeQuery(session: SessionData, queryId: number): void {
    if (session.sessionId == null) return
    const data = this.dataBySessionId.get(session.sessionId)
    if (data == null) return

    data.messageQueries.delete(queryId)
    data.contextQueries.delete(queryId)
  }

  async response(session: SessionData, event: ResponseEvent, derived: boolean): Promise<void> {
    const sessionIds: string[] = []
    for (const [sessionId, session] of this.dataBySessionId.entries()) {
      if (this.match(event, session)) {
        sessionIds.push(sessionId)
      }
    }

    if (sessionIds.length > 0) {
      try {
        this.broadcastFn(this.context.ctx, sessionIds, event)
      } catch (e) {
        this.context.ctx.error('Failed to broadcast event', { error: e })
      }
    }
    await this.provideResponse(session, event, derived)
  }

  closeSession(sessionId: string): void {
    this.dataBySessionId.delete(sessionId)
  }

  close(): void {
    this.dataBySessionId.clear()
  }

  private subscribeMessageQuery(session: SessionData, queryId: QueryId, params: Record<string, any>): void {
    const data = this.createSession(session)
    if (data == null) return

    data.messageQueries.set(queryId, params as FindMessagesParams)
  }

  private subscribeContextQuery(session: SessionData, queryId: QueryId, result: NotificationContext[]): void {
    const data = this.createSession(session)
    if (data == null) return

    const cards = new Set(result.map((it) => it.card))
    const current = data.contextQueries.get(queryId) ?? new Set()

    data.contextQueries.set(queryId, new Set([...current, ...cards]))
  }

  private createSession(session: SessionData): SessionInfo | undefined {
    const id = session.sessionId
    if (id == null) return
    if (!this.dataBySessionId.has(id)) {
      this.dataBySessionId.set(id, {
        account: session.account.uuid,
        messageQueries: new Map(),
        contextQueries: new Map()
      })
    }

    return this.dataBySessionId.get(id)
  }

  private match(event: ResponseEvent, info: SessionInfo): boolean {
    switch (event.type) {
      case MessageResponseEventType.MessageCreated:
        return this.matchMessagesQuery(
          { ids: [event.message.id], card: event.message.card },
          Array.from(info.messageQueries.values()),
          new Set(Array.from(info.contextQueries.values()).flatMap((it) => Array.from(it)))
        )
      case MessageResponseEventType.PatchCreated:
        return this.matchMessagesQuery(
          { card: event.card, ids: [event.patch.message] },
          Array.from(info.messageQueries.values()),
          new Set(Array.from(info.contextQueries.values()).flatMap((it) => Array.from(it)))
        )
      case MessageResponseEventType.ReactionCreated:
      case MessageResponseEventType.ReactionRemoved:
      case MessageResponseEventType.LinkPreviewCreated:
      case MessageResponseEventType.LinkPreviewRemoved:
      case MessageResponseEventType.FileCreated:
      case MessageResponseEventType.FileRemoved:
        return this.matchMessagesQuery(
          { card: event.card, ids: [event.message] },
          Array.from(info.messageQueries.values()),
          new Set()
        )
      case MessageResponseEventType.ThreadCreated:
        return this.matchMessagesQuery(
          { card: event.thread.card, ids: [event.thread.message] },
          Array.from(info.messageQueries.values()),
          new Set()
        )
      case NotificationResponseEventType.NotificationCreated:
        return info.account === event.notification.account
      case NotificationResponseEventType.NotificationsRemoved:
        return info.account === event.account
      case NotificationResponseEventType.NotificationUpdated:
        return info.account === event.query.account
      case NotificationResponseEventType.NotificationContextCreated:
        return info.account === event.context.account
      case NotificationResponseEventType.NotificationContextRemoved:
        return info.account === event.account
      case NotificationResponseEventType.NotificationContextUpdated:
        return info.account === event.account
      case MessageResponseEventType.MessagesGroupCreated:
      case MessageResponseEventType.MessagesGroupRemoved:
        return false
      case NotificationResponseEventType.RemovedCollaborators:
      case NotificationResponseEventType.AddedCollaborators:
        return true
      case MessageResponseEventType.ThreadUpdated:
        return false
      case LabelResponseEventType.LabelCreated:
        return info.account === event.label.account
      case LabelResponseEventType.LabelRemoved:
        return info.account === event.account
      case CardResponseEventType.CardTypeUpdated:
        return true
      case CardResponseEventType.CardRemoved:
        return true
    }
  }

  private matchMessagesQuery(
    params: { ids: MessageID[]; card: CardID },
    queries: FindMessagesParams[],
    cards: Set<CardID>
  ): boolean {
    if (cards.has(params.card)) return true
    if (queries.length === 0) return false

    for (const query of queries) {
      if (query.id != null && !params.ids.includes(query.id)) continue
      if (query.card != null && query.card !== params.card) continue
      return true
    }

    return false
  }
}
