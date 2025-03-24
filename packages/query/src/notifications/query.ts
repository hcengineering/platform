//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License. You may
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
  type FindNotificationsParams,
  type Notification,
  SortingOrder,
  type WorkspaceID
} from '@hcengineering/communication-types'
import {
  type NotificationContextRemovedEvent,
  type NotificationContextUpdatedEvent,
  type NotificationCreatedEvent,
  type NotificationsRemovedEvent,
  type QueryCallback,
  type RequestEvent,
  type ResponseEvent,
  ResponseEventType
} from '@hcengineering/communication-sdk-types'

import { defaultQueryParams, type PagedQuery, type QueryId, type QueryClient } from '../types'
import { QueryResult } from '../result'
import { WindowImpl } from '../window'
import { loadMessageFromGroup } from '../utils'

export class NotificationQuery implements PagedQuery<Notification, FindNotificationsParams> {
  private result: QueryResult<Notification> | Promise<QueryResult<Notification>>

  constructor (
    private readonly client: QueryClient,
    private readonly workspace: WorkspaceID,
    private readonly filesUrl: string,
    public readonly id: QueryId,
    public readonly params: FindNotificationsParams,
    private callback?: QueryCallback<Notification>,
    initialResult?: QueryResult<Notification>
  ) {
    const limit = this.params.limit ?? defaultQueryParams.limit
    const findParams = { ...this.params, sort: this.params.order ?? defaultQueryParams.order, limit: limit + 1 }

    if (initialResult !== undefined) {
      this.result = initialResult
      void this.notify()
    } else {
      this.result = this.initResult(findParams, limit)
    }
  }

  private async initResult (findParams: FindNotificationsParams, limit: number): Promise<QueryResult<Notification>> {
    try {
      const res = await this.find(findParams)
      const isComplete = res.length <= limit
      if (!isComplete) res.pop()

      const result = new QueryResult(res, (it) => it.id)
      result.setTail(isComplete)
      result.setHead(isComplete)

      void this.notify()
      return result
    } catch (error) {
      console.error('Failed to initialize query:', error)
      return new QueryResult([] as Notification[], (it) => it.id)
    }
  }

  async onEvent (event: ResponseEvent): Promise<void> {
    switch (event.type) {
      case ResponseEventType.NotificationCreated:
      { await this.onCreateNotificationEvent(event); break }
      case ResponseEventType.NotificationsRemoved:
      { await this.onRemoveNotificationsEvent(event); break }
      case ResponseEventType.NotificationContextUpdated:
      { await this.onUpdateNotificationContextEvent(event); break }
      case ResponseEventType.NotificationContextRemoved:
      { await this.onRemoveNotificationContextEvent(event) }
    }
  }

  async onRequest (event: RequestEvent): Promise<void> {}

  async unsubscribe (): Promise<void> {
    await this.client.unsubscribeQuery(this.id)
  }

  async requestLoadNextPage (): Promise<void> {
    if (this.result instanceof Promise) this.result = await this.result

    await this.loadPage(SortingOrder.Ascending, this.result.getLast()?.created)
  }

  async requestLoadPrevPage (): Promise<void> {
    if (this.result instanceof Promise) this.result = await this.result
    await this.loadPage(SortingOrder.Descending, this.result.getFirst()?.created)
  }

  private async loadPage (order: SortingOrder, created?: Date): Promise<void> {
    if (!created) return
    if (this.result instanceof Promise) this.result = await this.result

    const limit = this.getLimit()
    const findParams: FindNotificationsParams = {
      ...this.params,
      created: order === SortingOrder.Ascending ? { greater: created } : { less: created },
      limit: limit + 1,
      order
    }

    try {
      const res = await this.find(findParams)
      const isComplete = res.length <= limit
      if (!isComplete) res.pop()

      if (order === SortingOrder.Ascending) {
        this.result.append(res)
        this.result.setTail(isComplete)
      } else {
        this.result.prepend(res)
        this.result.setHead(isComplete)
      }

      await this.notify()
    } catch (error) {
      console.error(`Failed to load ${order === SortingOrder.Ascending ? 'next' : 'previous'} page:`, error)
    }
  }

  removeCallback (): void {
    this.callback = () => {}
  }

  setCallback (callback: QueryCallback<Notification>): void {
    this.callback = callback
    void this.notify()
  }

  copyResult (): QueryResult<Notification> | undefined {
    return this.result instanceof Promise ? undefined : this.result.copy()
  }

