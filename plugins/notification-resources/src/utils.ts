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
  inboxId,
  type ActivityInboxNotification,
  type Collaborators,
  type DisplayActivityInboxNotification,
  type DisplayInboxNotification,
  type DocNotifyContext,
  type InboxNotification
} from '@hcengineering/notification'
import { getClient } from '@hcengineering/presentation'
import { getLocation, navigate, type Location, type ResolvedLocation } from '@hcengineering/ui'
import { get } from 'svelte/store'

import { InboxNotificationsClientImpl } from './inboxNotificationsClient'
import { type InboxNotificationsFilter } from './types'

/**
 * @public
 */
export async function hasMarkAsReadAction (doc: DisplayInboxNotification): Promise<boolean> {
  const inboxNotificationsClient = InboxNotificationsClientImpl.getClient()

  const combinedIds =
    doc._class === notification.class.ActivityInboxNotification
      ? (doc as DisplayActivityInboxNotification).combinedIds
      : [doc._id]

  return get(inboxNotificationsClient.inboxNotifications).some(
    ({ _id, isViewed }) => combinedIds.includes(_id) && !isViewed
  )
}

/**
 * @public
 */
export async function hasMarkAsUnreadAction (doc: DisplayInboxNotification): Promise<boolean> {
  const canRead = await hasMarkAsReadAction(doc)

  return !canRead
}

/**
 * @public
 */
export async function markAsReadInboxNotification (doc: DisplayInboxNotification): Promise<void> {
  const notificationsClient = InboxNotificationsClientImpl.getClient()
  const isActivityNotification = doc._class === notification.class.ActivityInboxNotification

  const ids = (isActivityNotification ? (doc as DisplayActivityInboxNotification).combinedIds : [doc._id]) ?? []

  if (isActivityNotification) {
    await updateLastViewedTimestampOnRead(doc as WithLookup<ActivityInboxNotification>, ids)
  }

  const doneOp = await getClient().measure('markAsRead')
  const ops = getClient().apply(doc._id)
  try {
    await notificationsClient.readNotifications(ops, ids)
  } finally {
    await ops.commit()
    await doneOp()
  }
}

async function updateLastViewedTimestampOnRead (
  doc: WithLookup<ActivityInboxNotification>,
  viewedIds: Array<Ref<InboxNotification>>
): Promise<void> {
  const notificationsClient = InboxNotificationsClientImpl.getClient()
  const client = getClient()

  const context = get(notificationsClient.docNotifyContexts).find(({ _id }) => _id === doc.docNotifyContext)

  if (context === undefined) {
    return
  }

  const unViewed = get(notificationsClient.activityInboxNotifications).filter(
    ({ _id, isViewed, docNotifyContext }) => context._id === docNotifyContext && !isViewed && !viewedIds.includes(_id)
  )

  let lastViewedTimestamp = context?.lastViewedTimestamp

  if (unViewed.length === 0) {
    lastViewedTimestamp = doc?.$lookup?.attachedTo?.createdOn ?? context.lastViewedTimestamp
  } else {
    const firstUnViewed = unViewed[unViewed.length - 1]

    const hasNotificationsBefore = (firstUnViewed.createdOn ?? 0) < (doc.createdOn ?? 0)

    if (!hasNotificationsBefore) {
      lastViewedTimestamp = doc?.$lookup?.attachedTo?.createdOn ?? context.lastViewedTimestamp
    }
  }

  if (lastViewedTimestamp !== undefined && lastViewedTimestamp > (context.lastViewedTimestamp ?? 0)) {
    await client.update(context, { lastViewedTimestamp })
  }
}

async function updateLastViewedOnUnread (doc: WithLookup<ActivityInboxNotification>): Promise<void> {
  const notificationsClient = InboxNotificationsClientImpl.getClient()
  const client = getClient()

  const context = get(notificationsClient.docNotifyContexts).find(({ _id }) => _id === doc.docNotifyContext)

  if (context === undefined) {
    return
  }

  const messageTimestamp = doc?.$lookup?.attachedTo?.createdOn

  if (messageTimestamp === undefined || messageTimestamp === 0) {
    return
  }

  const lastViewedTimestamp = messageTimestamp - 1

  if (lastViewedTimestamp < (context.lastViewedTimestamp ?? 0)) {
    await client.update(context, { lastViewedTimestamp })
  }
}

/**
 * @public
 */
