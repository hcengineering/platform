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
import notification, { type DocNotifyContext } from '@hcengineering/notification'
import { generateId, SortingOrder, type WithLookup } from '@hcengineering/core'
import { createQuery, getClient, MessageBox } from '@hcengineering/presentation'
import { get, writable } from 'svelte/store'
import view from '@hcengineering/view'
import { type SpecialNavModel } from '@hcengineering/workbench'
import attachment, { type SavedAttachments } from '@hcengineering/attachment'
import activity from '@hcengineering/activity'
import { InboxNotificationsClientImpl } from '@hcengineering/notification-resources'
import { type Action, showPopup } from '@hcengineering/ui'
import contact from '@hcengineering/contact'

import { type ChatNavGroupModel, type ChatNavItemModel } from './types'
import chunter from '../../plugin'

export const savedAttachmentsStore = writable<Array<WithLookup<SavedAttachments>>>([])

export const chatSpecials: SpecialNavModel[] = [
  {
    id: 'threads',
    label: chunter.string.Threads,
    icon: chunter.icon.Thread,
    component: chunter.component.Threads,
    position: 'top',
    notificationsCountProvider: chunter.function.GetUnreadThreadsCount
  },
  {
    id: 'saved',
    label: chunter.string.Saved,
    icon: activity.icon.Bookmark,
    position: 'top',
    component: chunter.component.SavedMessages
  },
  {
    id: 'chunterBrowser',
    label: chunter.string.ChunterBrowser,
    icon: view.icon.Database,
    component: chunter.component.ChunterBrowser,
    position: 'top'
  }
  // TODO: Should be reworked or removed
  // {
  //   id: 'archive',
  //   component: workbench.component.Archive,
  //   icon: view.icon.Archive,
  //   label: workbench.string.Archive,
  //   position: 'top',
  //   componentProps: {
  //     _class: notification.class.DocNotifyContext,
  //     config: [
  //       { key: '', label: chunter.string.ChannelName },
  //       { key: 'attachedToClass', label: view.string.Type },
  //       'modifiedOn'
  //     ],
  //     baseMenuClass: notification.class.DocNotifyContext,
  //     query: {
  //       _class: notification.class.DocNotifyContext,
  //       hidden: true
  //     }
  //   },
  //   visibleIf: notification.function.HasHiddenDocNotifyContext
  // }
]

export const chatNavGroupModels: ChatNavGroupModel[] = [
  {
    id: 'starred',
    label: chunter.string.Starred,
    sortFn: sortAlphabetically,
    wrap: false,
    getActionsFn: getPinnedActions,
    query: {
      isPinned: true
    }
  },
  {
    id: 'channels',
    sortFn: sortAlphabetically,
    wrap: true,
    getActionsFn: getChannelsActions,
    query: {
      isPinned: { $ne: true },
      attachedToClass: { $in: [chunter.class.Channel] }
    }
  },
  {
    id: 'direct',
    sortFn: sortAlphabetically,
    wrap: true,
    getActionsFn: getDirectActions,
    query: {
      isPinned: { $ne: true },
      attachedToClass: { $in: [chunter.class.DirectMessage] }
    }
  },
  {
    id: 'activity',
    sortFn: sortActivityChannels,
    wrap: true,
    getActionsFn: getActivityActions,
    maxSectionItems: 5,
    query: {
      isPinned: { $ne: true },
      attachedToClass: {
        // Ignore external channels until support is provided for them
        $nin: [chunter.class.DirectMessage, chunter.class.Channel, contact.class.Channel]
      }
    }
  }
]

function sortAlphabetically (items: ChatNavItemModel[]): ChatNavItemModel[] {
  return items.sort((i1, i2) => i1.title.localeCompare(i2.title))
}

function sortActivityChannels (items: ChatNavItemModel[], contexts: DocNotifyContext[]): ChatNavItemModel[] {
  const contextByDoc = new Map(contexts.map((context) => [context.attachedTo, context]))

  return items.sort((i1, i2) => {
    const context1 = contextByDoc.get(i1.id)
    const context2 = contextByDoc.get(i2.id)

    if (context1 === undefined || context2 === undefined) {
      return 1
    }

    const hasNewMessages1 = (context1.lastUpdateTimestamp ?? 0) > (context1.lastViewedTimestamp ?? 0)
    const hasNewMessages2 = (context2.lastUpdateTimestamp ?? 0) > (context2.lastViewedTimestamp ?? 0)

    if (hasNewMessages1 && hasNewMessages2) {
      return (context2.lastUpdateTimestamp ?? 0) - (context1.lastUpdateTimestamp ?? 0)
    }

    if (hasNewMessages1 && !hasNewMessages2) {
      return -1
    }

    if (hasNewMessages2 && !hasNewMessages1) {
      return 1
    }

    return (context2.lastUpdateTimestamp ?? 0) - (context1.lastUpdateTimestamp ?? 0)
  })
}

