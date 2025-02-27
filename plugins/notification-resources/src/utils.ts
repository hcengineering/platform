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
import {
  activityMessagesComparator,
  combineActivityMessages,
  isActivityMessageClass,
  isReactionMessage,
  messageInFocus
} from '@hcengineering/activity-resources'
import { Analytics } from '@hcengineering/analytics'
import chunter, { type ThreadMessage } from '@hcengineering/chunter'
import core, {
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
  notificationId,
  type ActivityInboxNotification,
  type BaseNotificationType,
  type Collaborators,
  type DisplayInboxNotification,
  type DocNotifyContext,
  type InboxNotification,
  type MentionInboxNotification,
  type NotificationProvider,
  type NotificationProviderSetting,
  type NotificationTypeSetting
} from '@hcengineering/notification'
import { getMetadata } from '@hcengineering/platform'
import { MessageBox, createQuery, getClient } from '@hcengineering/presentation'
import {
  getCurrentLocation,
  getLocation,
  locationStorageKeyId,
  navigate,
  parseLocation,
  showPopup,
  type Location,
  type ResolvedLocation
} from '@hcengineering/ui'
import view, { decodeObjectURI, encodeObjectURI, type LinkIdProvider } from '@hcengineering/view'
import { getObjectLinkId, parseLinkId } from '@hcengineering/view-resources'
import { get, writable } from 'svelte/store'
import type { LocationData } from '@hcengineering/workbench'

import { InboxNotificationsClientImpl } from './inboxNotificationsClient'
import { type InboxData, type InboxNotificationsFilter } from './types'

export const providersSettings = writable<NotificationProviderSetting[]>([])
export const typesSettings = writable<NotificationTypeSetting[]>([])

const providerSettingsQuery = createQuery(true)
const typeSettingsQuery = createQuery(true)

export function loadNotificationSettings (): void {
  providerSettingsQuery.query(
    notification.class.NotificationProviderSetting,
    { space: core.space.Workspace },
    (res) => {
      providersSettings.set(res)
    }
  )

  typeSettingsQuery.query(notification.class.NotificationTypeSetting, { space: core.space.Workspace }, (res) => {
    typesSettings.set(res)
  })
}

loadNotificationSettings()

export async function hasDocNotifyContextPinAction (docNotifyContext: DocNotifyContext): Promise<boolean> {
  return !docNotifyContext.isPinned
}

export async function hasDocNotifyContextUnpinAction (docNotifyContext: DocNotifyContext): Promise<boolean> {
  return docNotifyContext.isPinned
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

  const ops = getClient().apply(undefined, 'readNotifyContext', true)
  try {
    await inboxClient.readNotifications(
      ops,
      inboxNotifications.map(({ _id }) => _id)
    )
    await ops.update(doc, { lastViewedTimestamp: Date.now() })
  } finally {
    await ops.commit()
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

  const ops = getClient().apply(undefined, 'unReadNotifyContext', true)

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
  }
}

/**
 * @public
 */
export async function archiveContextNotifications (doc?: DocNotifyContext): Promise<void> {
  if (doc === undefined) {
    return
  }

  const ops = getClient().apply(undefined, 'archiveContextNotifications', true)

  try {
    const notifications = await ops.findAll(
      notification.class.InboxNotification,
      { docNotifyContext: doc._id, archived: false },
      { projection: { _id: 1, _class: 1, space: 1 } }
    )

    for (const notification of notifications) {
      await ops.updateDoc(notification._class, notification.space, notification._id, { archived: true, isViewed: true })
    }
    await ops.update(doc, { lastViewedTimestamp: Date.now() })
  } finally {
    await ops.commit()
  }
}

/**
 * @public
 */
export async function unarchiveContextNotifications (doc?: DocNotifyContext): Promise<void> {
  if (doc === undefined) {
    return
  }

  const ops = getClient().apply(undefined, 'unarchiveContextNotifications', true)

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
  }
}

