import { type FindMessagesParams, type FindNotificationsParams } from '@hcengineering/communication-types'
import { deepEqual } from 'fast-equals'
import type {
  Client,
  MessagesQueryCallback,
  NotificationsQueryCallback,
  BroadcastEvent
} from '@hcengineering/communication-sdk-types'

import type { Query, QueryId } from './types'
import { MessagesQuery } from './messages/query'
import { NotificationQuery } from './notifications/query'

interface CreateQueryResult {
  unsubscribe: () => void
}

const maxQueriesCache = 10

export class LiveQueries {
  private readonly client: Client
  private readonly queries = new Map<QueryId, Query>()
  private readonly unsubscribed = new Set<QueryId>()
  private counter: number = 0

  constructor(client: Client) {
    this.client = client
  }

  async onEvent(event: BroadcastEvent): Promise<void> {
    for (const q of this.queries.values()) {
      await q.onEvent(event)
    }
  }

  queryMessages(params: FindMessagesParams, callback: MessagesQueryCallback): CreateQueryResult {
    const query = this.createMessagesQuery(params, callback)
    this.queries.set(query.id, query)

    return {
      unsubscribe: () => {
        this.unsubscribeQuery(query)
      }
    }
  }

  queryNotifications(params: FindNotificationsParams, callback: NotificationsQueryCallback): CreateQueryResult {
    const query = this.createNotificationQuery(params, callback)
    this.queries.set(query.id, query)

    return {
      unsubscribe: () => {
        this.unsubscribeQuery(query)
      }
    }
  }

  private createMessagesQuery(params: FindMessagesParams, callback: MessagesQueryCallback): MessagesQuery {
    const id = ++this.counter
    const exists = this.findMessagesQuery(params)

    if (exists !== undefined) {
      if (this.unsubscribed.has(id)) {
        this.unsubscribed.delete(id)
        exists.setCallback(callback)
        return exists
      } else {
        const result = exists.copyResult()
        return new MessagesQuery(this.client, id, params, callback, result)
      }
    }

    return new MessagesQuery(this.client, id, params, callback)
  }

  private createNotificationQuery(
    params: FindNotificationsParams,
    callback: NotificationsQueryCallback
  ): NotificationQuery {
    const id = ++this.counter
    const exists = this.findNotificationQuery(params)

    if (exists !== undefined) {
      if (this.unsubscribed.has(id)) {
        this.unsubscribed.delete(id)
        exists.setCallback(callback)
        return exists
      } else {
        const result = exists.copyResult()
        return new NotificationQuery(this.client, id, params, callback, result)
      }
    }

    return new NotificationQuery(this.client, id, params, callback)
  }

  private findMessagesQuery(params: FindMessagesParams): MessagesQuery | undefined {
    for (const query of this.queries.values()) {
      if (query instanceof MessagesQuery) {
        if (!this.queryCompare(params, query.params)) continue
        return query
      }
    }
  }

  private findNotificationQuery(params: FindMessagesParams): NotificationQuery | undefined {
    for (const query of this.queries.values()) {
      if (query instanceof NotificationQuery) {
        if (!this.queryCompare(params, query.params)) continue
        return query
      }
    }
  }

  private queryCompare(q1: FindMessagesParams, q2: FindMessagesParams): boolean {
    if (Object.keys(q1).length !== Object.keys(q2).length) {
      return false
    }
    return deepEqual(q1, q2)
  }

  private removeOldQueries(): void {
    const unsubscribed = Array.from(this.unsubscribed)
    for (let i = 0; i < this.unsubscribed.size / 2; i++) {
      const id = unsubscribed.shift()
      if (id === undefined) return
      this.unsubscribe(id)
    }
  }

  private unsubscribe(id: QueryId): void {
    const query = this.queries.get(id)
    if (query == null) return
    void query.unsubscribe()
    this.queries.delete(id)
    this.unsubscribed.delete(id)
  }

  private unsubscribeQuery(query: Query): void {
    this.unsubscribed.add(query.id)
    query.removeCallback()
    if (this.unsubscribed.size > maxQueriesCache) {
      this.removeOldQueries()
    }
  }

  close(): void {
    this.queries.clear()
  }
}
