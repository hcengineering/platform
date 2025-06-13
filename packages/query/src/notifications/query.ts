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
  type CardID,
  type FindNotificationsParams,
  type Message,
  type MessageID,
  type Notification,
  NotificationType,
  PatchType,
  SortingOrder,
  type WorkspaceID
} from '@hcengineering/communication-types'
import {
  type CardRemovedEvent,
  CardResponseEventType,
  type BlobAttachedEvent,
  type BlobDetachedEvent,
  type FindClient,
  MessageResponseEventType,
  type NotificationContextRemovedEvent,
  type NotificationContextUpdatedEvent,
  type NotificationCreatedEvent,
  NotificationResponseEventType,
  type NotificationsRemovedEvent,
  type NotificationUpdatedEvent,
  type PagedQueryCallback,
  type PatchCreatedEvent,
  type RequestEvent,
  type ResponseEvent,
  type ThreadAttachedEvent,
  type ThreadUpdatedEvent
} from '@hcengineering/communication-sdk-types'
import { applyPatch } from '@hcengineering/communication-shared'

import { defaultQueryParams, type PagedQuery, type QueryId } from '../types'
import { QueryResult } from '../result'
import { WindowImpl } from '../window'
import { attachBlob, attachThread, loadMessageFromGroup, matchNotification, detachBlob, updateThread } from '../utils'

const allowedPatchTypes = [
  PatchType.update,
  PatchType.remove,
  PatchType.attachBlob,
  PatchType.detachBlob,
  PatchType.updateThread
]

export class NotificationQuery implements PagedQuery<Notification, FindNotificationsParams> {
  private result: QueryResult<Notification> | Promise<QueryResult<Notification>>