export async function subscribeDoc (
  client: TxOperations,
  docClass: Ref<Class<Doc>>,
  docId: Ref<Doc>,
  op: 'add' | 'remove',
  doc?: Doc
): Promise<void> {
  const myAcc = getCurrentAccount()
  const hierarchy = client.getHierarchy()

  if (hierarchy.classHierarchyMixin(docClass, notification.mixin.ClassCollaborators) === undefined) return

  const target = doc ?? (await client.findOne(docClass, { _id: docId }))
  if (target === undefined) return
  if (hierarchy.hasMixin(target, notification.mixin.Collaborators)) {
    const collab = hierarchy.as(target, notification.mixin.Collaborators)
    let collabUpdate: DocumentUpdate<Collaborators> | undefined
    const includesMe = collab.collaborators.includes(myAcc.uuid)

    if (includesMe && op === 'remove') {
      collabUpdate = {
        $pull: {
          collaborators: myAcc.uuid
        }
      }
    } else if (!includesMe && op === 'add') {
      collabUpdate = {
        $push: {
          collaborators: myAcc.uuid
        }
      }
    }

    if (collabUpdate !== undefined) {
      await client.updateMixin(collab._id, collab._class, collab.space, notification.mixin.Collaborators, collabUpdate)
    }
  } else if (op === 'add') {
    await client.createMixin(docId, docClass, target.space, notification.mixin.Collaborators, {
      collaborators: [myAcc.uuid]
    })
  }
}

/**
 * @public
 */
export async function unsubscribe (context: DocNotifyContext): Promise<void> {
  const client = getClient()
  await subscribeDoc(client, context.objectClass, context.objectId, 'remove')
}

/**
 * @public
 */
export async function subscribe (docClass: Ref<Class<Doc>>, docId: Ref<Doc>): Promise<void> {
  const client = getClient()
  await subscribeDoc(client, docClass, docId, 'add')
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
      message: notification.string.ArchiveAllConfirmationMessage,
      action: async () => {
        await client.archiveAllNotifications()
      }
    },
    'top'
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
  _id: string,
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

async function navigateToInboxDoc (
  providers: LinkIdProvider[],
  context: Ref<DocNotifyContext>,
  _id?: Ref<Doc>,
  _class?: Ref<Class<Doc>>,
  thread?: Ref<ActivityMessage>,
  message?: Ref<ActivityMessage>
): Promise<void> {
  const loc = getLocation()

  if (loc.path[2] !== notificationId) {
    return
  }

  if (_id === undefined || _class === undefined) {
    resetInboxContext()
    return
  }

  const id = await getObjectLinkId(providers, _id, _class)

  loc.path[3] = encodeObjectURI(id, _class)

  if (thread !== undefined) {
    loc.path[4] = thread
    loc.path.length = 5
  } else {
    loc.path[4] = ''
    loc.path.length = 4
  }

  loc.query = { ...loc.query, context, message: message ?? null }
  messageInFocus.set(message)
  Analytics.handleEvent('inbox.ReadDoc', { objectId: id, objectClass: _class, thread, message })
  navigate(loc)
}

export function resetInboxContext (): void {
  const loc = getLocation()

  if (loc.path[2] !== notificationId) {
    return
  }

  loc.query = { message: null }
  loc.path.length = 3

  localStorage.setItem(`${locationStorageKeyId}_${notificationId}`, JSON.stringify(loc))

  navigate(loc)
}

