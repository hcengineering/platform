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
  type ConnectionInfo,
  type DbAdapter,
  type EventResult,
  type RequestEvent,
  type ResponseEvent,
  ResponseEventType
} from '@hcengineering/communication-sdk-types'
import type {
  AccountID,
  CardID,
  FindMessagesGroupsParams,
  FindMessagesParams,
  FindNotificationContextParams,
  FindNotificationsParams,
  Message,
  MessageID,
  MessagesGroup,
  NotificationContext,
  WorkspaceID,
  Notification
} from '@hcengineering/communication-types'
import type { MeasureContext } from '@hcengineering/core'

import { Triggers } from './triggers'
import { Permissions } from './permissions'
import { EventProcessor } from './eventProcessor'
import type { Metadata } from './metadata.ts'

type QueryId = number | string

export type BroadcastSessionsFunc = (ctx: MeasureContext, sessionIds: string[], result: any) => void

interface SessionInfo {
  account: AccountID
  messageQueries: Map<QueryId, FindMessagesParams>
  contextQueries: Map<QueryId, Set<CardID>>
}

export class Manager {
  private readonly dataBySessionId = new Map<string, SessionInfo>()
  private readonly triggers: Triggers
  private readonly eventProcessor: EventProcessor
  private readonly permissions: Permissions = new Permissions()

  constructor(
    private readonly ctx: MeasureContext,
    private readonly metadata: Metadata,
    private readonly db: DbAdapter,
    private readonly workspace: WorkspaceID,
    private readonly broadcast: BroadcastSessionsFunc
  ) {
    this.eventProcessor = new EventProcessor(db)
    this.triggers = new Triggers(ctx.newChild('triggers', {}), this.metadata, db, this.workspace)
  }

  async findMessages(info: ConnectionInfo, params: FindMessagesParams, queryId?: QueryId): Promise<Message[]> {
    this.createSession(info)
    const result = await this.db.findMessages(params)
    if (queryId != null && info.sessionId != null && info.sessionId !== '') {
      this.subscribeMessageQuery(info, queryId, params)
    }
    return result
  }

  async findMessagesGroups(info: ConnectionInfo, params: FindMessagesGroupsParams): Promise<MessagesGroup[]> {
    this.createSession(info)
    return await this.db.findMessagesGroups(params)
  }

