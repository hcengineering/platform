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
import attachment, { type SavedAttachments } from '@hcengineering/attachment'
import { type DirectMessage } from '@hcengineering/chunter'
import contact from '@hcengineering/contact'
import core, {
  AccountRole,
  getCurrentAccount,
  hasAccountRole,
  SortingOrder,
  type UserStatus,
  type WithLookup,
  type AccountUuid
} from '@hcengineering/core'
import notification, { type DocNotifyContext } from '@hcengineering/notification'
import { InboxNotificationsClientImpl } from '@hcengineering/notification-resources'
import { createQuery, getClient, MessageBox, onClient } from '@hcengineering/presentation'
import { type Action, showPopup } from '@hcengineering/ui'
import view from '@hcengineering/view'
import workbench, { type SpecialNavModel } from '@hcengineering/workbench'
import { get, writable } from 'svelte/store'

import chunter from '../../plugin'
import { type ChatNavGroupModel, type ChatNavItemModel, type SortFnOptions } from './types'

const navigatorStateStorageKey = 'chunter.navigatorState'

interface NavigatorState {
  collapsedSections: string[]
}

export const savedAttachmentsStore = writable<Array<WithLookup<SavedAttachments>>>([])
export const navigatorStateStore = writable<NavigatorState>(restoreNavigatorState())

function restoreNavigatorState (): NavigatorState {
  const raw = localStorage.getItem(navigatorStateStorageKey)

  if (raw == null) return { collapsedSections: [] }

  try {
    return JSON.parse(raw) as NavigatorState
  } catch (e) {
    return { collapsedSections: [] }
  }
}

export function toggleSections (_id: string): void {
  const navState = get(navigatorStateStore)
  const result: NavigatorState = navState.collapsedSections.includes(_id)
    ? {
        collapsedSections: navState.collapsedSections.filter((id) => id !== _id)
      }
    : { collapsedSections: [...navState.collapsedSections, _id] }

  localStorage.setItem(navigatorStateStorageKey, JSON.stringify(result))
  navigatorStateStore.set(result)
}

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
    icon: chunter.icon.Bookmarks,
    position: 'top',
    component: chunter.component.SavedMessages
  },
  {
    id: 'chunterBrowser',
    label: chunter.string.ChunterBrowser,
    icon: chunter.icon.ChunterBrowser,
    component: chunter.component.ChunterBrowser,
    position: 'top'
  },
  {
    id: 'channels',
    label: chunter.string.Channels,
    icon: chunter.icon.ChannelBrowser,
    component: workbench.component.SpecialView,
    componentProps: {
      _class: chunter.class.Channel,
      icon: chunter.icon.ChannelBrowser,
      label: chunter.string.Channels,
      createLabel: chunter.string.CreateChannel,
      createComponent: chunter.component.CreateChannel
    },
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
    isPinned: true
  },
  {
    id: 'channels',
    sortFn: sortAlphabetically,
    wrap: true,
    getActionsFn: getChannelsActions,
    isPinned: false,
    _class: chunter.class.Channel
  },
  {
    id: 'direct',
    sortFn: sortDirects,
    wrap: true,
    getActionsFn: getDirectActions,
    isPinned: false,
    _class: chunter.class.DirectMessage
  },
  {
    id: 'activity',
    sortFn: sortActivityChannels,
    wrap: true,
    getActionsFn: getActivityActions,
    maxSectionItems: 5,
    isPinned: false,
    skipClasses: [chunter.class.DirectMessage, chunter.class.Channel, contact.class.Channel]
  }
]

function sortAlphabetically (items: ChatNavItemModel[]): ChatNavItemModel[] {
  return items.sort((i1, i2) => i1.title.localeCompare(i2.title))
}

function getDirectCompanion (direct: DirectMessage, myAcc: AccountUuid): AccountUuid | undefined {
  return direct.members.find((member) => member !== myAcc)
}

function isOnline (user: AccountUuid | undefined, userStatusByAccount: Map<AccountUuid, UserStatus>): boolean {
  if (user === undefined) {
    return false
  }

  return userStatusByAccount.get(user)?.online ?? false
}

function isGroupChat (direct: DirectMessage): boolean {
  return direct.members.length > 2
}