export async function selectInboxContext (
  linkProviders: LinkIdProvider[],
  context: DocNotifyContext,
  notification?: WithLookup<InboxNotification>,
  object?: Doc
): Promise<void> {
  const client = getClient()
  const hierarchy = client.getHierarchy()
  const { objectId, objectClass } = context
  const loc = getCurrentLocation()

  if (isMentionNotification(notification) && isActivityMessageClass(notification.mentionedInClass)) {
    const selectedMsg = notification.mentionedIn as Ref<ActivityMessage>

    void navigateToInboxDoc(
      linkProviders,
      context._id,
      objectId,
      objectClass,
      isActivityMessageClass(objectClass) ? (objectId as Ref<ActivityMessage>) : undefined,
      selectedMsg
    )

    return
  }
  if (hierarchy.isDerived(objectClass, activity.class.ActivityMessage)) {
    const message = (notification as WithLookup<ActivityInboxNotification>)?.$lookup?.attachedTo

    if (objectClass === chunter.class.ThreadMessage) {
      const thread =
        object?._id === objectId
          ? (object as ThreadMessage)
          : await client.findOne(
            chunter.class.ThreadMessage,
            {
              _id: objectId as Ref<ThreadMessage>
            },
            { projection: { _id: 1, attachedTo: 1 } }
          )

      void navigateToInboxDoc(
        linkProviders,
        context._id,
        thread?.objectId ?? objectId,
        thread?.objectClass ?? objectClass,
        thread?.attachedTo,
        thread?._id
      )
      return
    }

    if (isReactionMessage(message)) {
      const thread = loc.path[4] === objectId ? objectId : undefined
      const reactedTo =
        (object as ActivityMessage) ??
        (await client.findOne(activity.class.ActivityMessage, { _id: message.attachedTo as Ref<ActivityMessage> }))
      const isThread = hierarchy.isDerived(reactedTo._class, chunter.class.ThreadMessage)
      const channelId = isThread ? (reactedTo as ThreadMessage)?.objectId : reactedTo?.attachedTo ?? objectId
      const channelClass = isThread
        ? (reactedTo as ThreadMessage)?.objectClass
        : reactedTo?.attachedToClass ?? objectClass

      void navigateToInboxDoc(
        linkProviders,
        context._id,
        channelId,
        channelClass,
        thread as Ref<ActivityMessage>,
        objectId as Ref<ActivityMessage>
      )
      return
    }

    const selectedMsg = (notification as ActivityInboxNotification)?.attachedTo
    const thread = selectedMsg !== objectId ? objectId : loc.path[4] === objectId ? objectId : undefined
    const channelId = (object as ActivityMessage)?.attachedTo ?? message?.attachedTo ?? objectId
    const channelClass = (object as ActivityMessage)?.attachedToClass ?? message?.attachedToClass ?? objectClass

    void navigateToInboxDoc(
      linkProviders,
      context._id,
      channelId,
      channelClass,
      thread as Ref<ActivityMessage>,
      selectedMsg ?? (objectId as Ref<ActivityMessage>)
    )
    return
  }

  void navigateToInboxDoc(
    linkProviders,
    context._id,
    objectId,
    objectClass,
    undefined,
    (notification as ActivityInboxNotification)?.attachedTo
  )
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
        await client.createDoc(notification.class.PushSubscription, core.space.Workspace, {
          user: getCurrentAccount().uuid,
          endpoint: subscription.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
            auth: arrayBufferToBase64(subscription.getKey('auth'))
          }
        })
      } else {
        const exists = await client.findOne(notification.class.PushSubscription, {
          user: getCurrentAccount().uuid,
          endpoint: current.endpoint
        })
        if (exists === undefined) {
          await client.createDoc(notification.class.PushSubscription, core.space.Workspace, {
            user: getCurrentAccount().uuid,
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
    tag: _id
  })
  for (const notification of notifications) {
    await client.remove(notification)
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

export function isNotificationAllowed (type: BaseNotificationType, providerId: Ref<NotificationProvider>): boolean {
  const client = getClient()
  const provider = client.getModel().findAllSync(notification.class.NotificationProvider, { _id: providerId })[0]
  if (provider === undefined) return false

  const providerSetting = get(providersSettings).find((it) => it.attachedTo === providerId)
  if (providerSetting !== undefined && !providerSetting.enabled) return false
  if (providerSetting === undefined && !provider.defaultEnabled) return false

  const providerDefaults = client.getModel().findAllSync(notification.class.NotificationProviderDefaults, {})

  if (providerDefaults.some((it) => it.provider === provider._id && it.ignoredTypes.includes(type._id))) {
    return false
  }

  if (provider.ignoreAll === true) {
    const excludedIgnore = providerDefaults.some(
      (it) => provider._id === it.provider && it.excludeIgnore !== undefined && it.excludeIgnore.includes(type._id)
    )

    if (!excludedIgnore) return false
  }

  const setting = get(typesSettings).find((it) => it.attachedTo === provider._id && it.type === type._id)

  if (setting !== undefined) {
    return setting.enabled
  }

  if (providerDefaults.some((it) => it.provider === provider._id && it.enabledTypes.includes(type._id))) {
    return true
  }

  return type.defaultEnabled
}

export async function locationDataResolver (loc: Location): Promise<LocationData> {
  const client = getClient()

  try {
    const [id, _class] = decodeObjectURI(loc.path[3])
    const linkProviders = client.getModel().findAllSync(view.mixin.LinkIdProvider, {})
    const _id: Ref<Doc> | undefined = await parseLinkId(linkProviders, id, _class)

    return {
      objectId: _id,
      objectClass: _class
    }
  } catch (e) {
    return {}
  }
}
