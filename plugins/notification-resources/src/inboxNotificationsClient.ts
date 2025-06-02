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
import activity from '@hcengineering/activity'
import {
  type Account,
  type Client,
  SortingOrder,
  getCurrentAccount,
  toIdMap,
  type Class,
  type Doc,
  type IdMap,
  type Ref,
  type TxOperations,
  type WithLookup
} from '@hcengineering/core'
import notification, {
  type ActivityInboxNotification,
  type Collaborators,
  type DocNotifyContext,
  type InboxNotification,
  type InboxNotificationsClient
} from '@hcengineering/notification'
import { createQuery, getClient, onClient } from '@hcengineering/presentation'
import { derived, get, writable } from 'svelte/store'

import { isActivityNotification } from './utils'

/**
 * @public
 */
export class InboxNotificationsClientImpl implements InboxNotificationsClient {
  protected static _instance: InboxNotificationsClientImpl | undefined = undefined

  readonly contexts = writable<DocNotifyContext[]>([])
  readonly contextByDoc = writable<Map<Ref<Doc>, DocNotifyContext>>(new Map())
  readonly contextById = derived(
    [this.contexts],
    ([contexts]) => toIdMap(contexts),
    new Map() as IdMap<DocNotifyContext>
  )

  readonly activityInboxNotifications = writable<Array<WithLookup<ActivityInboxNotification>>>([])
  readonly otherInboxNotifications = writable<InboxNotification[]>([])

  readonly inboxNotifications = derived(
    [this.activityInboxNotifications, this.otherInboxNotifications],
    ([activityNotifications, otherNotifications]) => {
      return otherNotifications
        .concat(activityNotifications)
        .sort((n1, n2) => (n2.createdOn ?? n2.modifiedOn) - (n1.createdOn ?? n1.modifiedOn))
    },
    [] as InboxNotification[]
  )

  readonly inboxNotificationsByContext = derived(
    [this.contextById, this.inboxNotifications],
    ([contextById, inboxNotifications]) => {
      if (inboxNotifications.length === 0 || contextById.size === 0) {
        return new Map<Ref<DocNotifyContext>, InboxNotification[]>()
      }

      return inboxNotifications.reduce((result, notification) => {
        const notifyContext = contextById.get(notification.docNotifyContext)

        if (notifyContext === undefined) {
          return result
        }

        return result.set(notifyContext._id, (result.get(notifyContext._id) ?? []).concat(notification))
      }, new Map<Ref<DocNotifyContext>, InboxNotification[]>())
    }
  )

  private readonly contextsQuery = createQuery(true)
  private readonly otherInboxNotificationsQuery = createQuery(true)
  private readonly activityInboxNotificationsQuery = createQuery(true)

  private _contextByDoc = new Map<Ref<Doc>, DocNotifyContext>()

  private constructor () {
    onClient(this.init.bind(this))
  }

