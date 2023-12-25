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
  type Account,
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
  type DocUpdates,
  inboxId,
  type InboxNotification,
  type NotificationClient
} from '@hcengineering/notification'
import { createQuery, getClient } from '@hcengineering/presentation'
import { get, writable } from 'svelte/store'
import { getCurrentLocation, type Location, type ResolvedLocation } from '@hcengineering/ui'
import { InboxNotificationsClientImpl } from './inboxNotificationsClient'
import activity, {
  type ActivityMessage,
  type DisplayActivityMessage,
  type DisplayDocUpdateMessage,
  type DocUpdateMessage
} from '@hcengineering/activity'
import { activityMessagesComparator, combineActivityMessages } from '@hcengineering/activity-resources'

/**
 * @public
 */
export class NotificationClientImpl implements NotificationClient {
  protected static _instance: NotificationClientImpl | undefined = undefined
  readonly docUpdatesStore = writable<Map<Ref<Doc>, DocUpdates>>(new Map())
  docUpdatesMap = new Map<Ref<Doc>, DocUpdates>()
  readonly docUpdates = writable<DocUpdates[]>([])

  private readonly docUpdatesQuery = createQuery(true)

  private readonly user: Ref<Account>

  private constructor () {
    this.user = getCurrentAccount()._id
    this.docUpdatesQuery.query(
      notification.class.DocUpdates,
      {
        user: this.user
      },
      (result) => {
        this.docUpdates.set(result)
        this.docUpdatesMap = new Map(result.map((p) => [p.attachedTo, p]))
        this.docUpdatesStore.set(this.docUpdatesMap)
      }
    )
  }

  static createClient (): NotificationClientImpl {
    NotificationClientImpl._instance = new NotificationClientImpl()
    return NotificationClientImpl._instance
  }

  static getClient (): NotificationClientImpl {
    if (NotificationClientImpl._instance === undefined) {
      NotificationClientImpl._instance = new NotificationClientImpl()
    }
    return NotificationClientImpl._instance
  }

  async read (_id: Ref<Doc>): Promise<void> {
    const client = getClient()
    const docUpdate = this.docUpdatesMap.get(_id)
    if (docUpdate !== undefined) {
      if (docUpdate.txes.some((p) => p.isNew)) {
        docUpdate.txes.forEach((p) => (p.isNew = false))
        await client.update(docUpdate, { txes: docUpdate.txes })
      }
    }
  }

  async forceRead (_id: Ref<Doc>, _class: Ref<Class<Doc>>): Promise<void> {
    const client = getClient()
    const docUpdate = this.docUpdatesMap.get(_id)
    if (docUpdate !== undefined) {
      if (docUpdate.txes.some((p) => p.isNew)) {
        docUpdate.txes.forEach((p) => (p.isNew = false))
        await client.update(docUpdate, { txes: docUpdate.txes })
      }
    } else {
      const doc = await client.findOne(_class, { _id })
      if (doc !== undefined) {
        const hiearachy = client.getHierarchy()
        const collab = hiearachy.as<Doc, Collaborators>(doc, notification.mixin.Collaborators)
        if (collab.collaborators === undefined) {
          await client.createMixin<Doc, Collaborators>(
            collab._id,
            collab._class,
            collab.space,
            notification.mixin.Collaborators,
            {
              collaborators: [this.user]
            }
          )
        } else if (!collab.collaborators.includes(this.user)) {
          await client.updateMixin(collab._id, collab._class, collab.space, notification.mixin.Collaborators, {
            $push: {
              collaborators: this.user
            }
          })
        }

        await client.createDoc(notification.class.DocUpdates, doc.space, {
          attachedTo: _id,
          attachedToClass: _class,
          user: this.user,
          hidden: true,
          txes: []
        })
      }
    }
  }
}

/**
 * @public
 */
export async function hasntNotifications (object: DocUpdates): Promise<boolean> {
  if (object._class !== notification.class.DocUpdates) return false
  return !object.txes.some((p) => p.isNew)
}

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
export async function unsubscribe (object: DocUpdates): Promise<void> {
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
export async function hide (object: DocUpdates | DocUpdates[]): Promise<void> {
  const client = getClient()
  if (Array.isArray(object)) {
    for (const value of object) {
      await client.update(value, {
        hidden: true
      })
    }
  } else {
    await client.update(object, {
      hidden: true
    })
  }
}

/**
 * @public
 */
export async function markAsUnread (object: DocUpdates): Promise<void> {
  const client = getClient()
  if (object.txes.length === 0) return
  const txes = object.txes
  txes[0].isNew = true
  await client.update(object, {
    txes
  })
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
