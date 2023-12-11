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

import { type Resources } from '@hcengineering/platform'

import Inbox from './components/Inbox.svelte'
import NewInbox from './components/inbox/Inbox.svelte'
import NotificationSettings from './components/NotificationSettings.svelte'
import NotificationPresenter from './components/NotificationPresenter.svelte'
import TxCollaboratorsChange from './components/activity/TxCollaboratorsChange.svelte'
import TxDmCreation from './components/activity/TxDmCreation.svelte'
import ActivityMessagePresenter from './components/activity-message/ActivityMessagePresenter.svelte'
import InboxAside from './components/inbox/InboxAside.svelte'
import ChatMessagePresenter from './components/chat-message/ChatMessagePresenter.svelte'
import DocUpdateMessagePresenter from './components/doc-update-message/DocUpdateMessagePresenter.svelte'
import ChatMessageInput from './components/chat-message/ChatMessageInput.svelte'
import PinMessageAction from './components/activity-message/PinMessageAction.svelte'
import NotificationCollaboratorsChanged from './components/NotificationCollaboratorsChanged.svelte'
import ChatMessagesPresenter from './components/chat-message/ChatMessagesPresenter.svelte'
import {
  NotificationClientImpl,
  hasntNotifications,
  hide,
  markAsUnread,
  unsubscribe,
  resolveLocation,
  markAsReadInboxNotification,
  markAsUnreadInboxNotification,
  deleteInboxNotification,
  hasntInboxNotifications,
  hasInboxNotifications,
  deleteChatMessage
} from './utils'
import {
  attributesFilter,
  chatMessagesFilter,
  combineActivityMessages,
  pinnedFilter,
  sortActivityMessages
} from './activityMessagesUtils'
import { InboxNotificationsClientImpl } from './inboxNotificationsClient'

export * from './utils'
export * from './inboxNotificationsClient'
export * from './activityMessagesUtils'

export { default as ChatMessagesPresenter } from './components/chat-message/ChatMessagesPresenter.svelte'
export { default as ChatMessagePopup } from './components/chat-message/ChatMessagePopup.svelte'
export { default as BrowserNotificatator } from './components/BrowserNotificatator.svelte'

export default async (): Promise<Resources> => ({
  component: {
    Inbox,
    NewInbox,
    NotificationPresenter,
    NotificationSettings,
    InboxAside,
    ActivityMessagePresenter,
    DocUpdateMessagePresenter,
    ChatMessagePresenter,
    ChatMessageInput,
    PinMessageAction,
    NotificationCollaboratorsChanged,
    ChatMessagesPresenter
  },
  activity: {
    TxCollaboratorsChange,
    TxDmCreation
  },
  function: {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    GetNotificationClient: NotificationClientImpl.getClient,
    HasntNotifications: hasntNotifications,
    HasntInboxNotifications: hasntInboxNotifications,
    HasInboxNotifications: hasInboxNotifications,
    // eslint-disable-next-line @typescript-eslint/unbound-method
    GetInboxNotificationsClient: InboxNotificationsClientImpl.getClient,
    CombineActivityMessages: combineActivityMessages,
    SortActivityMessages: sortActivityMessages
  },
  actionImpl: {
    Unsubscribe: unsubscribe,
    Hide: hide,
    MarkAsUnread: markAsUnread,
    MarkAsReadInboxNotification: markAsReadInboxNotification,
    MarkAsUnreadInboxNotification: markAsUnreadInboxNotification,
    DeleteInboxNotification: deleteInboxNotification,
    DeleteChatMessage: deleteChatMessage
  },
  resolver: {
    Location: resolveLocation
  },
  filter: {
    AttributesFilter: attributesFilter,
    PinnedFilter: pinnedFilter,
    ChatMessagesFilter: chatMessagesFilter
  }
})
