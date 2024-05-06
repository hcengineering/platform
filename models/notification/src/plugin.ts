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

import { type Doc, type Ref } from '@hcengineering/core'
import notification, { notificationId } from '@hcengineering/notification'
import { type IntlString, type Resource, mergeIds } from '@hcengineering/platform'
import { type AnyComponent } from '@hcengineering/ui/src/types'
import { type Action, type ActionCategory, type ViewAction } from '@hcengineering/view'
import { type Application } from '@hcengineering/workbench'
import { type DocUpdateMessageViewlet, type TxViewlet } from '@hcengineering/activity'

export default mergeIds(notificationId, notification, {
  string: {
    PlatformNotification: '' as IntlString,
    BrowserNotification: '' as IntlString,
    EmailNotification: '' as IntlString,
    Collaborators: '' as IntlString,
    Archive: '' as IntlString,
    MarkAsUnread: '' as IntlString,
    MarkAsRead: '' as IntlString,
    ChangeCollaborators: '' as IntlString,
    Message: '' as IntlString,
    StarDocument: '' as IntlString,
    UnstarDocument: '' as IntlString,
    Unsubscribe: '' as IntlString
  },
  app: {
    Notification: '' as Ref<Application>,
    Inbox: '' as Ref<Application>
  },
  activity: {
    TxDmCreation: '' as AnyComponent
  },
  ids: {
    TxCollaboratorsChange: '' as Ref<TxViewlet>,
    TxDmCreation: '' as Ref<TxViewlet>,
    CollaboratorsChangedMessage: '' as Ref<DocUpdateMessageViewlet>
  },
  component: {
    NotificationSettings: '' as AnyComponent,
    ActivityInboxNotificationPresenter: '' as AnyComponent,
    CommonInboxNotificationPresenter: '' as AnyComponent
  },
  function: {
    HasDocNotifyContextPinAction: '' as Resource<(doc?: Doc | Doc[]) => Promise<boolean>>,
    HasDocNotifyContextUnpinAction: '' as Resource<(doc?: Doc | Doc[]) => Promise<boolean>>,
    CanReadNotifyContext: '' as Resource<(doc?: Doc | Doc[]) => Promise<boolean>>,
    CanUnReadNotifyContext: '' as Resource<(doc?: Doc | Doc[]) => Promise<boolean>>
  },
  category: {
    Notification: '' as Ref<ActionCategory>
  },
  groups: {},
  action: {
    Unsubscribe: '' as Ref<Action>,
    ArchiveAll: '' as Ref<Action>,
    ReadAll: '' as Ref<Action>,
    UnreadAll: '' as Ref<Action>
  },
  actionImpl: {
    Unsubscribe: '' as ViewAction,
    UnpinDocNotifyContext: '' as ViewAction,
    PinDocNotifyContext: '' as ViewAction,
    UnReadNotifyContext: '' as ViewAction,
    ReadNotifyContext: '' as ViewAction,
    ArchiveContextNotifications: '' as ViewAction,
    UnarchiveContextNotifications: '' as ViewAction,
    ArchiveAll: '' as ViewAction,
    ReadAll: '' as ViewAction,
    UnreadAll: '' as ViewAction
  }
})
