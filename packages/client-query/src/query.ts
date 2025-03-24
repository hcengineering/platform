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

import { type LiveQueries } from '@hcengineering/communication-query'
import type {
  MessagesQueryCallback,
  NotificationsQueryCallback,
  QueryCallback
} from '@hcengineering/communication-sdk-types'
import {
  type FindMessagesParams,
  type FindNotificationContextParams,
  type FindNotificationsParams,
  type NotificationContext
} from '@hcengineering/communication-types'
import { deepEqual } from 'fast-equals'

class BaseQuery<P extends Record<string, any>, C extends QueryCallback<any>> {
  private oldQuery: P | undefined
  private oldCallback: C | undefined

  constructor(
    protected readonly lq: LiveQueries,
    onDestroy: (fn: () => void) => void
  ) {
    onDestroy(() => {
      this.unsubscribe()
    })
  }

  unsubscribe: () => void = () => {}

  query(params: P, callback: C): boolean {
    if (!this.needUpdate(params, callback)) {
      return false
    }
    this.doQuery(params, callback)
    return true
  }

  private doQuery(query: P, callback: C): void {
    this.unsubscribe()
    this.oldCallback = callback
    this.oldQuery = query

    const { unsubscribe } = this.createQuery(query, callback)
    this.unsubscribe = () => {
      unsubscribe()
      this.oldCallback = undefined
      this.oldQuery = undefined
      this.unsubscribe = () => {}
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  createQuery(params: P, callback: C): { unsubscribe: () => void } {
    return {
      unsubscribe: () => {}
    }
  }

  private needUpdate(params: P, callback: C): boolean {
    if (!deepEqual(params, this.oldQuery)) return true
    if (!deepEqual(callback.toString(), this.oldCallback?.toString())) return true
    return false
  }
}

export class MessagesQuery extends BaseQuery<FindMessagesParams, MessagesQueryCallback> {
  override createQuery(params: FindMessagesParams, callback: MessagesQueryCallback): { unsubscribe: () => void } {
    return this.lq.queryMessages(params, callback)
  }
}

export class NotificationsQuery extends BaseQuery<FindNotificationsParams, NotificationsQueryCallback> {
  override createQuery(
    params: FindNotificationsParams,
    callback: NotificationsQueryCallback
  ): {
    unsubscribe: () => void
  } {
    return this.lq.queryNotifications(params, callback)
  }
}

export class NotificationContextsQuery extends BaseQuery<
  FindNotificationContextParams,
  QueryCallback<NotificationContext>
> {
  override createQuery(
    params: FindNotificationContextParams,
    callback: QueryCallback<NotificationContext>
  ): {
    unsubscribe: () => void
  } {
    return this.lq.queryNotificationContexts(params, callback)
  }
}
