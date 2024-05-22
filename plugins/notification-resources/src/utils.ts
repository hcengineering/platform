//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2022 Hardcore Engineering Inc.
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
import activity, {
  type ActivityMessage,
  type DisplayDocUpdateMessage,
  type DocUpdateMessage
} from '@hcengineering/activity'
import { activityMessagesComparator, combineActivityMessages } from '@hcengineering/activity-resources'
import {
  SortingOrder,
  getCurrentAccount,
  type Class,
  type Doc,
  type DocumentUpdate,
  type Ref,
  type TxOperations,
  type WithLookup
} from '@hcengineering/core'
import notification, {
  NotificationStatus,
  decodeObjectURI,
  encodeObjectURI,
  notificationId,
  type ActivityInboxNotification,
  type Collaborators,
  type DisplayInboxNotification,
  type DocNotifyContext,
  type InboxNotification,
  type MentionInboxNotification
} from '@hcengineering/notification'
import { MessageBox, getClient } from '@hcengineering/presentation'
import {
  getCurrentLocation,
  getLocation,
  navigate,
  parseLocation,
  showPopup,
  type Location,
  type ResolvedLocation
} from '@hcengineering/ui'
import { get, writable } from 'svelte/store'

import { InboxNotificationsClientImpl } from './inboxNotificationsClient'
import { type InboxData, type InboxNotificationsFilter } from './types'
import { getMetadata } from '@hcengineering/platform'

export async function hasDocNotifyContextPinAction (docNotifyContext: DocNotifyContext): Promise<boolean> {
  if (docNotifyContext.hidden) {
    return false
  }
  return docNotifyContext.isPinned !== true
}

export async function hasDocNotifyContextUnpinAction (docNotifyContext: DocNotifyContext): Promise<boolean> {
  if (docNotifyContext.hidden) {
    return false
  }
  return docNotifyContext.isPinned === true
}

/**
 * @public
 */
export async function canReadNotifyContext (doc: DocNotifyContext): Promise<boolean> {
  const inboxNotificationsClient = InboxNotificationsClientImpl.getClient()

  return (
    get(inboxNotificationsClient.inboxNotificationsByContext)
      .get(doc._id)
      ?.some(({ isViewed }) => !isViewed) ?? false
  )
}

/**
 * @public
 */
export async function canUnReadNotifyContext (doc: DocNotifyContext): Promise<boolean> {
  const canReadContext = await canReadNotifyContext(doc)
  return !canReadContext
}

/**
 * @public
 */
export async function readNotifyContext (doc: DocNotifyContext): Promise<void> {
  const inboxClient = InboxNotificationsClientImpl.getClient()
  const inboxNotifications = get(inboxClient.inboxNotificationsByContext).get(doc._id) ?? []

  const doneOp = await getClient().measure('readNotifyContext')
  const ops = getClient().apply(doc._id)
  try {
    await inboxClient.readNotifications(
      ops,
      inboxNotifications.map(({ _id }) => _id)
    )
    await ops.update(doc, { lastViewedTimestamp: Date.now() })
  } finally {
    await ops.commit()
    await doneOp()
  }
}

/**
 * @public
 */
export async function unReadNotifyContext (doc: DocNotifyContext): Promise<void> {
  const inboxClient = InboxNotificationsClientImpl.getClient()
  const inboxNotifications = get(inboxClient.inboxNotificationsByContext).get(doc._id) ?? []
  const notificationsToUnread = inboxNotifications.filter(({ isViewed }) => isViewed)

  if (notificationsToUnread.length === 0) {
    return
  }

  const doneOp = await getClient().measure('unReadNotifyContext')
  const ops = getClient().apply(doc._id)

  try {
    await inboxClient.unreadNotifications(
      ops,
      notificationsToUnread.map(({ _id }) => _id)
    )
    const toUnread = inboxNotifications.find(isActivityNotification)

    if (toUnread !== undefined) {
      const createdOn = (toUnread as WithLookup<ActivityInboxNotification>)?.$lookup?.attachedTo?.createdOn

      if (createdOn === undefined || createdOn === 0) {
        return
      }

      await ops.diffUpdate(doc, { lastViewedTimestamp: createdOn - 1 })
    }
  } finally {
    await ops.commit()
    await doneOp()
  }
}

/**
 * @public
 */
export async function archiveContextNotifications (doc?: DocNotifyContext): Promise<void> {
  if (doc === undefined) {
    return
  }

  const doneOp = await getClient().measure('archiveContextNotifications')
  const ops = getClient().apply(doc._id)

  try {
    const notifications = await ops.findAll(
      notification.class.InboxNotification,
      { docNotifyContext: doc._id, archived: { $ne: true } },
      { projection: { _id: 1, _class: 1, space: 1 } }
    )

    for (const notification of notifications) {
      await ops.updateDoc(notification._class, notification.space, notification._id, { archived: true, isViewed: true })
    }
    await ops.update(doc, { lastViewedTimestamp: Date.now() })
  } finally {
    await ops.commit()
    await doneOp()
  }
}