export async function markAsUnreadInboxNotification (doc: DisplayInboxNotification): Promise<void> {
  const inboxNotificationsClient = InboxNotificationsClientImpl.getClient()
  const isActivityNotification = doc._class === notification.class.ActivityInboxNotification

  const ids = isActivityNotification ? (doc as DisplayActivityInboxNotification).combinedIds : [doc._id]

  if (isActivityNotification) {
    await updateLastViewedOnUnread(doc as WithLookup<ActivityInboxNotification>)
  }

  const doneOp = await getClient().measure('unreadNotifications')
  const ops = getClient().apply(doc._id)
  try {
    await inboxNotificationsClient.unreadNotifications(ops, ids)
  } finally {
    await ops.commit()
    await doneOp()
  }
}

export async function deleteInboxNotification (doc: DisplayInboxNotification): Promise<void> {
  const inboxNotificationsClient = InboxNotificationsClientImpl.getClient()
  const isActivityNotification = doc._class === notification.class.ActivityInboxNotification

  const ids = isActivityNotification ? (doc as DisplayActivityInboxNotification).combinedIds : [doc._id]

  if (isActivityNotification) {
    await updateLastViewedTimestampOnRead(doc as WithLookup<ActivityInboxNotification>, ids)
  }

  const doneOp = await getClient().measure('deleteNotifications')
  const ops = getClient().apply(doc._id)
  try {
    await inboxNotificationsClient.deleteNotifications(ops, ids)
  } finally {
    await ops.commit()
    await doneOp()
  }
}

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

export async function hasHiddenDocNotifyContext (contexts: DocNotifyContext[]): Promise<boolean> {
  return contexts.some(({ hidden }) => hidden)
}

export async function hideDocNotifyContext (notifyContext: DocNotifyContext): Promise<void> {
  const client = getClient()
  await client.update(notifyContext, { hidden: true })
  await deleteContextNotifications(notifyContext)
}

export async function unHideDocNotifyContext (notifyContext: DocNotifyContext): Promise<void> {
  const client = getClient()
  await client.update(notifyContext, { hidden: false, lastViewedTimestamp: Date.now() })
}

export async function isDocNotifyContextHidden (notifyContext: DocNotifyContext): Promise<boolean> {
  return notifyContext.hidden
}

