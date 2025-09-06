//
// Copyright © 2024 Hardcore Engineering Inc.
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
import notification from '@hcengineering/model-notification'
import core from '@hcengineering/model-core'
import activity from '@hcengineering/activity'

import chunter from './plugin'
import { type ClassCollaborators } from '@hcengineering/core'
import { type Channel, type DirectMessage } from '@hcengineering/chunter'

export function defineNotifications (builder: Builder): void {
  builder.createDoc<ClassCollaborators<DirectMessage>>(core.class.ClassCollaborators, core.space.Model, {
    attachedTo: chunter.class.DirectMessage,
    fields: ['members']
  })

  builder.createDoc<ClassCollaborators<Channel>>(core.class.ClassCollaborators, core.space.Model, {
    attachedTo: chunter.class.Channel,
    fields: ['members']
  })

  builder.mixin(chunter.class.DirectMessage, core.class.Class, notification.mixin.NotificationPreview, {
    presenter: chunter.component.ChannelPreview
  })

  builder.mixin(chunter.class.ChatMessage, core.class.Class, notification.mixin.NotificationContextPresenter, {
    labelPresenter: chunter.component.ChatMessageNotificationLabel
  })

  builder.createDoc(notification.class.ActivityNotificationViewlet, core.space.Model, {
    messageMatch: {
      _class: chunter.class.ThreadMessage
    },
    presenter: chunter.component.ThreadNotificationPresenter
  })

  builder.createDoc(
    notification.class.NotificationGroup,
    core.space.Model,
    {
      label: chunter.string.ApplicationLabelChunter,
      icon: chunter.icon.Chunter
    },
    chunter.ids.ChunterNotificationGroup
  )

  builder.createDoc(
    notification.class.NotificationType,
    core.space.Model,
    {
      label: chunter.string.DM,
      generated: false,
      hidden: false,
      txClasses: [core.class.TxCreateDoc],
      objectClass: chunter.class.ChatMessage,
      attachedToClass: chunter.class.DirectMessage,
      defaultEnabled: false,
      group: chunter.ids.ChunterNotificationGroup,
      templates: {
        textTemplate: '{sender} has sent you a message: {doc} {message}',
        htmlTemplate: '<p><b>{sender}</b> has sent you a message {doc}</p> {message}',
        subjectTemplate: 'You have new direct message in {doc}'
      }
    },
    chunter.ids.DMNotification
  )

  builder.createDoc(
    notification.class.NotificationType,
    core.space.Model,
    {
      label: chunter.string.ChannelMessages,
      generated: false,
      hidden: false,
      txClasses: [core.class.TxCreateDoc],
      objectClass: chunter.class.ChatMessage,
      attachedToClass: chunter.class.Channel,
      defaultEnabled: false,
      group: chunter.ids.ChunterNotificationGroup,
      templates: {
        textTemplate: '{sender} has sent a message in {doc}: {message}',
        htmlTemplate: '<p><b>{sender}</b> has sent a message in {doc}</p> {message}',
        subjectTemplate: 'You have new message in {doc}'
      }
    },
    chunter.ids.ChannelNotification
  )

  builder.createDoc(
    notification.class.NotificationType,
    core.space.Model,
    {
      label: chunter.string.JoinChannel,
      generated: false,
      hidden: false,
      txClasses: [core.class.TxUpdateDoc],
      objectClass: chunter.class.Channel,
      defaultEnabled: false,
      field: 'members',
      group: chunter.ids.ChunterNotificationGroup,
      templates: {
        textTemplate: 'You have been added to #{doc}',
        htmlTemplate: '<p>You have been added to <b>#{doc}</b></p>',
        subjectTemplate: 'You have been added to #{doc}'
      }
    },
    chunter.ids.JoinChannelNotification
  )

  builder.createDoc(
    notification.class.NotificationType,
    core.space.Model,
    {
      label: chunter.string.ThreadMessage,
      generated: false,
      hidden: false,
      txClasses: [core.class.TxCreateDoc],
      objectClass: chunter.class.ThreadMessage,
      defaultEnabled: false,
      group: chunter.ids.ChunterNotificationGroup,
      templates: {
        textTemplate: '{sender} replied to {doc}:\n\n{message}',
        htmlTemplate: '<p><b>{sender}</b> replied to {doc}:</p><p>{message}</p><p>{link}</p>',
        subjectTemplate: '{title}'
      }
    },
    chunter.ids.ThreadNotification
  )

  builder.createDoc(notification.class.NotificationProviderDefaults, core.space.Model, {
    provider: notification.providers.InboxNotificationProvider,
    ignoredTypes: [],
    enabledTypes: [
      chunter.ids.DMNotification,
      chunter.ids.ChannelNotification,
      chunter.ids.ThreadNotification,
      chunter.ids.JoinChannelNotification
    ]
  })

  builder.createDoc(notification.class.NotificationProviderDefaults, core.space.Model, {
    provider: notification.providers.PushNotificationProvider,
    ignoredTypes: [],
    enabledTypes: [
      chunter.ids.DMNotification,
      chunter.ids.ChannelNotification,
      chunter.ids.ThreadNotification,
      chunter.ids.JoinChannelNotification
    ]
  })

  builder.createDoc(notification.class.NotificationProviderDefaults, core.space.Model, {
    provider: notification.providers.SoundNotificationProvider,
    ignoredTypes: [],
    enabledTypes: [
      chunter.ids.DMNotification,
      chunter.ids.ChannelNotification,
      chunter.ids.ThreadNotification,
      chunter.ids.JoinChannelNotification
    ]
  })

  builder.createDoc(notification.class.ActivityNotificationViewlet, core.space.Model, {
    messageMatch: {
      _class: activity.class.DocUpdateMessage,
      objectClass: chunter.class.Channel,
      action: 'update',
      'attributeUpdates.attrKey': 'members'
    },
    presenter: chunter.component.JoinChannelNotificationPresenter
  })
}