/**
 * @public
 */
export async function unarchiveContextNotifications (doc?: DocNotifyContext): Promise<void> {
  if (doc === undefined) {
    return
  }

  const doneOp = await getClient().measure('unarchiveContextNotifications')
  const ops = getClient().apply(doc._id)

  try {
    const notifications = await ops.findAll(
      notification.class.InboxNotification,
      { docNotifyContext: doc._id, archived: true },
      { projection: { _id: 1, _class: 1, space: 1 } }
    )

    for (const notification of notifications) {
      await ops.updateDoc(notification._class, notification.space, notification._id, { archived: false })
    }
  } finally {
    await ops.commit()
    await doneOp()
  }
}

enum OpWithMe {
  Add = 'add',
  Remove = 'remove'
}

async function updateMeInCollaborators (
  client: TxOperations,
  docClass: Ref<Class<Doc>>,
  docId: Ref<Doc>,
  op: OpWithMe
): Promise<void> {
  const me = getCurrentAccount()._id
  const hierarchy = client.getHierarchy()
  const target = await client.findOne(docClass, { _id: docId })
  if (target !== undefined) {
    if (hierarchy.hasMixin(target, notification.mixin.Collaborators)) {
      const collab = hierarchy.as(target, notification.mixin.Collaborators)
      let collabUpdate: DocumentUpdate<Collaborators> | undefined

      if (collab.collaborators.includes(me) && op === OpWithMe.Remove) {
        collabUpdate = {
          $pull: {
            collaborators: me
          }
        }
      } else if (!collab.collaborators.includes(me) && op === OpWithMe.Add) {
        collabUpdate = {
          $push: {
            collaborators: me
          }
        }
      }

      if (collabUpdate !== undefined) {
        await client.updateMixin(
          collab._id,
          collab._class,
          collab.space,
          notification.mixin.Collaborators,
          collabUpdate
        )
      }
    }
  }
}

/**
 * @public
 */
export async function unsubscribe (object: DocNotifyContext): Promise<void> {
  const client = getClient()
  await updateMeInCollaborators(client, object.attachedToClass, object.attachedTo, OpWithMe.Remove)
}

/**
 * @public
 */
export async function subscribe (docClass: Ref<Class<Doc>>, docId: Ref<Doc>): Promise<void> {
  const client = getClient()
  await updateMeInCollaborators(client, docClass, docId, OpWithMe.Add)
}

export async function pinDocNotifyContext (object: DocNotifyContext): Promise<void> {
  const client = getClient()

  await client.updateDoc(object._class, object.space, object._id, {
    isPinned: true
  })
}

export async function unpinDocNotifyContext (object: DocNotifyContext): Promise<void> {
  const client = getClient()

  await client.updateDoc(object._class, object.space, object._id, {
    isPinned: false
  })
}

export async function archiveAll (): Promise<void> {
  const client = InboxNotificationsClientImpl.getClient()

  showPopup(
    MessageBox,
    {
      label: notification.string.ArchiveAllConfirmationTitle,
      message: notification.string.ArchiveAllConfirmationMessage
    },
    'top',
    (result?: boolean) => {
      if (result === true) {
        void client.archiveAllNotifications()
      }
    }
  )
}

export async function readAll (): Promise<void> {
  const client = InboxNotificationsClientImpl.getClient()

  await client.readAllNotifications()
}

export async function unreadAll (): Promise<void> {
  const client = InboxNotificationsClientImpl.getClient()

  await client.unreadAllNotifications()
}

export function isActivityNotification (doc?: InboxNotification): doc is ActivityInboxNotification {
  if (doc === undefined) return false
  return doc._class === notification.class.ActivityInboxNotification
}

export function isMentionNotification (doc?: InboxNotification): doc is MentionInboxNotification {
  if (doc === undefined) return false
  return doc._class === notification.class.MentionInboxNotification
}

