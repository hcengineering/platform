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
  type Notification,
  type NotificationContext,
  PatchType,
  SortingOrder,
  type WorkspaceID
} from '@hcengineering/communication-types'
import {
  type MessagesRemovedEvent,
  type NotificationContextCreatedEvent,
  type NotificationContextRemovedEvent,
  type NotificationContextUpdatedEvent,
  type NotificationCreatedEvent,
  type NotificationsRemovedEvent,
  type PatchCreatedEvent,
  type QueryCallback,
  type RequestEvent,
  type ResponseEvent,
  ResponseEventType
} from '@hcengineering/communication-sdk-types'
import { applyPatch } from '@hcengineering/communication-shared'

import { defaultQueryParams, type PagedQuery, type QueryId, type QueryClient } from '../types'
import { QueryResult } from '../result'
import { WindowImpl } from '../window'
import { loadMessageFromGroup } from '../utils'

const allowedPatchTypes = [PatchType.update, PatchType.addReaction, PatchType.removeReaction]

export class NotificationContextsQuery implements PagedQuery<NotificationContext, FindNotificationContextParams> {
  private result: QueryResult<NotificationContext> | Promise<QueryResult<NotificationContext>>
  private forward: Promise<NotificationContext[]> | NotificationContext[] = []
  private backward: Promise<NotificationContext[]> | NotificationContext[] = []

  constructor (
    private readonly client: QueryClient,
    private readonly workspace: WorkspaceID,
    private readonly filesUrl: string,
    public readonly id: QueryId,
    public readonly params: FindNotificationContextParams,
    private callback?: QueryCallback<NotificationContext>,
    initialResult?: QueryResult<NotificationContext>
  ) {
    this.params = {
      ...params,
      limit: params.limit,
      order: params.order ?? defaultQueryParams.order
    }
    const limit = params.limit != null ? params.limit + 1 : undefined
    const findParams = {
      ...this.params,
      sort: this.params.order ?? defaultQueryParams.order,
      limit
    }

    if (initialResult !== undefined) {
      this.result = initialResult
      void this.notify()
    } else {
      const findPromise = this.find(findParams)
      this.result = findPromise.then((res) => {
        const allLoaded = limit == null || res.length <= limit
        const isTail = allLoaded || params.lastUpdate == null
        const isHead = allLoaded
        if (limit != null && res.length > limit) {
          res.pop()
        }
        const qResult = new QueryResult(res, (x) => x.id)
        qResult.setTail(isTail)
        qResult.setHead(isHead)

        return qResult
      })
      this.result
        .then(async () => {
          await this.notify()
        })
        .catch((err: any) => {
          console.error('Failed to update Live query: ', err)
        })
    }
  }

  async onEvent (event: ResponseEvent): Promise<void> {
    switch (event.type) {
      case ResponseEventType.PatchCreated: {
        await this.onCreatePatchEvent(event)
        break
      }
      case ResponseEventType.MessagesRemoved: {
        await this.onMessagesRemovedEvent(event)
        break
      }
      case ResponseEventType.NotificationCreated: {
        await this.onCreateNotificationEvent(event)
        break
      }
      case ResponseEventType.NotificationsRemoved: {
        await this.onRemoveNotificationEvent(event)
        break
      }
      case ResponseEventType.NotificationContextCreated: {
        await this.onCreateNotificationContextEvent(event)
        break
      }
      case ResponseEventType.NotificationContextUpdated: {
        await this.onUpdateNotificationContextEvent(event)
        break
      }
      case ResponseEventType.NotificationContextRemoved: {
        await this.onRemoveNotificationContextEvent(event)
      }
    }
  }

  async onRequest (event: RequestEvent): Promise<void> {}

  async unsubscribe (): Promise<void> {
    await this.client.unsubscribeQuery(this.id)
  }

  async requestLoadNextPage (): Promise<void> {
    if (this.result instanceof Promise) {
      this.result = await this.result
    }
    if (this.forward instanceof Promise) {
      this.forward = await this.forward
    }

    if (this.result.isTail()) return

    const last = this.result.getLast()
    if (last === undefined) return

    const limit = this.params.limit ?? defaultQueryParams.limit
    const findParams: FindNotificationContextParams = {
      ...this.params,
      lastUpdate: {
        greater: last.lastUpdate
      },
      limit: limit + 1,
      order: SortingOrder.Ascending
    }

    const forward = this.find(findParams)

    this.forward = forward.then(async (res) => {
      if (this.result instanceof Promise) {
        this.result = await this.result
      }
      const isTail = res.length <= limit
      if (!isTail) {
        res.pop()
      }
      this.result.append(res)
      this.result.setTail(isTail)
      await this.notify()
      return res
    })
  }