  async findNotificationContexts(
    info: ConnectionInfo,
    params: FindNotificationContextParams,
    queryId?: QueryId
  ): Promise<NotificationContext[]> {
    this.createSession(info)

    const result = await this.db.findContexts(params)
    if (queryId != null && info.sessionId != null && info.sessionId !== '') {
      this.subscribeContextQuery(info, queryId, params, result)
    }
    return result
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async findNotifications(info: ConnectionInfo, params: FindNotificationsParams, _?: QueryId): Promise<Notification[]> {
    this.createSession(info)
    return await this.db.findNotifications(params)
  }

  async event(info: ConnectionInfo, event: RequestEvent): Promise<EventResult> {
    this.permissions.validate(info, event)
    this.createSession(info)
    const eventResult = await this.eventProcessor.process(info, event)

    const { result, responseEvent } = eventResult
    if (responseEvent !== undefined) {
      void this.next(info, responseEvent)
    }
    return result ?? {}
  }

  private subscribeMessageQuery(info: ConnectionInfo, queryId: QueryId, params: Record<string, any>): void {
    const data = this.createSession(info)
    if (data == null) return

    data.messageQueries.set(queryId, params as FindMessagesParams)
  }

  private subscribeContextQuery(
    info: ConnectionInfo,
    queryId: QueryId,
    params: FindNotificationContextParams,
    result: NotificationContext[]
  ): void {
    if (params.notifications == null) return
    const data = this.createSession(info)
    if (data == null) return

    const cards = new Set(result.map((it) => it.card))
    const current = data.contextQueries.get(queryId) ?? new Set()

    data.contextQueries.set(queryId, new Set([...current, ...cards]))
  }

  private createSession(info: ConnectionInfo): SessionInfo | undefined {
    if (info.sessionId == null) return
    if (!this.dataBySessionId.has(info.sessionId)) {
      this.dataBySessionId.set(info.sessionId, {
        account: info.account.uuid,
        messageQueries: new Map(),
        contextQueries: new Map()
      })
    }

    return this.dataBySessionId.get(info.sessionId)
  }

  unsubscribeQuery(info: ConnectionInfo, queryId: number): void {
    if (info.sessionId == null) return
    const data = this.dataBySessionId.get(info.sessionId)
    if (data == null) return

    data.messageQueries.delete(queryId)
    data.contextQueries.delete(queryId)
  }

  closeSession(sessionId: string): void {
    this.dataBySessionId.delete(sessionId)
  }

  close(): void {
    this.db.close()
  }

  private async apply(info: ConnectionInfo, derivedRequests: RequestEvent[]): Promise<void> {
    const result = await Promise.all(derivedRequests.map((it) => this.eventProcessor.process(info, it)))
    const derived = result.flatMap((it) => it.responseEvent).filter((it): it is ResponseEvent => it !== undefined)
    await Promise.all(derived.map((it) => this.next(info, it)))
  }

  private async execute(info: ConnectionInfo, request: RequestEvent): Promise<EventResult> {
    const result = await this.eventProcessor.process(info, request)
    if (result.responseEvent != null) {
      void this.next(info, result.responseEvent)
    }
    return result.result ?? {}
  }

  private async next(info: ConnectionInfo, event: ResponseEvent): Promise<void> {
    await this.broadcastEvent(event)
    await this.triggers.process(
      event,
      info,
      (events) => this.apply(info, events),
      (event) => this.execute(info, event)
    )
  }

  private async broadcastEvent(event: ResponseEvent): Promise<void> {
    const sessionIds: string[] = []
    for (const [sessionId, session] of this.dataBySessionId.entries()) {
      if (this.match(event, session)) {
        sessionIds.push(sessionId)
      }
    }

    if (sessionIds.length > 0) {
      try {
        this.broadcast(this.ctx, sessionIds, event)
      } catch (e) {
        console.error(e)
      }
    }
  }

  private match(event: ResponseEvent, info: SessionInfo): boolean {
    switch (event.type) {
      case ResponseEventType.MessageCreated:
        return this.matchMessagesQuery(
          { ids: [event.message.id], card: event.message.card },
          Array.from(info.messageQueries.values()),
          new Set(info.contextQueries.values().flatMap((it) => Array.from(it)))
        )
      case ResponseEventType.PatchCreated:
        return this.matchMessagesQuery(
          { card: event.card, ids: [event.patch.message] },
          Array.from(info.messageQueries.values()),
          new Set(info.contextQueries.values().flatMap((it) => Array.from(it)))
        )
      case ResponseEventType.MessagesRemoved:
        return this.matchMessagesQuery(
          { card: event.card, ids: event.messages },
          Array.from(info.messageQueries.values()),
          new Set(info.contextQueries.values().flatMap((it) => Array.from(it)))
        )
      case ResponseEventType.ReactionCreated:
        return this.matchMessagesQuery(
          { card: event.card, ids: [event.reaction.message] },
          Array.from(info.messageQueries.values()),
          new Set()
        )
      case ResponseEventType.ReactionRemoved:
        return this.matchMessagesQuery(
          { card: event.card, ids: [event.message] },
          Array.from(info.messageQueries.values()),
          new Set()
        )
      case ResponseEventType.FileCreated:
        return this.matchMessagesQuery(
          { card: event.card, ids: [event.file.message] },
          Array.from(info.messageQueries.values()),
          new Set()
        )
      case ResponseEventType.FileRemoved:
        return this.matchMessagesQuery(
          { card: event.card, ids: [event.message] },
          Array.from(info.messageQueries.values()),
          new Set()
        )
      case ResponseEventType.ThreadCreated:
        return this.matchMessagesQuery(
          { card: event.thread.card, ids: [event.thread.message] },
          Array.from(info.messageQueries.values()),
          new Set()
        )
      case ResponseEventType.NotificationCreated:
        return info.account === event.account
      case ResponseEventType.NotificationsRemoved:
        return info.account === event.account
      case ResponseEventType.NotificationContextCreated:
        return info.account === event.context.account
      case ResponseEventType.NotificationContextRemoved:
        return info.account === event.account
      case ResponseEventType.NotificationContextUpdated:
        return info.account === event.account
      case ResponseEventType.MessagesGroupCreated:
        return false
      case ResponseEventType.AddedCollaborators:
        return true
      case ResponseEventType.RemovedCollaborators:
        return true
      case ResponseEventType.ThreadUpdated:
        return false
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