  private async init (client: Client, account: Account): Promise<void> {
    this.contextsQuery.query(
      notification.class.DocNotifyContext,
      {
        user: account.uuid
      },
      (result: DocNotifyContext[]) => {
        this.contexts.set(result)
        this._contextByDoc = new Map(result.map((updates) => [updates.objectId, updates]))
        this.contextByDoc.set(this._contextByDoc)
      }
    )
    this.otherInboxNotificationsQuery.query(
      notification.class.CommonInboxNotification,
      {
        archived: false,
        user: account.uuid
      },
      (result: InboxNotification[]) => {
        result.sort((a, b) => (b.createdOn ?? b.modifiedOn) - (a.createdOn ?? a.modifiedOn))
        this.otherInboxNotifications.set(result)
      }
    )

    this.activityInboxNotificationsQuery.query(
      notification.class.ActivityInboxNotification,
      {
        archived: false,
        user: account.uuid
      },
      (result: ActivityInboxNotification[]) => {
        this.activityInboxNotifications.set(result)
      },
      {
        sort: {
          createdOn: SortingOrder.Descending
        },
        lookup: {
          attachedTo: activity.class.ActivityMessage
        },
        limit: 1000
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
    const docNotifyContext = this._contextByDoc.get(_id)

    if (docNotifyContext === undefined) {
      return
    }

    const client = getClient()
    const op = client.apply(undefined, 'readDoc', true)
    const inboxNotifications = await client.findAll(
      notification.class.InboxNotification,
      { docNotifyContext: docNotifyContext._id, isViewed: false },
      { projection: { _id: 1, _class: 1, space: 1 } }
    )

    for (const notification of inboxNotifications) {
      await op.updateDoc(notification._class, notification.space, notification._id, { isViewed: true })
    }
    await op.update(docNotifyContext, { lastViewedTimestamp: Date.now() })
    await op.commit()
  }

  async forceReadDoc (_id: Ref<Doc>, _class: Ref<Class<Doc>>): Promise<void> {
    const context = this._contextByDoc.get(_id)

    if (context !== undefined) {
      await this.readDoc(_id)
      return
    }

    const client = getClient()
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
          collaborators: [getCurrentAccount().uuid]
        }
      )
    } else if (collaboratorsMixin.collaborators.includes(getCurrentAccount().uuid)) {
      await client.updateMixin(
        collaboratorsMixin._id,
        collaboratorsMixin._class,
        collaboratorsMixin.space,
        notification.mixin.Collaborators,
        {
          $push: {
            collaborators: getCurrentAccount().primarySocialId
          }
        }
      )
    }
  }

  async readNotifications (client: TxOperations, ids: Array<Ref<InboxNotification>>): Promise<void> {
    const notificationsToRead = (get(this.inboxNotifications) ?? []).filter(
      ({ _id, isViewed }) => ids.includes(_id) && !isViewed
    )

    for (const notification of notificationsToRead) {
      await client.update(notification, { isViewed: true })
    }
  }

  async unreadNotifications (client: TxOperations, ids: Array<Ref<InboxNotification>>): Promise<void> {
    const notificationsToUnread = (get(this.inboxNotifications) ?? []).filter(({ _id }) => ids.includes(_id))

    for (const notification of notificationsToUnread) {
      await client.update(notification, { isViewed: false })
    }
  }

  async archiveNotifications (client: TxOperations, ids: Array<Ref<InboxNotification>>): Promise<void> {
    const inboxNotifications = (get(this.inboxNotifications) ?? []).filter(({ _id }) => ids.includes(_id))
    for (const notification of inboxNotifications) {
      await client.update(notification, { archived: true, isViewed: true })
    }
  }

  async archiveAllNotifications (): Promise<void> {
    const ops = getClient().apply(undefined, 'archiveAllNotifications', true)

    try {
      const inboxNotifications = await ops.findAll(
        notification.class.InboxNotification,
        {
          user: getCurrentAccount().uuid,
          archived: false
        },
        { projection: { _id: 1, _class: 1, space: 1 } }
      )
      const contexts = get(this.contexts) ?? []
      for (const notification of inboxNotifications) {
        await ops.updateDoc(notification._class, notification.space, notification._id, {
          archived: true,
          isViewed: true
        })
      }

      for (const context of contexts) {
        await ops.update(context, { lastViewedTimestamp: Date.now() })
      }
    } finally {
      await ops.commit()
    }
  }

  async readAllNotifications (): Promise<void> {
    const ops = getClient().apply(undefined, 'readAllNotifications', true)

    try {
      const inboxNotifications = await ops.findAll(
        notification.class.InboxNotification,
        {
          user: getCurrentAccount().uuid,
          isViewed: false,
          archived: false
        },
        { projection: { _id: 1, _class: 1, space: 1 } }
      )
      const contexts = get(this.contexts) ?? []
      for (const notification of inboxNotifications) {
        await ops.updateDoc(notification._class, notification.space, notification._id, { isViewed: true })
      }
      for (const context of contexts) {
        await ops.update(context, { lastViewedTimestamp: Date.now() })
      }
    } finally {
      await ops.commit()
    }
  }

  async unreadAllNotifications (): Promise<void> {
    const ops = getClient().apply(undefined, 'unreadAllNotifications', true)

    try {
      const inboxNotifications = await ops.findAll(
        notification.class.InboxNotification,
        {
          user: getCurrentAccount().uuid,
          isViewed: true,
          archived: false
        },
        {
          projection: { _id: 1, _class: 1, space: 1, docNotifyContext: 1 },
          sort: { createdOn: SortingOrder.Ascending }
        }
      )
      const contexts = get(this.contexts) ?? []

      for (const notification of inboxNotifications) {
        await ops.updateDoc(notification._class, notification.space, notification._id, { isViewed: false })
      }
      for (const context of contexts) {
        const firstUnread = inboxNotifications.find(
          (it) => it.docNotifyContext === context._id && isActivityNotification(it)
        )

        if (firstUnread === undefined) {
          continue
        }

        const lastViewedTimestamp = (firstUnread.createdOn ?? firstUnread.modifiedOn) - 1

        await ops.update(context, { lastViewedTimestamp })
      }
    } finally {
      await ops.commit()
    }
  }
}
