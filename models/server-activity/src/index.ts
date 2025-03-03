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

import { type Builder } from '@hcengineering/model'
import serverCore from '@hcengineering/server-core'
import core from '@hcengineering/core'
import serverActivity from '@hcengineering/server-activity'
import serverNotification from '@hcengineering/server-notification'
import activity from '@hcengineering/activity'
import notification from '@hcengineering/notification'

export { activityServerOperation } from './migration'
export { serverActivityId } from '@hcengineering/server-activity'

export function createModel (builder: Builder): void {
  builder.mixin(activity.class.Reaction, core.class.Class, serverNotification.mixin.NotificationPresenter, {
    presenter: serverActivity.function.ReactionNotificationContentProvider
  })

  builder.mixin(activity.class.DocUpdateMessage, core.class.Class, serverNotification.mixin.TextPresenter, {
    presenter: serverActivity.function.DocUpdateMessageTextPresenter
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverActivity.trigger.OnReactionChanged,
    txMatch: {
      collection: 'reactions'
    },
    isAsync: true
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverActivity.trigger.ActivityMessagesHandler,
    txMatch: {
      objectClass: { $nin: [activity.class.ActivityMessage, notification.class.DocNotifyContext] }
    },
    isAsync: true
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverActivity.trigger.OnDocRemoved
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverActivity.trigger.ReferenceTrigger,
    txMatch: {
      objectClass: { $ne: activity.class.ActivityReference },
      attachedToClass: {
        $nin: [
          notification.class.InboxNotification,
          notification.class.DocNotifyContext,
          notification.class.BrowserNotification
        ]
      }
    },
    isAsync: true
  })
}
