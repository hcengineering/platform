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

import { Doc, Ref } from '@hcengineering/core'
import notification, { notificationId } from '@hcengineering/notification'
import { IntlString, Resource, mergeIds } from '@hcengineering/platform'
import { AnyComponent } from '@hcengineering/ui'
import { Action, ActionCategory, ViewAction } from '@hcengineering/view'
import { Application } from '@hcengineering/workbench'
import { TxViewlet } from '@hcengineering/activity'

export default mergeIds(notificationId, notification, {
  string: {
    PlatformNotification: '' as IntlString,
    BrowserNotification: '' as IntlString,
    EmailNotification: '' as IntlString,
    Collaborators: '' as IntlString,
    Archive: '' as IntlString,
    MarkAsUnread: '' as IntlString
  },
  app: {
    Notification: '' as Ref<Application>
  },
  activity: {
    TxCollaboratorsChange: '' as AnyComponent,
    TxDmCreation: '' as AnyComponent
  },
  ids: {
    TxCollaboratorsChange: '' as Ref<TxViewlet>,
    TxDmCreation: '' as Ref<TxViewlet>
  },
  component: {
    NotificationSettings: '' as AnyComponent
  },
  function: {
    HasntNotifications: '' as Resource<(doc?: Doc | Doc[]) => Promise<boolean>>
  },
  category: {
    Notification: '' as Ref<ActionCategory>
  },
  groups: {},
  action: {
    Unsubscribe: '' as Ref<Action>,
    Hide: '' as Ref<Action>,
    MarkAsUnread: '' as Ref<Action>
  },
  actionImpl: {
    Unsubscribe: '' as ViewAction,
    Hide: '' as ViewAction,
    MarkAsUnread: '' as ViewAction
  }
})
