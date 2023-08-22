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

import { Resources } from '@hcengineering/platform'
import Inbox from './components/Inbox.svelte'
import NotificationSettings from './components/NotificationSettings.svelte'
import NotificationPresenter from './components/NotificationPresenter.svelte'
import TxCollaboratorsChange from './components/activity/TxCollaboratorsChange.svelte'
import TxDmCreation from './components/activity/TxDmCreation.svelte'
import { NotificationClientImpl, hasntNotifications, hide, markAsUnread, unsubscribe } from './utils'

export * from './utils'

export { default as BrowserNotificatator } from './components/BrowserNotificatator.svelte'

export default async (): Promise<Resources> => ({
  component: {
    Inbox,
    NotificationPresenter,
    NotificationSettings
  },
  activity: {
    TxCollaboratorsChange,
    TxDmCreation
  },
  function: {
    GetNotificationClient: NotificationClientImpl.getClient,
    HasntNotifications: hasntNotifications
  },
  actionImpl: {
    Unsubscribe: unsubscribe,
    Hide: hide,
    MarkAsUnread: markAsUnread
  }
})
