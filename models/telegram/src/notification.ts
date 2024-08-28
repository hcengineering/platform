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
import contact from '@hcengineering/model-contact'
import chunter from '@hcengineering/chunter'
import love from '@hcengineering/love'

import telegram from './plugin'

export function defineNotifications (builder: Builder): void {
  builder.createDoc(
    notification.class.NotificationGroup,
    core.space.Model,
    {
      label: telegram.string.Telegram,
      icon: contact.icon.Telegram
    },
    telegram.ids.NotificationGroup
  )

  builder.createDoc(
    notification.class.NotificationProvider,
    core.space.Model,
    {
      label: telegram.string.Telegram,
      icon: contact.icon.Telegram,
      depends: notification.providers.InboxNotificationProvider,
      defaultEnabled: false,
      canDisable: true,
      description: telegram.string.TelegramNotificationDescription,
      presenter: telegram.component.NotificationProviderPresenter,
      order: 400,
      isAvailableFn: telegram.function.IsTelegramNotificationsAvailable
    },
    telegram.providers.TelegramNotificationProvider
  )

  builder.createDoc(
    notification.class.NotificationType,
    core.space.Model,
    {
      label: telegram.string.NewMessage,
      generated: false,
      allowedForAuthor: true,
      hidden: false,
      txClasses: [core.class.TxCreateDoc],
      objectClass: telegram.class.Message,
      group: telegram.ids.NotificationGroup,
      defaultEnabled: false
    },
    telegram.ids.NewMessageNotification
  )

  builder.createDoc(notification.class.NotificationProviderDefaults, core.space.Model, {
    provider: notification.providers.InboxNotificationProvider,
    ignoredTypes: [],
    enabledTypes: [telegram.ids.NewMessageNotification]
  })

  builder.createDoc(notification.class.NotificationProviderDefaults, core.space.Model, {
    provider: telegram.providers.TelegramNotificationProvider,
    ignoredTypes: [
      notification.ids.CollaboratoAddNotification,
      love.ids.InviteNotification,
      love.ids.KnockNotification
    ],
    enabledTypes: [chunter.ids.DMNotification, chunter.ids.ThreadNotification]
  })
}