export async function getDisplayInboxNotifications (
  notifications: Array<WithLookup<InboxNotification>>,
  filter: InboxNotificationsFilter = 'all',
  objectClass?: Ref<Class<Doc>>
): Promise<DisplayInboxNotification[]> {
  const result: DisplayInboxNotification[] = []
  const activityNotifications: Array<WithLookup<ActivityInboxNotification>> = []

  for (const notification of notifications) {
    if (filter === 'unread' && notification.isViewed) {
      continue
    }

    if (isActivityNotification(notification)) {
      activityNotifications.push(notification)
    } else {
      result.push(notification)
    }
  }

  const messages: ActivityMessage[] = activityNotifications
    .map((activityNotification) => activityNotification.$lookup?.attachedTo)
    .filter((message): message is ActivityMessage => {
      if (message === undefined) {
        return false
      }
      if (objectClass === undefined) {
        return true
      }
      if (message._class !== activity.class.DocUpdateMessage) {
        return false
      }

      return (message as DocUpdateMessage).objectClass === objectClass
    })

  const combinedMessages = await combineActivityMessages(
    messages.sort(activityMessagesComparator),
    SortingOrder.Descending
  )

  for (const message of combinedMessages) {
    if (message._class === activity.class.DocUpdateMessage) {
      const displayMessage = message as DisplayDocUpdateMessage
      const ids: Array<Ref<ActivityMessage>> = displayMessage.combinedMessagesIds ?? [displayMessage._id]
      const activityNotification = activityNotifications.find(({ attachedTo }) => attachedTo === message._id)

      if (activityNotification === undefined) {
        continue
      }

      const combined = activityNotifications.filter(({ attachedTo }) => ids.includes(attachedTo))

      const displayNotification = {
        ...activityNotification,
        combinedIds: combined.map(({ _id }) => _id),
        combinedMessages: combined
          .map((a) => a.$lookup?.attachedTo)
          .filter((m): m is ActivityMessage => m !== undefined)
      }

      result.push(displayNotification)
    } else {
      const activityNotification = activityNotifications.find(({ attachedTo }) => attachedTo === message._id)
      if (activityNotification !== undefined) {
        result.push({
          ...activityNotification,
          combinedIds: [activityNotification._id],
          combinedMessages: [message]
        })
      }
    }
  }

  return result.sort(
    (notification1, notification2) =>
      (notification2.createdOn ?? notification2.modifiedOn) - (notification1.createdOn ?? notification1.modifiedOn)
  )
}

export async function getDisplayInboxData (
  notificationsByContext: Map<Ref<DocNotifyContext>, InboxNotification[]>,
  filter: InboxNotificationsFilter = 'all',
  objectClass?: Ref<Class<Doc>>
): Promise<InboxData> {
  const result: InboxData = new Map()

  for (const key of notificationsByContext.keys()) {
    const notifications = notificationsByContext.get(key) ?? []

    const displayNotifications = await getDisplayInboxNotifications(notifications, filter, objectClass)

    if (displayNotifications.length > 0) {
      result.set(key, displayNotifications)
    }
  }

  return result
}

export async function hasInboxNotifications (
  notificationsByContext: Map<Ref<DocNotifyContext>, InboxNotification[]>
): Promise<boolean> {
  const unreadInboxData = await getDisplayInboxData(notificationsByContext, 'unread')

  return unreadInboxData.size > 0
}

export async function getNotificationsCount (
  context: DocNotifyContext | undefined,
  notifications: InboxNotification[] = []
): Promise<number> {
  if (context === undefined || notifications.length === 0) {
    return 0
  }

  const unreadNotifications = await getDisplayInboxNotifications(notifications, 'unread')

  return unreadNotifications.length
}

export async function resolveLocation (loc: Location): Promise<ResolvedLocation | undefined> {
  if (loc.path[2] !== notificationId) {
    return undefined
  }

  const [_id, _class] = decodeObjectURI(loc.path[3])

  if (_id === undefined || _class === undefined) {
    return {
      loc: {
        path: [loc.path[0], loc.path[1], notificationId],
        fragment: undefined
      },
      defaultLocation: {
        path: [loc.path[0], loc.path[1], notificationId],
        fragment: undefined
      }
    }
  }

  return await generateLocation(loc, _id, _class)
}

async function generateLocation (
  loc: Location,
  _id: Ref<Doc>,
  _class: Ref<Class<Doc>>
): Promise<ResolvedLocation | undefined> {
  const client = getClient()

  const appComponent = loc.path[0] ?? ''
  const workspace = loc.path[1] ?? ''
  const threadId = loc.path[4] as Ref<ActivityMessage> | undefined

  const thread =
    threadId !== undefined ? await client.findOne(activity.class.ActivityMessage, { _id: threadId }) : undefined

  if (thread === undefined) {
    return {
      loc: {
        path: [appComponent, workspace, notificationId, encodeObjectURI(_id, _class)],
        fragment: undefined,
        query: { ...loc.query }
      },
      defaultLocation: {
        path: [appComponent, workspace, notificationId, encodeObjectURI(_id, _class)],
        fragment: undefined,
        query: { ...loc.query }
      }
    }
  }

  return {
    loc: {
      path: [appComponent, workspace, notificationId, encodeObjectURI(_id, _class), threadId as string],
      fragment: undefined,
      query: { ...loc.query }
    },
    defaultLocation: {
      path: [appComponent, workspace, notificationId, encodeObjectURI(_id, _class), threadId as string],
      fragment: undefined,
      query: { ...loc.query }
    }
  }
}