  private async find (params: FindNotificationsParams): Promise<Notification[]> {
    const notifications = await this.client.findNotifications(params, this.id)
    if (!params.message) return notifications

    return await Promise.all(
      notifications.map(async (notification) => {
        if (notification.message || !notification.messageId) return notification
        const message = await loadMessageFromGroup(
          notification.messageId,
          this.workspace,
          this.filesUrl,
          notification.messageGroup,
          notification.patches
        )
        return message ? { ...notification, message } : notification
      })
    )
  }

  private async onCreateNotificationEvent (event: NotificationCreatedEvent): Promise<void> {
    if (this.result instanceof Promise) this.result = await this.result
    if (this.result.get(event.notification.id)) return
    if (!this.result.isTail()) return
    if (this.params.context && this.params.context !== event.notification.context) return

    const notifications = this.filterNotifications([event.notification])
    if (notifications.length === 0) return

    if (this.params.order === SortingOrder.Ascending) {
      this.result.push(event.notification)
    } else {
      this.result.unshift(event.notification)
    }

    await this.notify()
  }

  private async onUpdateNotificationContextEvent (event: NotificationContextUpdatedEvent): Promise<void> {
    if (this.result instanceof Promise) this.result = await this.result
    if (this.params.context != null && this.params.context !== event.context) return

    const lastView = event.lastView
    if (lastView === undefined) return

    const toUpdate = this.result.getResult().filter((it) => it.context === event.context)
    if (toUpdate.length === 0) return

    const updated: Notification[] = toUpdate.map((it) => ({
      ...it,
      read: lastView >= it.created
    }))
    const filtered = this.filterNotifications(updated)

    if (filtered.length < this.getLimit() && filtered.length < toUpdate.length) {
      if (this.result.length < this.getLimit()) {
        for (const notification of updated) {
          const allowed = filtered.some((it) => it.messageId === notification.messageId)
          if (allowed) {
            this.result.update(notification)
          } else {
            this.result.delete(notification.id)
          }
        }
        void this.notify()
      } else {
        await this.reinit(this.result.length)
      }
    } else {
      for (const notification of filtered) {
        this.result.update(notification)
      }
      void this.notify()
    }
  }

  private async onRemoveNotificationsEvent (event: NotificationsRemovedEvent): Promise<void> {
    if (this.result instanceof Promise) this.result = await this.result

    const notifications = this.result.getResult()
    const length = this.result.length
    let isDeleted = false

    for (const notification of notifications) {
      if (notification.created <= event.untilDate) {
        isDeleted = true
        this.result.delete(notification.id)
      }
    }

    if (length >= this.getLimit() && this.result.length < this.getLimit()) {
      void this.reinit(this.result.length)
    } else if (isDeleted) {
      void this.notify()
    }
  }

  private async onRemoveNotificationContextEvent (event: NotificationContextRemovedEvent): Promise<void> {
    if (this.result instanceof Promise) this.result = await this.result

    if (this.params.context != null && this.params.context !== event.context) return

    if (event.context === this.params.context) {
      if (this.result.length === 0) return
      this.result.deleteAll()
      this.result.setHead(true)
      this.result.setTail(true)
      void this.notify()
    } else {
      const toRemove = this.result.getResult().filter((it) => it.context === event.context)
      if (toRemove.length === 0) return
      const length = this.result.length

      for (const notification of toRemove) {
        this.result.delete(notification.id)
      }

      if (length >= this.getLimit() && this.result.length < this.getLimit()) {
        void this.reinit(this.result.length)
      } else {
        void this.notify()
      }
    }
  }

  private async notify (): Promise<void> {
    if (!this.callback) return
    if (this.result instanceof Promise) this.result = await this.result

    const window = new WindowImpl(this.result.getResult(), this.result.isTail(), this.result.isHead(), this)
    this.callback(window)
  }

  private getLimit (): number {
    return this.params.limit ?? defaultQueryParams.limit
  }

  private filterNotifications (notifications: Notification[]): Notification[] {
    const read = this.params.read
    if (read == null) return notifications

    return notifications.filter((it) => it.read === read)
  }

  private async reinit (limit: number): Promise<void> {
    if (this.result instanceof Promise) this.result = await this.result
    this.result = this.find({ ...this.params, limit: limit + 1 }).then((res) => {
      const isTail = res.length <= limit
      const isHead = res.length <= limit
      if (res.length > limit) {
        res.pop()
      }

      const result = new QueryResult(res, (it) => it.id)
      result.setHead(isHead)
      result.setTail(isTail)
      return result
    })
    void this.result.then((res) => {
      void this.notify()
      return res
    })
  }
}