function getPinnedActions (contexts: DocNotifyContext[]): Action[] {
  return [
    {
      icon: view.icon.Delete,
      label: chunter.string.DeleteStarred,
      action: async () => {
        await unpinAllChannels(contexts)
      }
    }
  ]
}

async function unpinAllChannels (contexts: DocNotifyContext[]): Promise<void> {
  const doneOp = await getClient().measure('unpinAllChannels')
  const ops = getClient().apply(generateId())

  try {
    for (const context of contexts) {
      await ops.update(context, { isPinned: false })
    }
  } finally {
    await ops.commit()
    await doneOp()
  }
}

function getChannelsActions (): Action[] {
  return [
    {
      icon: chunter.icon.Hashtag,
      label: chunter.string.CreateChannel,
      action: async (): Promise<void> => {
        showPopup(chunter.component.CreateChannel, {}, 'top')
      }
    }
  ]
}

function getDirectActions (): Action[] {
  return [
    {
      label: chunter.string.NewDirectChat,
      icon: chunter.icon.Thread,
      action: async (): Promise<void> => {
        showPopup(chunter.component.CreateDirectChat, {}, 'top')
      }
    }
  ]
}

function getActivityActions (contexts: DocNotifyContext[]): Action[] {
  return [
    {
      icon: view.icon.Eye,
      label: notification.string.MarkReadAll,
      action: async () => {
        await readActivityChannels(contexts)
      }
    },
    {
      icon: view.icon.CheckCircle,
      label: notification.string.ArchiveAll,
      action: async () => {
        archiveActivityChannels(contexts)
      }
    }
  ]
}

function archiveActivityChannels (contexts: DocNotifyContext[]): void {
  showPopup(
    MessageBox,
    {
      label: chunter.string.ArchiveActivityConfirmationTitle,
      message: chunter.string.ArchiveActivityConfirmationMessage
    },
    'top',
    (result?: boolean) => {
      if (result === true) {
        void removeActivityChannels(contexts)
      }
    }
  )
}

export function loadSavedAttachments (): void {
  const client = getClient()

  if (client !== undefined) {
    const savedAttachmentsQuery = createQuery(true)

    savedAttachmentsQuery.query(
      attachment.class.SavedAttachments,
      {},
      (res) => {
        savedAttachmentsStore.set(res.filter(({ $lookup }) => $lookup?.attachedTo !== undefined))
      },
      { lookup: { attachedTo: attachment.class.Attachment }, sort: { modifiedOn: SortingOrder.Descending } }
    )
  } else {
    setTimeout(() => {
      loadSavedAttachments()
    }, 50)
  }
}

export async function removeActivityChannels (contexts: DocNotifyContext[]): Promise<void> {
  const client = InboxNotificationsClientImpl.getClient()
  const notificationsByContext = get(client.inboxNotificationsByContext)
  const doneOp = await getClient().measure('removeActivityChannels')
  const ops = getClient().apply(generateId())

  try {
    for (const context of contexts) {
      const notifications = notificationsByContext.get(context._id) ?? []
      await client.archiveNotifications(
        ops,
        notifications.map(({ _id }) => _id)
      )
      await ops.remove(context)
    }
  } finally {
    await ops.commit()
    await doneOp()
  }
}

export async function readActivityChannels (contexts: DocNotifyContext[]): Promise<void> {
  const client = InboxNotificationsClientImpl.getClient()
  const notificationsByContext = get(client.inboxNotificationsByContext)
  const doneOp = await getClient().measure('readActivityChannels')
  const ops = getClient().apply(generateId())

  try {
    for (const context of contexts) {
      const notifications = notificationsByContext.get(context._id) ?? []
      await client.archiveNotifications(
        ops,
        notifications
          .filter(({ _class }) => _class === notification.class.ActivityInboxNotification)
          .map(({ _id }) => _id)
      )
      await ops.update(context, { lastViewedTimestamp: Date.now() })
    }
  } finally {
    await ops.commit()
    await doneOp()
  }
}
