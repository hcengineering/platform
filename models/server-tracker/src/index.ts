//
// Copyright © 2022 Hardcore Engineering Inc.
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

import contact from '@hcengineering/contact'
import core from '@hcengineering/core'
import { type Builder } from '@hcengineering/model'
import tracker from '@hcengineering/model-tracker'
import notification from '@hcengineering/notification'
import serverCore from '@hcengineering/server-core'
import serverNotification from '@hcengineering/server-notification'
import serverTracker from '@hcengineering/server-tracker'
import serverView from '@hcengineering/server-view'

export { serverTrackerId } from '@hcengineering/server-tracker'

export function createModel (builder: Builder): void {
  builder.mixin(tracker.class.Issue, core.class.Class, serverNotification.mixin.HTMLPresenter, {
    presenter: serverTracker.function.IssueHTMLPresenter
  })

  builder.mixin(tracker.class.Issue, core.class.Class, serverNotification.mixin.TextPresenter, {
    presenter: serverTracker.function.IssueTextPresenter
  })

  builder.mixin(tracker.class.Issue, core.class.Class, serverNotification.mixin.NotificationPresenter, {
    presenter: serverTracker.function.IssueNotificationContentProvider
  })

  builder.mixin(tracker.class.Issue, core.class.Class, serverView.mixin.ServerLinkIdProvider, {
    encode: serverTracker.function.IssueLinkIdProvider
  })

  builder.mixin(tracker.class.Issue, core.class.Class, serverCore.mixin.SearchPresenter, {
    iconConfig: {
      component: tracker.component.IssueSearchIcon,
      fields: [['status'], ['space']]
    },
    shortTitle: [['identifier']],
    title: [['title']]
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverTracker.trigger.OnEmployeeCreate,
    txMatch: {
      objectClass: contact.class.Person,
      _class: core.class.TxMixin,
      mixin: contact.mixin.Employee,
      'attributes.active': true
    }
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverTracker.trigger.OnIssueUpdate,
    txMatch: {
      objectClass: { $in: [tracker.class.Issue, tracker.class.TimeSpendReport] }
    }
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverTracker.trigger.OnComponentRemove,
    txMatch: {
      _class: core.class.TxRemoveDoc,
      objectClass: tracker.class.Component
    }
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverTracker.trigger.OnProjectRemove,
    txMatch: {
      _class: core.class.TxRemoveDoc,
      objectClass: tracker.class.Project
    }
  })

  builder.mixin(
    tracker.ids.AssigneeNotification,
    notification.class.NotificationType,
    serverNotification.mixin.TypeMatch,
    {
      func: serverNotification.function.IsUserEmployeeInFieldValueTypeMatch
    }
  )
}
