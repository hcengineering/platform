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
import NotificationSettings from './components/settings/NotificationSettings.svelte'
import NotificationPresenter from './components/NotificationPresenter.svelte'
import DocNotifyContextPresenter from './components/DocNotifyContextPresenter.svelte'
import CollaboratorsChanged from './components/activity/CollaboratorsChanged.svelte'
import ActivityInboxNotificationPresenter from './components/inbox/ActivityInboxNotificationPresenter.svelte'
import CommonInboxNotificationPresenter from './components/inbox/CommonInboxNotificationPresenter.svelte'
import NotificationCollaboratorsChanged from './components/NotificationCollaboratorsChanged.svelte'
import ReactionNotificationPresenter from './components/ReactionNotificationPresenter.svelte'
import GeneralPreferencesGroup from './components/settings/GeneralPreferencesGroup.svelte'
import {
  unsubscribe,
  resolveLocation,
  hasDocNotifyContextPinAction,
  hasDocNotifyContextUnpinAction,
  pinDocNotifyContext,
  unpinDocNotifyContext,
  canReadNotifyContext,
  canUnReadNotifyContext,
  readNotifyContext,
  unReadNotifyContext,
  archiveContextNotifications,
  hasInboxNotifications,
  archiveAll,
  readAll,
  unreadAll,
  checkPermission,
  unarchiveContextNotifications,
  isNotificationAllowed,
  locationDataResolver
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
    CollaboratorsChanged,
    DocNotifyContextPresenter,
    ActivityInboxNotificationPresenter,
    CommonInboxNotificationPresenter,
    NotificationCollaboratorsChanged,
    ReactionNotificationPresenter,
    GeneralPreferencesGroup
  },
  function: {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    GetInboxNotificationsClient: InboxNotificationsClientImpl.getClient,
    HasDocNotifyContextPinAction: hasDocNotifyContextPinAction,
    HasDocNotifyContextUnpinAction: hasDocNotifyContextUnpinAction,
    CanReadNotifyContext: canReadNotifyContext,
    CanUnReadNotifyContext: canUnReadNotifyContext,
    HasInboxNotifications: hasInboxNotifications,
    CheckPushPermission: checkPermission,
    IsNotificationAllowed: isNotificationAllowed,
    LocationDataResolver: locationDataResolver
  },
  actionImpl: {
    Unsubscribe: unsubscribe,
    PinDocNotifyContext: pinDocNotifyContext,
    UnpinDocNotifyContext: unpinDocNotifyContext,
    ReadNotifyContext: readNotifyContext,
    UnReadNotifyContext: unReadNotifyContext,
    ArchiveContextNotifications: archiveContextNotifications,
    UnarchiveContextNotifications: unarchiveContextNotifications,
    ArchiveAll: archiveAll,
    ReadAll: readAll,
    UnreadAll: unreadAll
  },
  resolver: {
    Location: resolveLocation
  }
})
