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
import { type ActivityMessage } from '@hcengineering/activity'
import { SortingOrder, getCurrentAccount, type Class, type Doc, type Ref, type WithLookup } from '@hcengineering/core'
import notification, {
  type ActivityInboxNotification,
  type Collaborators,
  type DocNotifyContext,
  type InboxNotification,
  type InboxNotificationsClient
} from '@hcengineering/notification'
import { createQuery, getClient } from '@hcengineering/presentation'
import { derived, writable } from 'svelte/store'

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
    ([notifyContexts, inboxNotifications]) => {
      if (inboxNotifications.length === 0 || notifyContexts.length === 0) {
        return new Map<Ref<DocNotifyContext>, InboxNotification[]>()
      }

      return inboxNotifications.reduce((result, notification) => {
        const notifyContext = notifyContexts.find(({ _id }) => _id === notification.docNotifyContext)

        if (notifyContext === undefined || notifyContext.hidden) {
          return result
        }

        return result.set(notifyContext._id, (result.get(notifyContext._id) ?? []).concat(notification))
      }, new Map<Ref<DocNotifyContext>, InboxNotification[]>())
    }
  )

  readonly activityInboxNotifications = derived(
    [this.inboxNotifications],
    ([notifications]) =>
      notifications.filter(
        (n): n is ActivityInboxNotification => n._class === notification.class.ActivityInboxNotification
      ),
    [] as ActivityInboxNotification[]
  )

  private readonly docNotifyContextsQuery = createQuery(true)
  private readonly inboxNotificationsQuery = createQuery(true)

  private _docNotifyContextByDoc = new Map<Ref<Doc>, DocNotifyContext>()
  private _inboxNotifications: Array<WithLookup<InboxNotification>> = []

  private constructor () {
    this.docNotifyContextsQuery.query(
      notification.class.DocNotifyContext,
      {
        user: getCurrentAccount()._id
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
        user: getCurrentAccount()._id
      },
      (result: InboxNotification[]) => {
        this.inboxNotifications.set(result)
        this._inboxNotifications = result
      },
      {
        sort: {
          createdOn: SortingOrder.Descending
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

    if (docNotifyContext === undefined) {
      return
    }

    const inboxNotifications = this._inboxNotifications.filter(
      (notification) => notification.docNotifyContext === docNotifyContext._id && !notification.isViewed
    )

    await Promise.all([
      ...inboxNotifications.map(async (notification) => await client.update(notification, { isViewed: true })),
      client.update(docNotifyContext, { lastViewedTimestamp: Date.now() })
    ])
  }

  async forceReadDoc (_id: Ref<Doc>, _class: Ref<Class<Doc>>): Promise<void> {
    const client = getClient()
    const context = this._docNotifyContextByDoc.get(_id)

    if (context !== undefined) {
      await this.readDoc(_id)
      return
    }

    const doc = await client.findOne(_class, { _id })

    if (doc === undefined) {
      return
    }

    const hierarchy = client.getHierarchy()
    const collaboratorsMixin = hierarchy.as<Doc, Collaborators>(doc, notification.mixin.Collaborators)

    if (collaboratorsMixin.collaborators === undefined) {
      await client.createMixin<Doc, Collaborators>(
        collaboratorsMixin._id,
        collaboratorsMixin._class,
        collaboratorsMixin.space,
        notification.mixin.Collaborators,
        {
          collaborators: [getCurrentAccount()._id]
        }
      )
    } else if (!collaboratorsMixin.collaborators.includes(getCurrentAccount()._id)) {
      await client.updateMixin(
        collaboratorsMixin._id,
        collaboratorsMixin._class,
        collaboratorsMixin.space,
        notification.mixin.Collaborators,
        {
          $push: {
            collaborators: getCurrentAccount()._id
          }
        }
      )
    }

    await client.createDoc(notification.class.DocNotifyContext, doc.space, {
      attachedTo: _id,
      attachedToClass: _class,
      user: getCurrentAccount()._id,
      hidden: true
    })
  }

  async readMessages (ids: Array<Ref<ActivityMessage>>): Promise<void> {
    const client = getClient()

    const notificationsToRead = this._inboxNotifications
      .filter((n): n is ActivityInboxNotification => n._class === notification.class.ActivityInboxNotification)
      .filter(({ attachedTo, isViewed }) => ids.includes(attachedTo) && !isViewed)

    await Promise.all(
      notificationsToRead.map(async (notification) => await client.update(notification, { isViewed: true }))
    )
  }

  async readNotifications (ids: Array<Ref<InboxNotification>>): Promise<void> {
    const client = getClient()
    const notificationsToRead = this._inboxNotifications.filter(({ _id }) => ids.includes(_id))

    await Promise.all(
      notificationsToRead.map(async (notification) => await client.update(notification, { isViewed: true }))
    )
  }

  async unreadNotifications (ids: Array<Ref<InboxNotification>>): Promise<void> {
    const client = getClient()
    const notificationsToUnread = this._inboxNotifications.filter(({ _id }) => ids.includes(_id))

    await Promise.all(
      notificationsToUnread.map(async (notification) => await client.update(notification, { isViewed: false }))
    )
  }

  async deleteNotifications (ids: Array<Ref<InboxNotification>>): Promise<void> {
    const client = getClient()
    const inboxNotifications = this._inboxNotifications.filter(({ _id }) => ids.includes(_id))
    await Promise.all(inboxNotifications.map(async (notification) => await client.remove(notification)))
  }
}