  async requestLoadPrevPage (): Promise<void> {
    if (this.result instanceof Promise) {
      this.result = await this.result
    }
    if (this.backward instanceof Promise) {
      this.backward = await this.backward
    }

    if (this.result.isHead()) return

    const first = this.params.order === SortingOrder.Ascending ? this.result.getFirst() : this.result.getLast()
    if (first === undefined) return

    const limit = this.params.limit ?? defaultQueryParams.limit
    const findParams: FindNotificationContextParams = {
      ...this.params,
      lastUpdate: {
        less: first.lastUpdate
      },
      limit: limit + 1,
      order: SortingOrder.Descending
    }

    const backward = this.find(findParams)
    this.backward = backward.then(async (res) => {
      if (this.result instanceof Promise) {
        this.result = await this.result
      }
      const isHead = res.length <= limit
      if (!isHead) {
        res.pop()
      }

      if (this.params.order === SortingOrder.Ascending) {
        const reversed = res.reverse()
        this.result.prepend(reversed)
      } else {
        this.result.append(res)
      }
      this.result.setHead(isHead)
      await this.notify()
      return res
    })
  }

  removeCallback (): void {
    this.callback = () => {}
  }

  setCallback (callback: QueryCallback<NotificationContext>): void {
    this.callback = callback
    void this.notify()
  }

  copyResult (): QueryResult<NotificationContext> | undefined {
    if (this.result instanceof Promise) {
      return undefined
    }

    return this.result.copy()
  }

  private async find (params: FindNotificationContextParams): Promise<NotificationContext[]> {
    const contexts = await this.client.findNotificationContexts(params, this.id)
    if (params.notifications?.message !== true) return contexts

    await Promise.all(
      contexts.map(async (context) => {
        const notifications = context.notifications ?? []

        context.notifications = await Promise.all(
          notifications.map(async (notification) => {
            if (notification.message != null || notification.messageId == null) return notification

            const message = await loadMessageFromGroup(
              notification.messageId,
              this.workspace,
              this.filesUrl,
              notification.messageGroup,
              notification.patches
            )
            if (message !== undefined) {
              return {
                ...notification,
                message
              }
            }

            return notification
          })
        )
        return context
      })
    )

    return contexts
  }

  private async onCreateNotificationContextEvent (event: NotificationContextCreatedEvent): Promise<void> {
    if (this.forward instanceof Promise) this.forward = await this.forward
    if (this.backward instanceof Promise) this.backward = await this.backward
    if (this.result instanceof Promise) this.result = await this.result

    const context = event.context

    if (this.result.get(context.id) !== undefined) {
      return
    }

    await this.addContext(context)
    void this.notify()
  }

  private async onCreatePatchEvent (event: PatchCreatedEvent): Promise<void> {
    if (this.params.notifications == null) return
    if (this.forward instanceof Promise) this.forward = await this.forward
    if (this.backward instanceof Promise) this.backward = await this.backward
    if (this.result instanceof Promise) this.result = await this.result

    const context = this.result.getResult().find((it) => it.card === event.card)
    if (context === undefined || (context.notifications ?? []).length === 0) return

    const hasMessage = context.notifications?.some((it) => it.messageId === event.patch.message) ?? false
    if (!hasMessage) return

    this.result.update({
      ...context,
      notifications: context.notifications?.map((it) => ({
        ...it,
        message:
          it.messageId === event.patch.message && it.message != null
            ? applyPatch(it.message, event.patch, allowedPatchTypes)
            : it.message
      }))
    })

    void this.notify()
  }

  private async onMessagesRemovedEvent (event: MessagesRemovedEvent): Promise<void> {
    if (this.params.notifications == null) return
    if (this.forward instanceof Promise) this.forward = await this.forward
    if (this.backward instanceof Promise) this.backward = await this.backward
    if (this.result instanceof Promise) this.result = await this.result

    const context = this.result.getResult().find((it) => it.card === event.card)

    if (context === undefined) return
    const filtered = (context.notifications ?? []).filter(
      (it) => it.messageId == null || !event.messages.includes(it.messageId)
    )
    if (filtered.length === (context.notifications?.length ?? 0)) return
    const contextUpdated = (await this.find({ id: context.id, limit: 1, notifications: this.params.notifications }))[0]
    if (contextUpdated !== undefined) {
      this.result.update(contextUpdated)
    } else {
      this.result.update({
        ...context,
        notifications: filtered
      })
    }
    void this.notify()
  }