function sortDirects (items: ChatNavItemModel[], option: SortFnOptions): ChatNavItemModel[] {
  const { userStatusByAccount } = option
  const account = getCurrentAccount().uuid

  return items.sort((i1, i2) => {
    const direct1 = i1.object as DirectMessage
    const direct2 = i2.object as DirectMessage

    const isGroupChat1 = isGroupChat(direct1)
    const isGroupChat2 = isGroupChat(direct2)

    if (isGroupChat1 && isGroupChat2) {
      return i1.title.localeCompare(i2.title)
    }

    if (isGroupChat1 && !isGroupChat2) {
      const isOnline2 = isOnline(getDirectCompanion(direct2, account), userStatusByAccount)
      return isOnline2 ? 1 : -1
    }

    if (!isGroupChat1 && isGroupChat2) {
      const isOnline1 = isOnline(getDirectCompanion(direct1, account), userStatusByAccount)
      return isOnline1 ? -1 : 1
    }

    const user1 = getDirectCompanion(direct1, account)
    const user2 = getDirectCompanion(direct2, account)

    if (user1 === undefined) {
      return 1
    }

    if (user2 === undefined) {
      return -1
    }

    const isOnline1 = isOnline(user1, userStatusByAccount)
    const isOnline2 = isOnline(user2, userStatusByAccount)

    if (isOnline1 === isOnline2) {
      return i1.title.localeCompare(i2.title)
    }

    if (isOnline1 && !isOnline2) {
      return -1
    }

    return 1
  })
}

function sortActivityChannels (items: ChatNavItemModel[], option: SortFnOptions): ChatNavItemModel[] {
  const { contexts } = option
  const contextByDoc = new Map(contexts.map((context) => [context.objectId, context]))

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
  const ops = getClient().apply(undefined, 'unpinAllChannels')

  try {
    for (const context of contexts) {
      await ops.update(context, { isPinned: false })
    }
  } finally {
    await ops.commit()
  }
}

function getChannelsActions (): Action[] {
  return hasAccountRole(getCurrentAccount(), AccountRole.User)
    ? [
        {
          icon: chunter.icon.Hashtag,
          label: chunter.string.CreateChannel,
          action: async (): Promise<void> => {
            showPopup(chunter.component.CreateChannel, {}, 'top')
          }
        }
      ]
    : []
}

function getDirectActions (): Action[] {
  return hasAccountRole(getCurrentAccount(), AccountRole.User)
    ? [
        {
          label: chunter.string.NewDirectChat,
          icon: chunter.icon.Thread,
          action: async (): Promise<void> => {
            showPopup(chunter.component.CreateDirectChat, {}, 'top')
          }
        }
      ]
    : []
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
      icon: view.icon.EyeCrossed,
      label: view.string.Hide,
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
      message: chunter.string.ArchiveActivityConfirmationMessage,
      action: async () => {
        await hideActivityChannels(contexts)
      }
    },
    'top'
  )
}

const savedAttachmentsQuery = createQuery(true)
export function loadSavedAttachments (): void {
  onClient(() => {
    savedAttachmentsQuery.query(
      attachment.class.SavedAttachments,
      { space: core.space.Workspace },
      (res) => {
        savedAttachmentsStore.set(res.filter(({ $lookup }) => $lookup?.attachedTo !== undefined))
      },
      { lookup: { attachedTo: attachment.class.Attachment }, sort: { modifiedOn: SortingOrder.Descending } }
    )
  })
}

export async function hideActivityChannels (contexts: DocNotifyContext[]): Promise<void> {
  const ops = getClient().apply(undefined, 'hideActivityChannels')

  try {
    for (const context of contexts) {
      await ops.update(context, { hidden: true })
    }
  } finally {
    await ops.commit()
  }
}

export async function readActivityChannels (contexts: DocNotifyContext[]): Promise<void> {
  const client = InboxNotificationsClientImpl.getClient()
  const notificationsByContext = get(client.inboxNotificationsByContext)
  const ops = getClient().apply(undefined, 'readActivityChannels', true)

  try {
    for (const context of contexts) {
      const notifications = notificationsByContext.get(context._id) ?? []
      await client.readNotifications(
        ops,
        notifications
          .filter(({ _class }) => _class === notification.class.ActivityInboxNotification)
          .map(({ _id }) => _id)
      )
      await ops.update(context, { lastViewedTimestamp: Date.now() })
    }
  } finally {
    await ops.commit()
  }
}