  constructor (
    private readonly client: FindClient,
    private readonly workspace: WorkspaceID,
    private readonly filesUrl: string,
    public readonly id: QueryId,
    public readonly params: FindNotificationsParams,
    private callback?: PagedQueryCallback<Notification>,
    initialResult?: QueryResult<Notification>
  ) {
    const limit = this.params.limit ?? defaultQueryParams.limit
    const findParams: FindNotificationsParams = {
      ...this.params,
      order: this.params.order ?? defaultQueryParams.order,
      limit: limit + 1
    }

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
      case NotificationResponseEventType.NotificationCreated: {
        await this.onCreateNotificationEvent(event)
        break
      }
      case NotificationResponseEventType.NotificationsRemoved: {
        await this.onRemoveNotificationsEvent(event)
        break
      }
      case NotificationResponseEventType.NotificationUpdated: {
        await this.onUpdateNotificationEvent(event)
        break
      }
      case NotificationResponseEventType.NotificationContextUpdated: {
        await this.onUpdateNotificationContextEvent(event)
        break
      }
      case NotificationResponseEventType.NotificationContextRemoved:
        await this.onRemoveNotificationContextEvent(event)
        break
      case MessageResponseEventType.PatchCreated:
        await this.onCreatePatchEvent(event)
        break
      case MessageResponseEventType.BlobAttached:
        await this.onBlobAttached(event)
        break
      case MessageResponseEventType.BlobDetached:
        await this.onBlobDetached(event)
        break
      case MessageResponseEventType.ThreadAttached:
        await this.onThreadAttached(event)
        break
      case MessageResponseEventType.ThreadUpdated:
        await this.onThreadUpdated(event)
        break
      case CardResponseEventType.CardRemoved:
        await this.onCardRemoved(event)
        break
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
    if (created == null) return
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

  setCallback (callback: PagedQueryCallback<Notification>): void {
    this.callback = callback
    void this.notify()
  }

  copyResult (): QueryResult<Notification> | undefined {
    return this.result instanceof Promise ? undefined : this.result.copy()
  }

  private async find (params: FindNotificationsParams): Promise<Notification[]> {
    const notifications = await this.client.findNotifications(params, this.id)
    if (params.message !== true) return notifications

    return await Promise.all(
      notifications.map(async (notification) => {
        if (notification.message != null) return notification
        const message = await loadMessageFromGroup(
          notification.messageId,
          this.workspace,
          this.filesUrl,
          notification.messageGroup,
          notification.patches
        )
        return message != null ? { ...notification, message } : notification
      })
    )
  }

  private async onCreateNotificationEvent (event: NotificationCreatedEvent): Promise<void> {
    if (this.result instanceof Promise) this.result = await this.result
    if (this.result.get(event.notification.id) != null) return
    if (!this.result.isTail()) return

    const match = matchNotification(event.notification, { ...this.params, created: undefined })
    if (!match) return

    if (this.params.order === SortingOrder.Ascending) {
      this.result.push(event.notification)
    } else {
      this.result.unshift(event.notification)
    }

    await this.notify()
  }

  private async onUpdateNotificationContextEvent (event: NotificationContextUpdatedEvent): Promise<void> {
    if (this.result instanceof Promise) this.result = await this.result
    if (this.params.context != null && this.params.context !== event.contextId) return

    const lastView = event.lastView
    if (lastView === undefined) return

    const toUpdate = this.result.getResult().filter((it) => it.contextId === event.contextId)
    if (toUpdate.length === 0) return

    const updated: Notification[] = toUpdate.map((it) => ({
      ...it,
      read: it.type === NotificationType.Message ? lastView >= it.created : it.read
    }))

    await this.updateNotificationRead(this.result, updated)
  }

  private async updateNotificationRead (result: QueryResult<Notification>, updated: Notification[]): Promise<void> {
    const isAllowed = (n: Notification): boolean => {
      if (this.params.read == null) return true
      return n.read === this.params.read
    }
    const currentLength = result.length
    for (const notification of updated) {
      if (isAllowed(notification)) {
        result.update(notification)
      } else {
        result.delete(notification.id)
      }
    }

    const newLength = result.length

    if (currentLength !== newLength && currentLength >= this.getLimit() && newLength < this.getLimit()) {
      await this.reinit(currentLength)
    } else {
      void this.notify()
    }
  }

  private async onUpdateNotificationEvent (event: NotificationUpdatedEvent): Promise<void> {
    if (this.result instanceof Promise) this.result = await this.result

    const toUpdate = (
      event.query.id != null
        ? [this.result.get(event.query.id)].filter((it): it is Notification => it != null)
        : this.result.getResult().filter((it) => matchNotification(it, event.query))
    ).filter((it) => it.read !== event.updates.read)
    if (toUpdate === undefined || toUpdate.length === 0) return
    const updated = toUpdate.map((it) => ({ ...it, ...event.updates }))
    await this.updateNotificationRead(this.result, updated)
  }

  private async onRemoveNotificationsEvent (event: NotificationsRemovedEvent): Promise<void> {
    if (this.params.context !== undefined && this.params.context !== event.contextId) return
    if (this.result instanceof Promise) this.result = await this.result

    const currentLength = this.result.length
    let isDeleted = false

    for (const id of event.ids) {
      const deleted = this.result.delete(id)
      isDeleted = isDeleted || deleted !== undefined
    }

    const newLength = this.result.length

    if (currentLength >= this.getLimit() && newLength < this.getLimit()) {
      void this.reinit(currentLength)
    } else if (isDeleted) {
      void this.notify()
    }
  }

  private async onRemoveNotificationContextEvent (event: NotificationContextRemovedEvent): Promise<void> {
    if (this.result instanceof Promise) this.result = await this.result

    if (this.params.context != null && this.params.context !== event.context.id) return

    if (event.context.id === this.params.context) {
      if (this.result.length === 0) return
      this.result.deleteAll()
      this.result.setHead(true)
      this.result.setTail(true)
      void this.notify()
    } else {
      const toRemove = this.result.getResult().filter((it) => it.contextId === event.context.id)
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

  private async onCreatePatchEvent (event: PatchCreatedEvent): Promise<void> {
    if (this.params.message !== true) return
    const isUpdated = await this.updateMessage(
      (it) => this.matchNotificationByMessage(it, event.cardId, event.patch.messageId),
      (message) => applyPatch(message, event.patch, allowedPatchTypes)
    )
    if (isUpdated) {
      void this.notify()
    }
  }

  private async onBlobAttached (event: BlobAttachedEvent): Promise<void> {
    if (this.params.message !== true) return
    const isUpdated = await this.updateMessage(
      (it) => this.matchNotificationByMessage(it, event.cardId, event.messageId),
      (message) => attachBlob(message, event.blob)
    )
    if (isUpdated) {
      void this.notify()
    }
  }

  private async onBlobDetached (event: BlobDetachedEvent): Promise<void> {
    if (this.params.message !== true) return
    const isUpdated = await this.updateMessage(
      (it) => this.matchNotificationByMessage(it, event.cardId, event.messageId),
      (message) => detachBlob(message, event.blobId)
    )
    if (isUpdated) {
      void this.notify()
    }
  }

  private async onThreadAttached (event: ThreadAttachedEvent): Promise<void> {
    if (this.params.message !== true) return
    const isUpdated = await this.updateMessage(
      (it) => this.matchNotificationByMessage(it, event.thread.cardId, event.thread.messageId),
      (message) =>
        attachThread(
          message,
          event.thread.threadId,
          event.thread.threadType,
          event.thread.repliesCount,
          event.thread.lastReply
        )
    )
    if (isUpdated) {
      void this.notify()
    }
  }

  private async onThreadUpdated (event: ThreadUpdatedEvent): Promise<void> {
    if (this.params.message !== true) return
    const isUpdated = await this.updateMessage(
      (it) => this.matchNotificationByMessage(it, event.cardId, event.messageId),
      (message) => updateThread(message, event.threadId, event.updates.repliesCountOp, event.updates.lastReply)
    )
    if (isUpdated) {
      void this.notify()
    }
  }

  private async onCardRemoved (event: CardRemovedEvent): Promise<void> {
    if (this.params.message !== true) return
    if (this.result instanceof Promise) this.result = await this.result
    const isUpdated = await this.updateMessage(
      (it) => it.message != null && it.message.thread?.threadId === event.cardId,
      (message) => ({ ...message, thread: undefined })
    )
    if (isUpdated) {
      void this.notify()
    }
  }

  private async notify (): Promise<void> {
    if (this.callback == null) return
    if (this.result instanceof Promise) this.result = await this.result

    const window = new WindowImpl(this.result.getResult(), this.result.isTail(), this.result.isHead(), this)
    this.callback(window)
  }

  private getLimit (): number {
    return this.params.limit ?? defaultQueryParams.limit
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

  private matchNotificationByMessage (notification: Notification, card: CardID, messageId: MessageID): boolean {
    return notification.messageId === messageId && notification.message != null && notification.message.cardId === card
  }

  private async updateMessage (
    matchFn: (notification: Notification) => boolean,
    updater: (message: Message) => Message
  ): Promise<boolean> {
    if (this.params.message !== true) return false
    if (this.result instanceof Promise) this.result = await this.result

    const result = this.result.getResult()
    let isUpdated = false
    for (const notification of result) {
      const isMatched = matchFn(notification)
      if (!isMatched) continue
      isUpdated = true
      this.result.update({
        ...notification,
        message: notification.message != null ? updater(notification.message) : notification.message
      })
    }

    return isUpdated
  }
}