  private async onRemoveNotificationEvent (event: NotificationsRemovedEvent): Promise<void> {
    if (this.params.notifications == null) return
    if (this.forward instanceof Promise) this.forward = await this.forward
    if (this.backward instanceof Promise) this.backward = await this.backward
    if (this.result instanceof Promise) this.result = await this.result

    const context = this.result.get(event.context)
    if (context === undefined) return

    const filtered = (context.notifications ?? []).filter((it) => it.created > event.untilDate)
    if (filtered.length === (context.notifications?.length ?? 0)) return

    const contextUpdated = (await this.find({ id: context.id, limit: 1, notifications: this.params.notifications }))[0]
    if (contextUpdated !== undefined) {
      this.result.update(contextUpdated)
    } else {
      this.result.update({
        ...context,
        notifications: filtered
      })
    }
    void this.notify()
  }

  private async onCreateNotificationEvent (event: NotificationCreatedEvent): Promise<void> {
    if (this.params.notifications == null) return
    if (this.forward instanceof Promise) this.forward = await this.forward
    if (this.backward instanceof Promise) this.backward = await this.backward
    if (this.result instanceof Promise) this.result = await this.result

    const context = this.result.get(event.notification.context)
    if (context !== undefined) {
      const message =
        this.params.notifications.message === true
          ? (
              await this.client.findMessages({
                card: context.card,
                id: event.notification.messageId
              })
            )[0]
          : undefined

      const notifications = [
        {
          ...event.notification,
          message
        },
        ...(context.notifications ?? [])
      ]
      if (notifications.length > this.params.notifications.limit) {
        notifications.pop()
      }
      this.result.update({
        ...context,
        notifications
      })
      void this.notify()
    } else {
      const newContext = (
        await this.find({ id: event.notification.context, notifications: this.params.notifications, limit: 1 })
      )[0]
      if (newContext !== undefined) {
        await this.addContext(newContext)
        void this.notify()
      }
    }
  }

  private async onRemoveNotificationContextEvent (event: NotificationContextRemovedEvent): Promise<void> {
    if (this.forward instanceof Promise) this.forward = await this.forward
    if (this.backward instanceof Promise) this.backward = await this.backward
    if (this.result instanceof Promise) this.result = await this.result

    this.result.delete(event.context)
  }

  private async onUpdateNotificationContextEvent (event: NotificationContextUpdatedEvent): Promise<void> {
    if (this.forward instanceof Promise) this.forward = await this.forward
    if (this.backward instanceof Promise) this.backward = await this.backward
    if (this.result instanceof Promise) this.result = await this.result

    const toUpdate = this.result.get(event.context)

    if (toUpdate !== undefined) {
      const notifications = this.filterNotifications(
        event.lastView != null
          ? (toUpdate.notifications ?? []).map((it) => ({
              ...it,
              read: event.lastView != null && event.lastView >= it.created
            }))
          : toUpdate.notifications ?? []
      )

      if (
        notifications.length < (toUpdate.notifications?.length ?? 0) &&
        this.params.notifications?.order !== SortingOrder.Descending
      ) {
        const updated: NotificationContext = (
          await this.find({ id: event.context, limit: 1, notifications: this.params.notifications })
        )[0]
        if (updated !== undefined) {
          this.result.update(updated)
        } else {
          const updated: NotificationContext = {
            ...toUpdate,
            lastUpdate: event.lastUpdate ?? toUpdate.lastUpdate,
            lastView: event.lastView ?? toUpdate.lastView,
            notifications
          }
          this.result.update(updated)
        }
      } else {
        const updated: NotificationContext = {
          ...toUpdate,
          lastUpdate: event.lastUpdate ?? toUpdate.lastUpdate,
          lastView: event.lastView ?? toUpdate.lastView,
          notifications
        }
        this.result.update(updated)
      }
      if (event.lastUpdate != null) {
        this.result.sort((a, b) =>
          this.params.order === SortingOrder.Descending
            ? b.lastUpdate.getTime() - a.lastUpdate.getTime()
            : a.lastUpdate.getTime() - b.lastUpdate.getTime()
        )
      }
      void this.notify()
    }
  }

  private filterNotifications (notifications: Notification[]): Notification[] {
    if (this.params.notifications == null) return notifications
    const read = this.params.notifications.read
    if (read == null) return notifications

    return notifications.filter((it) => it.read === read)
  }

  private async addContext (context: NotificationContext): Promise<void> {
    if (this.result instanceof Promise) this.result = await this.result
    if (this.result.get(context.id) !== undefined) return
    if (this.result.isTail()) {
      if (this.params.order === SortingOrder.Ascending) {
        this.result.push(context)
      } else {
        this.result.unshift(context)
      }
    }

    if (this.params.limit != null && this.result.length > this.params.limit) {
      this.result.pop()
    }
  }

  private async notify (): Promise<void> {
    if (this.callback === undefined) return
    if (this.result instanceof Promise) {
      this.result = await this.result
    }

    const result = this.result.getResult()
    const isTail = this.result.isTail()
    const isHead = this.result.isHead()

    const window = new WindowImpl(result, isTail, isHead, this)
    this.callback(window)
  }
}
