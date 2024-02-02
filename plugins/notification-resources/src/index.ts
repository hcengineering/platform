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

import Inbox from './components/inbox/Inbox.svelte'
import NotificationSettings from './components/NotificationSettings.svelte'
import NotificationPresenter from './components/NotificationPresenter.svelte'
import TxCollaboratorsChange from './components/activity/TxCollaboratorsChange.svelte'
import TxDmCreation from './components/activity/TxDmCreation.svelte'
import DocNotifyContextPresenter from './components/DocNotifyContextPresenter.svelte'
import NotificationCollaboratorsChanged from './components/NotificationCollaboratorsChanged.svelte'
import ActivityInboxNotificationPresenter from './components/inbox/ActivityInboxNotificationPresenter.svelte'
import CommonInboxNotificationPresenter from './components/inbox/CommonInboxNotificationPresenter.svelte'
import InboxFlatListView from './components/inbox/InboxFlatListView.svelte'
import InboxGroupedListView from './components/inbox/InboxGroupedListView.svelte'
import {
  unsubscribe,
  resolveLocation,
  markAsReadInboxNotification,
  markAsUnreadInboxNotification,
  deleteInboxNotification,
  hasMarkAsUnreadAction,
  hasMarkAsReadAction,
  hasDocNotifyContextPinAction,
  isDocNotifyContextHidden,
  hasDocNotifyContextUnpinAction,
  isDocNotifyContextVisible,
  hasHiddenDocNotifyContext,
  pinDocNotifyContext,
  unpinDocNotifyContext,
  hideDocNotifyContext,
  unHideDocNotifyContext,
  canReadNotifyContext,
  canUnReadNotifyContext,
  readNotifyContext,
  unReadNotifyContext,
  deleteContextNotifications,
  hasInboxNotifications
} from './utils'

import { InboxNotificationsClientImpl } from './inboxNotificationsClient'

export * from './utils'
export * from './inboxNotificationsClient'

export { default as BrowserNotificatator } from './components/BrowserNotificatator.svelte'
export { default as NotifyMarker } from './components/NotifyMarker.svelte'

export default async (): Promise<Resources> => ({
  component: {
    Inbox,
    NotificationPresenter,
    NotificationSettings,
    NotificationCollaboratorsChanged,
    DocNotifyContextPresenter,
    ActivityInboxNotificationPresenter,
    CommonInboxNotificationPresenter,
    InboxFlatListView,
    InboxGroupedListView
  },
  activity: {
    TxCollaboratorsChange,
    TxDmCreation
  },
  function: {
    HasMarkAsUnreadAction: hasMarkAsUnreadAction,
    HasMarkAsReadAction: hasMarkAsReadAction,
    // eslint-disable-next-line @typescript-eslint/unbound-method
    GetInboxNotificationsClient: InboxNotificationsClientImpl.getClient,
    HasDocNotifyContextPinAction: hasDocNotifyContextPinAction,
    HasDocNotifyContextUnpinAction: hasDocNotifyContextUnpinAction,
    IsDocNotifyContextHidden: isDocNotifyContextHidden,
    IsDocNotifyContextTracked: isDocNotifyContextVisible,
    HasHiddenDocNotifyContext: hasHiddenDocNotifyContext,
    CanReadNotifyContext: canReadNotifyContext,
    CanUnReadNotifyContext: canUnReadNotifyContext,
    HasInboxNotifications: hasInboxNotifications
  },
  actionImpl: {
    Unsubscribe: unsubscribe,
    MarkAsReadInboxNotification: markAsReadInboxNotification,
    MarkAsUnreadInboxNotification: markAsUnreadInboxNotification,
    DeleteInboxNotification: deleteInboxNotification,
    PinDocNotifyContext: pinDocNotifyContext,
    UnpinDocNotifyContext: unpinDocNotifyContext,
    HideDocNotifyContext: hideDocNotifyContext,
    UnHideDocNotifyContext: unHideDocNotifyContext,
    ReadNotifyContext: readNotifyContext,
    UnReadNotifyContext: unReadNotifyContext,
    DeleteContextNotifications: deleteContextNotifications
  },
  resolver: {
    Location: resolveLocation
  }
})
