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
import {
  type Class,
  type Doc,
  type DocumentUpdate,
  getCurrentAccount,
  type Ref,
  SortingOrder,
  type TxOperations,
  type WithLookup
} from '@hcengineering/core'
import notification, {
  type Collaborators,
  type DocNotifyContext,
  inboxId,
  type InboxNotification
} from '@hcengineering/notification'
import { getClient } from '@hcengineering/presentation'
import { get } from 'svelte/store'
import { getCurrentLocation, type Location, type ResolvedLocation } from '@hcengineering/ui'
import { InboxNotificationsClientImpl } from './inboxNotificationsClient'
import activity, {
  type ActivityMessage,
  type DisplayActivityMessage,
  type DisplayDocUpdateMessage,
  type DocUpdateMessage
} from '@hcengineering/activity'
import { activityMessagesComparator, combineActivityMessages } from '@hcengineering/activity-resources'

function insideInbox (): boolean {
  const loc = getCurrentLocation()

  return loc.path[2] === inboxId
}

/**
 * @public
 */
export async function hasMarkAsUnreadAction (message: DisplayActivityMessage): Promise<boolean> {
  if (!insideInbox()) {
    return false
  }

  const inboxNotificationsClient = InboxNotificationsClientImpl.getClient()
  const combinedIds =
    message._class === activity.class.DocUpdateMessage
      ? (message as DisplayDocUpdateMessage).combinedMessagesIds
      : undefined
  const ids: Array<Ref<ActivityMessage>> = [message._id, ...(combinedIds ?? [])]

  return get(inboxNotificationsClient.inboxNotifications).some(
    ({ attachedTo, isViewed }) => ids.includes(attachedTo) && isViewed
  )
}

export async function hasMarkAsReadAction (message: DisplayActivityMessage): Promise<boolean> {
  if (!insideInbox()) {
    return false
  }

  const inboxNotificationsClient = InboxNotificationsClientImpl.getClient()
  const combinedIds =
    message._class === activity.class.DocUpdateMessage
      ? (message as DisplayDocUpdateMessage).combinedMessagesIds
      : undefined
  const ids: Array<Ref<ActivityMessage>> = [message._id, ...(combinedIds ?? [])]

  return get(inboxNotificationsClient.inboxNotifications).some(
    ({ attachedTo, isViewed }) => ids.includes(attachedTo) && !isViewed
  )
}

export async function hasDeleteNotificationAction (): Promise<boolean> {
  return insideInbox()
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
}

export async function unHideDocNotifyContext (notifyContext: DocNotifyContext): Promise<void> {
  const client = getClient()
  await client.update(notifyContext, { hidden: false })
}

export async function isDocNotifyContextHidden (notifyContext: DocNotifyContext): Promise<boolean> {
  return notifyContext.hidden
}

export async function isDocNotifyContextVisible (notifyContext: DocNotifyContext): Promise<boolean> {
  return !notifyContext.hidden
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

/**
 * @public
 */
export async function markAsReadInboxNotification (message: DisplayActivityMessage): Promise<void> {
  const inboxNotificationsClient = InboxNotificationsClientImpl.getClient()
  const combinedIds =
    message._class === activity.class.DocUpdateMessage
      ? (message as DisplayDocUpdateMessage).combinedMessagesIds
      : undefined
  const ids: Array<Ref<ActivityMessage>> = [message._id, ...(combinedIds ?? [])]

  await inboxNotificationsClient.readMessages(ids)
}

/**
 * @public
 */
export async function markAsUnreadInboxNotification (message: DisplayActivityMessage): Promise<void> {
  const inboxNotificationsClient = InboxNotificationsClientImpl.getClient()
  const combinedIds =
    message._class === activity.class.DocUpdateMessage
      ? (message as DisplayDocUpdateMessage).combinedMessagesIds
      : undefined
  const ids: Array<Ref<ActivityMessage>> = [message._id, ...(combinedIds ?? [])]

  await inboxNotificationsClient.unreadMessages(ids)
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

export async function deleteInboxNotification (message: DisplayActivityMessage): Promise<void> {
  const inboxNotificationsClient = InboxNotificationsClientImpl.getClient()
  const combinedIds =
    message._class === activity.class.DocUpdateMessage
      ? (message as DisplayDocUpdateMessage).combinedMessagesIds
      : undefined
  const ids: Array<Ref<ActivityMessage>> = [message._id, ...(combinedIds ?? [])]

  await inboxNotificationsClient.deleteMessagesNotifications(ids)
}

export async function resolveLocation (loc: Location): Promise<ResolvedLocation | undefined> {
  if (loc.path[2] !== inboxId) {
    return undefined
  }

  const availableSpecies = ['all', 'reactions']
  const special = loc.path[3]

  if (!availableSpecies.includes(special)) {
    return {
      loc: {
        path: [loc.path[0], loc.path[1], inboxId, 'all'],
        fragment: undefined
      },
      defaultLocation: {
        path: [loc.path[0], loc.path[1], inboxId, 'all'],
        fragment: undefined
      }
    }
  }

  const _id = loc.path[4] as Ref<ActivityMessage> | undefined

  if (_id !== undefined) {
    return await generateLocation(loc, _id)
  }
}

async function generateLocation (loc: Location, _id: Ref<ActivityMessage>): Promise<ResolvedLocation | undefined> {
  const client = getClient()

  const appComponent = loc.path[0] ?? ''
  const workspace = loc.path[1] ?? ''
  const special = loc.path[3]

  const availableSpecies = ['all', 'reactions']

  if (!availableSpecies.includes(special)) {
    return {
      loc: {
        path: [appComponent, workspace, inboxId, 'all'],
        fragment: undefined
      },
      defaultLocation: {
        path: [appComponent, workspace, inboxId, 'all'],
        fragment: undefined
      }
    }
  }

  const message = await client.findOne(activity.class.ActivityMessage, { _id })

  if (message === undefined) {
    return {
      loc: {
        path: [appComponent, workspace, inboxId, special],
        fragment: undefined
      },
      defaultLocation: {
        path: [appComponent, workspace, inboxId, special],
        fragment: undefined
      }
    }
  }

  return {
    loc: {
      path: [appComponent, workspace, inboxId, special, _id],
      fragment: undefined
    },
    defaultLocation: {
      path: [appComponent, workspace, inboxId, special, _id],
      fragment: undefined
    }
  }
}

export function getDisplayActivityMessagesByNotifications (
  inboxNotifications: Array<WithLookup<InboxNotification>>,
  docNotifyContextById: Map<Ref<DocNotifyContext>, DocNotifyContext>,
  filter: 'all' | 'read' | 'unread',
  objectClass?: Ref<Class<Doc>>
): DisplayActivityMessage[] {
  const messages = inboxNotifications
    .filter(({ docNotifyContext, isViewed }) => {
      const update = docNotifyContextById.get(docNotifyContext)
      const isVisible = update !== undefined && !update.hidden

      if (!isVisible) {
        return false
      }

      switch (filter) {
        case 'unread':
          return !isViewed
        case 'all':
          return true
        case 'read':
          return !!isViewed
      }

      return false
    })
    .map(({ $lookup }) => $lookup?.attachedTo)
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
    .sort(activityMessagesComparator)

  return combineActivityMessages(messages, SortingOrder.Descending)
}