export function openInboxDoc (
  _id?: Ref<Doc>,
  _class?: Ref<Class<Doc>>,
  thread?: Ref<ActivityMessage>,
  message?: Ref<ActivityMessage>
): void {
  const loc = getLocation()

  if (loc.path[2] !== notificationId) {
    return
  }

  if (_id === undefined || _class === undefined) {
    loc.query = { message: null }
    loc.path.length = 3
    navigate(loc)
    return
  }

  loc.path[3] = encodeObjectURI(_id, _class)

  if (thread !== undefined) {
    loc.path[4] = thread
    loc.path.length = 5
  } else {
    loc.path[4] = ''
    loc.path.length = 4
  }

  loc.query = { ...loc.query, message: message ?? null }

  navigate(loc)
}

export const pushAllowed = writable<boolean>(false)

export async function checkPermission (value: boolean): Promise<boolean> {
  if (!value) return true
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    try {
      const loc = getCurrentLocation()
      const registration = await navigator.serviceWorker.getRegistration(`/${loc.path[0]}/${loc.path[1]}`)
      if (registration !== undefined) {
        const current = await registration.pushManager.getSubscription()
        const res = current !== null
        pushAllowed.set(current !== null)
        void registration.update()
        addWorkerListener()
        return res
      }
    } catch {
      pushAllowed.set(false)
      return false
    }
  }
  pushAllowed.set(false)
  return false
}

function addWorkerListener (): void {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data !== undefined && event.data.type === 'notification-click') {
      const { url, _id } = event.data
      if (url !== undefined) {
        navigate(parseLocation(new URL(url)))
      }
      if (_id !== undefined) {
        void cleanTag(_id)
      }
    }
  })
}

export function pushAvailable (): boolean {
  const publicKey = getMetadata(notification.metadata.PushPublicKey)
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    publicKey !== undefined &&
    'Notification' in window &&
    Notification.permission !== 'denied'
  )
}

export async function subscribePush (): Promise<boolean> {
  const client = getClient()
  const publicKey = getMetadata(notification.metadata.PushPublicKey)
  if ('serviceWorker' in navigator && 'PushManager' in window && publicKey !== undefined) {
    try {
      const loc = getCurrentLocation()
      let registration = await navigator.serviceWorker.getRegistration(`/${loc.path[0]}/${loc.path[1]}`)
      if (registration !== undefined) {
        await registration.update()
      } else {
        registration = await navigator.serviceWorker.register('/serviceWorker.js', {
          scope: `/${loc.path[0]}/${loc.path[1]}`
        })
      }
      const current = await registration.pushManager.getSubscription()
      if (current == null) {
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: publicKey
        })
        await client.createDoc(notification.class.PushSubscription, notification.space.Notifications, {
          user: getCurrentAccount()._id,
          endpoint: subscription.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
            auth: arrayBufferToBase64(subscription.getKey('auth'))
          }
        })
      } else {
        const exists = await client.findOne(notification.class.PushSubscription, {
          user: getCurrentAccount()._id,
          endpoint: current.endpoint
        })
        if (exists === undefined) {
          await client.createDoc(notification.class.PushSubscription, notification.space.Notifications, {
            user: getCurrentAccount()._id,
            endpoint: current.endpoint,
            keys: {
              p256dh: arrayBufferToBase64(current.getKey('p256dh')),
              auth: arrayBufferToBase64(current.getKey('auth'))
            }
          })
        }
      }
      addWorkerListener()
      pushAllowed.set(true)
      return true
    } catch (err) {
      console.error('Service Worker registration failed:', err)
      pushAllowed.set(false)
      return false
    }
  }
  pushAllowed.set(false)
  return false
}

async function cleanTag (_id: Ref<Doc>): Promise<void> {
  const client = getClient()
  const notifications = await client.findAll(notification.class.BrowserNotification, {
    tag: _id,
    status: NotificationStatus.New
  })
  for (const notification of notifications) {
    await client.update(notification, { status: NotificationStatus.Notified })
  }
}

function arrayBufferToBase64 (buffer: ArrayBuffer | null): string {
  if (buffer != null) {
    const bytes = new Uint8Array(buffer)
    const array = Array.from(bytes)
    const binary = String.fromCharCode.apply(null, array)
    return btoa(binary)
  } else {
    return ''
  }
}

export function notificationsComparator (notifications1: InboxNotification, notifications2: InboxNotification): number {
  const createdOn1 = notifications1.createdOn ?? 0
  const createdOn2 = notifications2.createdOn ?? 0

  if (createdOn1 > createdOn2) {
    return -1
  }
  if (createdOn1 < createdOn2) {
    return 1
  }

  return 0
}
