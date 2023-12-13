//
// Copyright © 2023 Hardcore Engineering Inc.
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
import { type Account, getCurrentAccount, type Ref, SortingOrder, type Doc } from '@hcengineering/core'
import notification, {
  type InboxNotification,
  type InboxNotificationsClient,
  type DocNotifyContext
} from '@hcengineering/notification'
import { derived, writable } from 'svelte/store'
import { createQuery, getClient } from '@hcengineering/presentation'
import activity, { type ActivityMessage } from '@hcengineering/activity'

/**
 * @public
 */
export class InboxNotificationsClientImpl implements InboxNotificationsClient {
  protected static _instance: InboxNotificationsClientImpl | undefined = undefined

  readonly docNotifyContexts = writable<DocNotifyContext[]>([])
  readonly docNotifyContextByDoc = writable<Map<Ref<Doc>, DocNotifyContext>>(new Map())

  readonly inboxNotifications = writable<InboxNotification[]>([])
  readonly inboxNotificationsByContext = derived(
    [this.docNotifyContexts, this.inboxNotifications],
    ([docNotifyContexts, inboxNotifications]) => {
      if (inboxNotifications.length === 0 || docNotifyContexts.length === 0) {
        return new Map<DocNotifyContext, InboxNotification[]>()
      }

      return inboxNotifications.reduce((result, notification) => {
        const docUpdate = docNotifyContexts.find(({ _id }) => _id === notification.docNotifyContext)

        if (docUpdate == null) {
          return result
        }

        return result.set(docUpdate, (result.get(docUpdate) ?? []).concat(notification))
      }, new Map<DocNotifyContext, InboxNotification[]>())
    }
  )

  private readonly docNotifyContextsQuery = createQuery(true)
  private readonly inboxNotificationsQuery = createQuery(true)

  private readonly _user: Ref<Account>
  private _docNotifyContextByDoc = new Map<Ref<Doc>, DocNotifyContext>()
  private _inboxNotifications: InboxNotification[] = []

  private constructor () {
    this._user = getCurrentAccount()._id
    this.docNotifyContextsQuery.query(
      notification.class.DocNotifyContext,
      {
        user: this._user,
        hidden: false
      },
      (result: DocNotifyContext[]) => {
        this.docNotifyContexts.set(result)
        this._docNotifyContextByDoc = new Map(result.map((updates) => [updates.attachedTo, updates]))
        this.docNotifyContextByDoc.set(this._docNotifyContextByDoc)
      }
    )
    this.inboxNotificationsQuery.query(
      notification.class.InboxNotification,
      {
        user: this._user
      },
      (result: InboxNotification[]) => {
        this.inboxNotifications.set(result)
        this._inboxNotifications = result
      },
      {
        sort: {
          createdOn: SortingOrder.Descending
        },
        lookup: {
          attachedTo: activity.class.ActivityMessage
        }
      }
    )
  }

  static createClient (): InboxNotificationsClientImpl {
    InboxNotificationsClientImpl._instance = new InboxNotificationsClientImpl()
    return InboxNotificationsClientImpl._instance
  }

  static getClient (): InboxNotificationsClientImpl {
    if (InboxNotificationsClientImpl._instance === undefined) {
      InboxNotificationsClientImpl._instance = new InboxNotificationsClientImpl()
    }
    return InboxNotificationsClientImpl._instance
  }

  async readDoc (_id: Ref<Doc>): Promise<void> {
    const client = getClient()
    const docNotifyContext = this._docNotifyContextByDoc.get(_id)

    if (docNotifyContext == null) {
      return
    }

    const inboxNotifications = this._inboxNotifications.filter(
      (notification) => notification.docNotifyContext === docNotifyContext._id
    )

    await Promise.all([
      ...inboxNotifications.map(async (notification) => await client.update(notification, { isViewed: true })),
      client.update(docNotifyContext, { lastViewedTimestamp: Date.now() })
    ])
  }

  async readMessages (ids: Array<Ref<ActivityMessage>>): Promise<void> {
    // TODO: should read inbox updates??
    const client = getClient()
    const inboxNotifications = this._inboxNotifications.filter(({ attachedTo }) => ids.includes(attachedTo))

    await Promise.all(
      inboxNotifications.map(async (notification) => await client.update(notification, { isViewed: true }))
    )
  }

  async unreadMessages (ids: Array<Ref<ActivityMessage>>): Promise<void> {
    // TODO: should unread inbox updates??
    const client = getClient()
    const inboxNotifications = this._inboxNotifications.filter(({ attachedTo }) => ids.includes(attachedTo))

    await Promise.all(
      inboxNotifications.map(async (notification) => await client.update(notification, { isViewed: false }))
    )
  }

  async deleteMessagesNotifications (ids: Array<Ref<ActivityMessage>>): Promise<void> {
    const client = getClient()
    const inboxNotifications = this._inboxNotifications.filter(({ attachedTo }) => ids.includes(attachedTo))
    await Promise.all(inboxNotifications.map(async (notification) => await client.remove(notification)))
  }
}
