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

import { type InboxNotificationsClient } from '@hcengineering/notification'
import { writable, derived, get } from 'svelte/store'
import {
  createNotificationContextsQuery,
  getCommunicationClient,
  onCommunicationClient
} from '@hcengineering/presentation'
import { notEmpty, SortingOrder } from '@hcengineering/core'
import cardPlugin from '@hcengineering/card'
import { type NotificationContext, type Window } from '@hcengineering/communication-types'
import { getDisplayInboxData, removeContextNotifications } from '@hcengineering/notification-resources'

import { type NavigationItem } from './type'

const limit = 20

const isLoadingStore = writable<boolean>(true)

const contextsWindowStore = writable<Window<NotificationContext> | undefined>(undefined)
const contextStore = writable<NotificationContext[]>([])

const contextsQuery = createNotificationContextsQuery(true)

export class NavigationClient {
  private readonly contextStore = contextStore
  private readonly contextsWindowStore = contextsWindowStore
  public readonly isLoadingStore = isLoadingStore

  private readonly limitStore = writable<number>(limit)

  private isPrevLoading = false

  private readonly modernNavigationItemsStore = derived(
    [contextStore],
    ([contexts]): NavigationItem[] => {
      return contexts
        .map((context): NavigationItem => {
          return {
            type: 'modern',
            _id: context.cardId,
            _class: cardPlugin.class.Card,
            context,
            date: context.lastNotify ?? context.lastUpdate
          }
        })
        .filter(notEmpty)
    },
    [] as NavigationItem[]
  )

  private readonly legacyNavigationItemsStore

  public readonly navigationItemsStore
  public readonly allNavigationItemsStore

  constructor (private readonly oldClient: InboxNotificationsClient) {
    this.legacyNavigationItemsStore = derived(
      [this.oldClient.inboxNotificationsByContext, this.oldClient.contextById],
      ([notificationsByContext, contextById]) => {
        const inboxData = getDisplayInboxData(notificationsByContext)
        return Array.from(inboxData.entries())
          .map(([ctx, notifications]): NavigationItem | undefined => {
            if (notifications.length === 0) return undefined
            const context = contextById.get(ctx)
            if (context == null) return undefined

            return {
              type: 'legacy',
              _id: context.objectId,
              _class: context.objectClass,
              context,
              date: new Date(notifications[0].createdOn ?? Date.now()),
              notifications: notifications.slice(0, 3)
            }
          })
          .filter(notEmpty)
      }
    )

    this.allNavigationItemsStore = derived(
      [this.modernNavigationItemsStore, this.legacyNavigationItemsStore],
      ([modern, legacy]): NavigationItem[] =>
        [...modern, ...legacy].sort((a, b) => b.date.getTime() - a.date.getTime()),
      [] as NavigationItem[]
    )

    this.navigationItemsStore = derived(
      [this.allNavigationItemsStore, this.isLoadingStore, this.limitStore],
      ([items, isLoading, limit]): NavigationItem[] => (isLoading ? [] : items.slice(0, limit)),
      [] as NavigationItem[]
    )
  }

  public hasPrevPage (): boolean {
    const allItems = get(this.allNavigationItemsStore)
    const navItems = get(this.navigationItemsStore)

    const hasNextPage = get(contextsWindowStore)?.hasPrevPage() ?? false
    return hasNextPage || allItems.length > navItems.length
  }

  public async prev (): Promise<void> {
    if (this.isPrevLoading || !this.hasPrevPage()) return
    const w = get(contextsWindowStore)
    if (w == null) return
    this.isPrevLoading = true
    await w.loadPrevPage()
    this.limitStore.update((it) => it + limit)
    this.isPrevLoading = false
  }

  public async remove (item: NavigationItem): Promise<void> {
    if (item.type === 'modern') {
      const client = getCommunicationClient()
      await client.removeNotificationContext(item.context.id)
    } else {
      await removeContextNotifications(item.context)
    }
  }
}

function updateContextsQuery (): void {
  contextsQuery.query(
    {
      notifications: {
        order: SortingOrder.Descending,
        limit: 3
      },
      order: SortingOrder.Descending,
      limit
    },
    (res) => {
      contextsWindowStore.set(res)
      const contexts = res.getResult().filter((it) => (it.notifications?.length ?? 0) > 0)
      contextStore.set(contexts)
      isLoadingStore.set(false)

      if (contexts.length < limit && res.hasPrevPage()) {
        void res.loadPrevPage()
      }
    },
    { message: true }
  )
}

onCommunicationClient(() => {
  updateContextsQuery()
})
