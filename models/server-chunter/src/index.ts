//
// Copyright © 2022, 2023 Hardcore Engineering Inc.
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

import core, { type Class, type Doc } from '@hcengineering/core'
import chunter from '@hcengineering/chunter'
import serverNotification from '@hcengineering/server-notification'
import serverCore, { type ObjectDDParticipant } from '@hcengineering/server-core'
import serverChunter from '@hcengineering/server-chunter'
import notification from '@hcengineering/notification'

export { serverChunterId } from '@hcengineering/server-chunter'

export function createModel (builder: Builder): void {
  builder.mixin(chunter.class.ChunterSpace, core.class.Class, serverNotification.mixin.HTMLPresenter, {
    presenter: serverChunter.function.ChannelHTMLPresenter
  })

  builder.mixin(chunter.class.ChunterSpace, core.class.Class, serverNotification.mixin.TextPresenter, {
    presenter: serverChunter.function.ChannelTextPresenter
  })

  builder.mixin(chunter.class.ChatMessage, core.class.Class, serverNotification.mixin.TextPresenter, {
    presenter: serverChunter.function.ChatMessageTextPresenter
  })

  builder.mixin(chunter.class.ChatMessage, core.class.Class, serverNotification.mixin.HTMLPresenter, {
    presenter: serverChunter.function.ChatMessageTextPresenter
  })

  builder.mixin<Class<Doc>, ObjectDDParticipant>(
    chunter.class.ChatMessage,
    core.class.Class,
    serverCore.mixin.ObjectDDParticipant,
    {
      collectDocs: serverChunter.function.CommentRemove
    }
  )

  builder.mixin(chunter.class.ChatMessage, core.class.Class, serverNotification.mixin.NotificationPresenter, {
    presenter: serverChunter.function.ChunterNotificationContentProvider
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverChunter.trigger.ChunterTrigger
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverChunter.trigger.OnUserStatus,
    txMatch: {
      objectClass: core.class.UserStatus
    },
    isAsync: true
  })

  builder.mixin(
    chunter.ids.JoinChannelNotification,
    notification.class.NotificationType,
    serverNotification.mixin.TypeMatch,
    {
      func: serverChunter.function.JoinChannelTypeMatch
    }
  )

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverChunter.trigger.OnChatMessageRemoved,
    txMatch: {
      _class: core.class.TxRemoveDoc,
      objectClass: chunter.class.ChatMessage
    }
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverChunter.trigger.ChatNotificationsHandler,
    txMatch: {
      _class: core.class.TxCreateDoc,
      objectClass: chunter.class.ChatMessage
    },
    isAsync: true
  })
}