export async function isDocNotifyContextVisible (notifyContext: DocNotifyContext): Promise<boolean> {
  return !notifyContext.hidden
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
  const notificationToUnread = inboxNotifications[0]

  if (notificationToUnread === undefined) {
    return
  }

  const doneOp = await getClient().measure('unReadNotifyContext')
  const ops = getClient().apply(doc._id)

  try {
    await inboxClient.unreadNotifications(ops, [notificationToUnread._id])

    if (notificationToUnread._class === notification.class.ActivityInboxNotification) {
      const activityNotification = notificationToUnread as WithLookup<ActivityInboxNotification>
      const createdOn = activityNotification?.$lookup?.attachedTo?.createdOn

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
export async function deleteContextNotifications (doc?: DocNotifyContext): Promise<void> {
  if (doc === undefined) {
    return
  }

  const inboxClient = InboxNotificationsClientImpl.getClient()
  const inboxNotifications = get(inboxClient.inboxNotificationsByContext).get(doc._id) ?? []

  const doneOp = await getClient().measure('deleteContextNotifications')
  const ops = getClient().apply(doc._id)
  try {
    await inboxClient.deleteNotifications(
      ops,
      inboxNotifications.map(({ _id }) => _id)
    )
    await ops.update(doc, { lastViewedTimestamp: Date.now() })
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
  await client.remove(object)
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

export async function getDisplayInboxNotifications (
  notificationsByContext: Map<Ref<DocNotifyContext>, InboxNotification[]>,
  filter: InboxNotificationsFilter = 'all',
  objectClass?: Ref<Class<Doc>>
): Promise<DisplayInboxNotification[]> {
  const filteredNotifications = Array.from(notificationsByContext.values())
    .flat()
    .filter(({ isViewed }) => {
      switch (filter) {
        case 'all':
          return true
        case 'unread':
          return !isViewed
        case 'read':
          return !!isViewed
        default:
          return false
      }
    })

  const activityNotifications = filteredNotifications.filter(
    (n): n is WithLookup<ActivityInboxNotification> => n._class === notification.class.ActivityInboxNotification
  )
  const displayNotifications: DisplayInboxNotification[] = filteredNotifications.filter(
    ({ _class }) => _class !== notification.class.ActivityInboxNotification
  )

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

      const displayNotification = {
        ...activityNotification,
        combinedIds: activityNotifications.filter(({ attachedTo }) => ids.includes(attachedTo)).map(({ _id }) => _id)
      }

      displayNotifications.push(displayNotification)
    } else {
      const activityNotification = activityNotifications.find(({ attachedTo }) => attachedTo === message._id)
      if (activityNotification !== undefined) {
        displayNotifications.push({
          ...activityNotification,
          combinedIds: [activityNotification._id]
        })
      }
    }
  }

  return displayNotifications.sort(
    (notification1, notification2) =>
      (notification2.createdOn ?? notification2.modifiedOn) - (notification1.createdOn ?? notification1.modifiedOn)
  )
}

export async function hasInboxNotifications (
  notificationsByContext: Map<Ref<DocNotifyContext>, InboxNotification[]>
): Promise<boolean> {
  const displayNotifications = await getDisplayInboxNotifications(notificationsByContext)

  return displayNotifications.some(({ isViewed }) => !isViewed)
}

export async function getNotificationsCount (
  context: DocNotifyContext | undefined,
  notifications: InboxNotification[] = []
): Promise<number> {
  if (context === undefined || notifications.length === 0) {
    return 0
  }

  const displayNotifications = await getDisplayInboxNotifications(new Map([[context._id, notifications]]))

  return displayNotifications.filter(({ isViewed }) => !isViewed).length
}

export async function resolveLocation (loc: Location): Promise<ResolvedLocation | undefined> {
  if (loc.path[2] !== inboxId) {
    return undefined
  }

  const contextId = loc.path[3] as Ref<DocNotifyContext> | undefined

  if (contextId === undefined) {
    return {
      loc: {
        path: [loc.path[0], loc.path[1], inboxId],
        fragment: undefined
      },
      defaultLocation: {
        path: [loc.path[0], loc.path[1], inboxId],
        fragment: undefined
      }
    }
  }

  return await generateLocation(loc, contextId)
}

async function generateLocation (
  loc: Location,
  contextId: Ref<DocNotifyContext>
): Promise<ResolvedLocation | undefined> {
  const client = getClient()

  const appComponent = loc.path[0] ?? ''
  const workspace = loc.path[1] ?? ''
  const threadId = loc.path[4] as Ref<ActivityMessage> | undefined
  const messageId = loc.query?.message as Ref<ActivityMessage> | undefined

  const contextNotification = await client.findOne(notification.class.InboxNotification, {
    docNotifyContext: contextId
  })

  if (contextNotification === undefined) {
    return {
      loc: {
        path: [loc.path[0], loc.path[1], inboxId],
        fragment: undefined
      },
      defaultLocation: {
        path: [loc.path[0], loc.path[1], inboxId],
        fragment: undefined
      }
    }
  }

  const thread =
    threadId !== undefined ? await client.findOne(activity.class.ActivityMessage, { _id: messageId }) : undefined
  const message =
    messageId !== undefined ? await client.findOne(activity.class.ActivityMessage, { _id: messageId }) : undefined

  if (thread === undefined) {
    return {
      loc: {
        path: [appComponent, workspace, inboxId, contextId],
        fragment: undefined,
        query: { ...loc.query, message: message !== undefined ? (messageId as string) : null }
      },
      defaultLocation: {
        path: [appComponent, workspace, inboxId, contextId],
        fragment: undefined,
        query: { ...loc.query, message: message !== undefined ? (messageId as string) : null }
      }
    }
  }

  return {
    loc: {
      path: [appComponent, workspace, inboxId, contextId, threadId as string],
      fragment: undefined,
      query: { ...loc.query, message: message !== undefined ? (messageId as string) : null }
    },
    defaultLocation: {
      path: [appComponent, workspace, inboxId, contextId, threadId as string],
      fragment: undefined,
      query: { ...loc.query, message: message !== undefined ? (messageId as string) : null }
    }
  }
}

export function openInboxDoc (
  contextId?: Ref<DocNotifyContext>,
  thread?: Ref<ActivityMessage>,
  message?: Ref<ActivityMessage>
): void {
  const loc = getLocation()

  if (loc.path[2] !== inboxId) {
    return
  }

  if (contextId === undefined) {
    loc.query = { ...loc.query, message: null }
    loc.path.length = 3
    navigate(loc)
    return
  }

  loc.path[3] = contextId

  if (thread !== undefined) {
    loc.path[4] = thread
  } else {
    loc.path[4] = ''
    loc.path.length = 4
  }

  loc.query = { ...loc.query, message: message ?? null }

  navigate(loc)
}
