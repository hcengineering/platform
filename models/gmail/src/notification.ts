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

import notification from '@hcengineering/model-notification'
import core from '@hcengineering/model-core'
import contact from '@hcengineering/model-contact'
import love from '@hcengineering/model-love'
import { type Builder } from '@hcengineering/model'

import gmail from './plugin'

export function defineNotifications (builder: Builder): void {
  builder.createDoc(
    notification.class.NotificationGroup,
    core.space.Model,
    {
      label: gmail.string.Email,
      icon: contact.icon.Email
    },
    gmail.ids.EmailNotificationGroup
  )

  builder.createDoc(
    notification.class.NotificationType,
    core.space.Model,
    {
      label: gmail.string.NewMessage,
      generated: false,
      hidden: false,
      txClasses: [core.class.TxCreateDoc],
      objectClass: gmail.class.Message,
      group: gmail.ids.EmailNotificationGroup,
      allowedForAuthor: true,
      defaultEnabled: false
    },
    gmail.ids.EmailNotification
  )

  builder.createDoc(
    notification.class.NotificationProvider,
    core.space.Model,
    {
      icon: contact.icon.Email,
      label: gmail.string.Email,
      description: gmail.string.EmailNotificationsDescription,
      defaultEnabled: true,
      canDisable: true,
      depends: notification.providers.InboxNotificationProvider,
      order: 300
    },
    gmail.providers.EmailNotificationProvider
  )

  builder.createDoc(notification.class.NotificationProviderDefaults, core.space.Model, {
    provider: notification.providers.InboxNotificationProvider,
    ignoredTypes: [],
    enabledTypes: [gmail.ids.EmailNotification]
  })

  builder.createDoc(notification.class.NotificationProviderDefaults, core.space.Model, {
    provider: gmail.providers.EmailNotificationProvider,
    ignoredTypes: [
      gmail.ids.EmailNotification,
      notification.ids.CollaboratoAddNotification,
      love.ids.InviteNotification,
      love.ids.KnockNotification
    ],
    enabledTypes: []
  })
}
