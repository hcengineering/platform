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

import type { Class, Doc, Ref, WithLookup } from '@hcengineering/core'
import {
  navigate,
  type Location,
  getCurrentResolvedLocation,
  getLocation,
  locationStorageKeyId,
  getCurrentLocation
} from '@hcengineering/ui'
import { inboxId } from '@hcengineering/inbox'
import { type MessageID, type Notification } from '@hcengineering/communication-types'
import { decodeObjectURI, encodeObjectURI } from '@hcengineering/view'
import activity, { type ActivityMessage } from '@hcengineering/activity'
import {
  type ActivityInboxNotification,
  type DocNotifyContext,
  type InboxNotification
} from '@hcengineering/notification'
import { getResource } from '@hcengineering/platform'
import chunter, { type ThreadMessage } from '@hcengineering/chunter'
import { isActivityMessageClass, messageInFocus } from '@hcengineering/activity-resources'
import { getClient } from '@hcengineering/presentation'
import { isMentionNotification, isReactionNotification } from '@hcengineering/notification-resources'
import { type NavigationItem } from './type'

// Url: /inbox/{_class}&{_id}/{thread}?message={messageId}

export function getDocInfoFromLocation (loc: Location): Pick<Doc, '_id' | '_class'> | undefined {
  if (loc.path[2] !== inboxId) {
    return undefined
  }

  const [_id, _class] = decodeObjectURI(loc.path[3])

  if (_id == null || _class == null) return undefined
  if (_id === '' || _class === '') return undefined

  return {
    _id,
    _class
  }
}

export function getMessageInfoFromLocation (loc: Location):
| {
  id: Ref<ActivityMessage> | MessageID
  date?: Date
}
| undefined {
  if (loc.path[2] !== inboxId) return undefined
  if (loc.query?.message == null || loc.query.message === '') return undefined

  const [id, date] = decodeURIComponent(loc.query.message).split(':')

  if (id == null || id === '') return undefined

  return {
    id: id as any,
    date: date != null ? new Date(date) : undefined
  }
}

export function navigateToDoc (
  navItem: NavigationItem,
  doc: Doc,
  notification?: InboxNotification | Notification
): void {
  if (navItem.type === 'legacy') {
    void selectInboxContext(navItem.context, doc, notification as InboxNotification)
    return
  }

  const loc = getCurrentResolvedLocation()

  loc.path[2] = inboxId
  loc.path[3] = encodeObjectURI(navItem._id, navItem._class)

  loc.path[4] = ''
  loc.path.length = 4

  delete loc.fragment

  const nn = notification as Notification | undefined
  if (nn?.message != null) {
    loc.query = {
      ...loc.query,
      message: encodeURIComponent(`${nn.messageId}:${nn.message.created.toISOString()}`)
    }
  } else {
    delete loc.query?.message
  }

  navigate(loc)
}

export function closeDoc (): void {
  const loc = getCurrentResolvedLocation()

  loc.path[2] = inboxId
  loc.path[3] = ''
  loc.path[4] = ''
  loc.path.length = 3

  delete loc.query?.message
  delete loc.fragment

  localStorage.setItem(`${locationStorageKeyId}_${inboxId}`, JSON.stringify(loc))

  navigate(loc)
}

async function navigateToInboxDoc (
  context: Ref<DocNotifyContext>,
  _id: Ref<Doc>,
  _class: Ref<Class<Doc>>,
  thread?: Ref<ActivityMessage>,
  message?: Ref<ActivityMessage>
): Promise<void> {
  const loc = getLocation()

  if (loc.path[2] !== inboxId) {
    return
  }

  loc.path[3] = encodeObjectURI(_id, _class)

  if (thread !== undefined) {
    loc.path[4] = thread
    loc.path.length = 5
    const fn = await getResource(chunter.function.OpenThreadInSidebar)
    void fn(thread, undefined, undefined, message, { autofocus: false })
  } else {
    loc.path[4] = ''
    loc.path.length = 4
  }

  loc.query = { ...loc.query, context, message: message ?? null }
  messageInFocus.set(message)
  navigate(loc)
}

export async function selectInboxContext (
  context: DocNotifyContext,
  doc?: Doc,
  notification?: WithLookup<InboxNotification>
): Promise<void> {
  const client = getClient()
  const hierarchy = client.getHierarchy()
  const { objectId, objectClass } = context
  const loc = getCurrentLocation()

  if (isMentionNotification(notification) && isActivityMessageClass(notification.mentionedInClass)) {
    const selectedMsg = notification.mentionedIn as Ref<ActivityMessage>

    void navigateToInboxDoc(
      context._id,
      objectId,
      objectClass,
      isActivityMessageClass(objectClass) ? (objectId as Ref<ActivityMessage>) : undefined,
      selectedMsg
    )

    return
  }

  if (isReactionNotification(notification)) {
    const thread = hierarchy.isDerived(context.objectClass, activity.class.ActivityMessage)
      ? context.objectId
      : undefined
    const reactedTo = await client.findOne(activity.class.ActivityMessage, { _id: notification.attachedTo })
    const isThread = reactedTo != null && hierarchy.isDerived(reactedTo._class, chunter.class.ThreadMessage)
    const channelId = isThread ? (reactedTo as ThreadMessage)?.objectId : reactedTo?.attachedTo ?? objectId
    const channelClass = isThread
      ? (reactedTo as ThreadMessage)?.objectClass
      : reactedTo?.attachedToClass ?? objectClass

    void navigateToInboxDoc(
      context._id,
      channelId,
      channelClass,
      thread as Ref<ActivityMessage>,
      notification.attachedTo
    )
    return
  }

  if (hierarchy.isDerived(objectClass, activity.class.ActivityMessage)) {
    const message = (notification as WithLookup<ActivityInboxNotification>)?.$lookup?.attachedTo

    if (objectClass === chunter.class.ThreadMessage) {
      const thread =
        doc?._id === objectId
          ? (doc as ThreadMessage)
          : await client.findOne(
            chunter.class.ThreadMessage,
            {
              _id: objectId as Ref<ThreadMessage>
            },
            { projection: { _id: 1, attachedTo: 1 } }
          )

      void navigateToInboxDoc(
        context._id,
        thread?.objectId ?? objectId,
        thread?.objectClass ?? objectClass,
        thread?.attachedTo,
        thread?._id
      )
      return
    }

    const selectedMsg = (notification as ActivityInboxNotification)?.attachedTo
    const thread = selectedMsg !== objectId ? objectId : loc.path[4] === objectId ? objectId : undefined
    const channelId = (doc as ActivityMessage)?.attachedTo ?? message?.attachedTo ?? objectId
    const channelClass = (doc as ActivityMessage)?.attachedToClass ?? message?.attachedToClass ?? objectClass

    void navigateToInboxDoc(
      context._id,
      channelId,
      channelClass,
      thread as Ref<ActivityMessage>,
      selectedMsg ?? (objectId as Ref<ActivityMessage>)
    )
    return
  }

  void navigateToInboxDoc(
    context._id,
    objectId,
    objectClass,
    undefined,
    (notification as ActivityInboxNotification)?.attachedTo
  )
}
