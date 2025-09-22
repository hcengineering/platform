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
  type FindNotificationContextParams,
  type FindNotificationsParams,
  type Message,
  type Notification,
  type NotificationContext,
  type Label,
  type FindLabelsParams,
  FindCollaboratorsParams,
  Collaborator
} from '@hcengineering/communication-types'
import { deepEqual } from 'fast-equals'
import type {
  QueryCallback,
  Event,
  EventResult,
  PagedQueryCallback,
  FindClient
} from '@hcengineering/communication-sdk-types'
import { HulylakeClient } from '@hcengineering/hulylake-client'

import type { FindParams, QueryId, AnyQuery, MessageQueryParams, QueryOptions, MessageQueryOptions, NotificationContextQueryOptions } from './types'
import { MessagesQuery } from './messages/query'
import { NotificationQuery } from './notifications/query'
import { NotificationContextsQuery } from './notification-contexts/query'
import { LabelsQuery } from './label/query'
import { CollaboratorsQuery } from './collaborators/query'

interface CreateQueryResult {
  unsubscribe: (force: boolean) => void
}

const maxQueriesCache = 100

export class LiveQueries {
  private readonly queries = new Map<QueryId, AnyQuery>()
  private readonly unsubscribed = new Map<QueryId, number>()
  private counter: number = 0
  private eventQueue: Promise<void> = Promise.resolve()

  constructor (
    private readonly client: FindClient,
    private readonly hulylake: HulylakeClient
  ) {
    this.client.onEvent = (event) => {
      this.eventQueue = this.eventQueue
        .then(() => this.onEvent(event))
        .catch(err => {
          console.error('Error handling event:', err)
        })
    }
    this.client.onRequest = (event, promise) => {
      void this.onRequest(event, promise)
    }
  }

  async onEvent (event: Event): Promise<void> {
    await Promise.all(Array.from(this.queries.values()).map(q => q.onEvent(event)))
  }

  async onRequest (event: Event, promise: Promise<EventResult>): Promise<void> {
    for (const q of this.queries.values()) {
      void q.onRequest(event, promise)
    }
  }

  queryMessages (params: MessageQueryParams, callback: PagedQueryCallback<Message>, options?: MessageQueryOptions): CreateQueryResult {
    return this.createAndStoreQuery<Message, MessageQueryParams, MessagesQuery>(
      params,
      callback,
      options,
      MessagesQuery,
      (params) => this.findMessagesQuery(params, options)
    )
  }

  queryNotifications (params: FindNotificationsParams, callback: PagedQueryCallback<Notification>): CreateQueryResult {
    return this.createAndStoreQuery<Notification, FindNotificationsParams, NotificationQuery>(
      params,
      callback,
      undefined,
      NotificationQuery,
      (params) => this.findNotificationQuery(params)
    )
  }

  queryNotificationContexts (params: FindNotificationContextParams, callback: any, options?: NotificationContextQueryOptions): CreateQueryResult {
    return this.createAndStoreQuery<NotificationContext, FindNotificationContextParams, NotificationContextsQuery>(
      params,
      callback,
      options,
      NotificationContextsQuery,
      (params) => this.findNotificationContextsQuery(params)
    )
  }

  queryLabels (params: FindLabelsParams, callback: any): CreateQueryResult {
    return this.createAndStoreQuery<Label, FindLabelsParams, LabelsQuery>(params, callback, undefined, LabelsQuery, (params) =>
      this.findLabelsQuery(params)
    )
  }

  queryCollaborators (params: FindCollaboratorsParams, callback: any): CreateQueryResult {
    return this.createAndStoreQuery<Collaborator, FindCollaboratorsParams, CollaboratorsQuery>(params, callback, undefined, CollaboratorsQuery, (params) =>
      this.findCollaboratorsQuery(params)
    )
  }

  private createAndStoreQuery<T, P extends FindParams, Q extends AnyQuery>(
    params: P,
    callback: QueryCallback<T> | PagedQueryCallback<T>,
    options: QueryOptions | undefined,
    QueryClass: new (...args: any[]) => Q,
    finder: (params: P) => Q | undefined
  ): CreateQueryResult {
    const query = this.findOrCreateQuery<P, Q>(params, callback, options, QueryClass, finder)
    this.queries.set(query.id, query)

    return {
      unsubscribe: (force) => {
        this.unsubscribeQuery(query, force)
      }
    }
  }

  private findOrCreateQuery<P, Q extends AnyQuery>(
    params: P,
    callback: any,
    options: QueryOptions | undefined,
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

        return new QueryClass(this.client, this.hulylake, id, params, options, callback, result)
      }
    }

    return new QueryClass(this.client, this.hulylake, id, params, options, callback, undefined)
  }

  private findQuery<T extends AnyQuery>(params: FindParams, QueryClass: new (...args: any[]) => T, options?: QueryOptions): T | undefined {
    for (const query of this.queries.values()) {
      if (query instanceof QueryClass && this.compareParams(params, query.params) && this.compareOptions(options, query.options)) {
        return query
      }
    }
  }

  private findMessagesQuery (params: MessageQueryParams, options?: MessageQueryOptions): MessagesQuery | undefined {
    return this.findQuery(params, MessagesQuery, options)
  }

  private findNotificationQuery (params: FindNotificationsParams): NotificationQuery | undefined {
    return this.findQuery(params, NotificationQuery)
  }

  private findNotificationContextsQuery (params: FindNotificationContextParams): NotificationContextsQuery | undefined {
    return this.findQuery(params, NotificationContextsQuery)
  }

  private findLabelsQuery (params: FindLabelsParams): LabelsQuery | undefined {
    return this.findQuery(params, LabelsQuery)
  }

  private findCollaboratorsQuery (params: FindCollaboratorsParams): CollaboratorsQuery | undefined {
    return this.findQuery(params, CollaboratorsQuery)
  }

  private compareParams (q1: FindParams, q2: FindParams): boolean {
    return Object.keys(q1).length === Object.keys(q2).length && deepEqual(q1, q2)
  }

  private compareOptions (q1: QueryOptions | undefined, q2: QueryOptions | undefined): boolean {
    return Object.keys(q1 ?? {}).length === Object.keys(q2 ?? {}).length && deepEqual(q1, q2)
  }

  private removeOldQueries (): void {
    const unsubscribed: [QueryId, number][] = Array.from(this.unsubscribed).sort((a, b) => a[1] - b[1])

    for (let i = 0; i < this.unsubscribed.size / 2; i++) {
      const u: [QueryId, number] | undefined = unsubscribed.shift()
      if (u === undefined) return
      this.unsubscribe(u[0])
    }
  }

  private unsubscribe (id: QueryId): void {
    const query = this.queries.get(id)
    if (query == null) return
    void query.unsubscribe()
    this.queries.delete(id)
    this.unsubscribed.delete(id)
  }

  private unsubscribeQuery (query: AnyQuery, force: boolean = false): void {
    this.unsubscribed.set(query.id, Date.now())
    query.removeCallback()
    if (this.unsubscribed.size > maxQueriesCache) {
      this.removeOldQueries()
    }
    if (force) {
      this.unsubscribe(query.id)
    }
  }

  close (): void {
    this.queries.clear()
    this.unsubscribed.clear()
  }

  async refresh (): Promise<void> {
    for (const [id, query] of this.queries.entries()) {
      if (this.unsubscribed.has(id)) {
        this.unsubscribe(id)
        continue
      }

      try {
        await query.refresh()
      } catch (e) {
        console.error('Failed to refresh live query', e, query.id, query.params)
      }
    }
  }
}
