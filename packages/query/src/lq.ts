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
  type FindMessagesParams,
  type FindNotificationContextParams,
  type FindNotificationsParams,
  type Message,
  type WorkspaceID,
  type Notification,
  type NotificationContext,
  type Label,
  type FindLabelsParams
} from '@hcengineering/communication-types'
import { deepEqual } from 'fast-equals'
import type {
  ResponseEvent,
  QueryCallback,
  RequestEvent,
  EventResult,
  PagedQueryCallback,
  FindClient
} from '@hcengineering/communication-sdk-types'

import type { FindParams, QueryId, AnyQuery, MessageQueryParams } from './types'
import { MessagesQuery } from './messages/query'
import { NotificationQuery } from './notifications/query'
import { NotificationContextsQuery } from './notification-contexts/query'
import { LabelsQuery } from './label/query'

interface CreateQueryResult {
  unsubscribe: () => void
}

const maxQueriesCache = 40

export class LiveQueries {
  private readonly queries = new Map<QueryId, AnyQuery>()
  private readonly unsubscribed = new Set<QueryId>()
  private counter: number = 0

  constructor(
    private readonly client: FindClient,
    private readonly workspace: WorkspaceID,
    private readonly filesUrl: string
  ) {
    this.client.onEvent = (event) => {
      void this.onEvent(event)
    }
    this.client.onRequest = (event, promise) => {
      void this.onRequest(event, promise)
    }
  }

  async onEvent(event: ResponseEvent): Promise<void> {
    for (const q of this.queries.values()) {
      void q.onEvent(event)
    }
  }

  async onRequest(event: RequestEvent, promise: Promise<EventResult>): Promise<void> {
    for (const q of this.queries.values()) {
      void q.onRequest(event, promise)
    }
  }

  queryMessages(params: MessageQueryParams, callback: PagedQueryCallback<Message>): CreateQueryResult {
    return this.createAndStoreQuery<Message, FindMessagesParams, MessagesQuery>(
      params,
      callback,
      MessagesQuery,
      (params) => this.findMessagesQuery(params)
    )
  }

  queryNotifications(params: FindNotificationsParams, callback: PagedQueryCallback<Notification>): CreateQueryResult {
    return this.createAndStoreQuery<Notification, FindNotificationsParams, NotificationQuery>(
      params,
      callback,
      NotificationQuery,
      (params) => this.findNotificationQuery(params)
    )
  }

  queryNotificationContexts(params: FindNotificationContextParams, callback: any): CreateQueryResult {
    return this.createAndStoreQuery<NotificationContext, FindNotificationContextParams, NotificationContextsQuery>(
      params,
      callback,
      NotificationContextsQuery,
      (params) => this.findNotificationContextsQuery(params)
    )
  }

  queryLabels(params: FindLabelsParams, callback: any): CreateQueryResult {
    return this.createAndStoreQuery<Label, FindLabelsParams, LabelsQuery>(params, callback, LabelsQuery, (params) =>
      this.findLabelsQuery(params)
    )
  }

  private createAndStoreQuery<T, P extends FindParams, Q extends AnyQuery>(
    params: P,
    callback: QueryCallback<T> | PagedQueryCallback<T>,
    QueryClass: new (...args: any[]) => Q,
    finder: (params: P) => Q | undefined
  ): CreateQueryResult {
    const query = this.createQuery<P, Q>(params, callback, QueryClass, finder)
    this.queries.set(query.id, query)

    return {
      unsubscribe: () => {
        this.unsubscribeQuery(query)
      }
    }
  }

  private createQuery<P, Q extends AnyQuery>(
    params: P,
    callback: any,
    QueryClass: new (...args: any[]) => Q,
    finder: (params: P) => Q | undefined
  ): Q {
    const id = ++this.counter
    const exists = finder(params)

    if (exists !== undefined) {
      if (this.unsubscribed.has(exists.id)) {
        this.unsubscribed.delete(exists.id)
        exists.setCallback(callback)
        return exists
      } else {
        const result = exists.copyResult()
        return new QueryClass(this.client, this.workspace, this.filesUrl, id, params, callback, result)
      }
    }

    return new QueryClass(this.client, this.workspace, this.filesUrl, id, params, callback)
  }

  private findQuery<T extends AnyQuery>(params: FindParams, QueryClass: new (...args: any[]) => T): T | undefined {
    for (const query of this.queries.values()) {
      if (query instanceof QueryClass && this.queryCompare(params, query.params)) {
        return query as T
      }
    }
  }

  private findMessagesQuery(params: FindMessagesParams): MessagesQuery | undefined {
    return this.findQuery(params, MessagesQuery)
  }

  private findNotificationQuery(params: FindNotificationsParams): NotificationQuery | undefined {
    return this.findQuery(params, NotificationQuery)
  }

  private findNotificationContextsQuery(params: FindNotificationContextParams): NotificationContextsQuery | undefined {
    return this.findQuery(params, NotificationContextsQuery)
  }

  private findLabelsQuery(params: FindLabelsParams): LabelsQuery | undefined {
    return this.findQuery(params, LabelsQuery)
  }

  private queryCompare(q1: FindParams, q2: FindParams): boolean {
    return Object.keys(q1).length === Object.keys(q2).length && deepEqual(q1, q2)
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

  private unsubscribeQuery(query: AnyQuery): void {
    this.unsubscribed.add(query.id)
    query.removeCallback()
    if (this.unsubscribed.size > maxQueriesCache) {
      this.removeOldQueries()
    }
  }

  close(): void {
    this.queries.clear()
    this.unsubscribed.clear()
  }
}
