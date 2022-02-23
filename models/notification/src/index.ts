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

import { Account, Doc, Domain, DOMAIN_MODEL, Ref, Timestamp, TxCUD } from '@anticrm/core'
import { ArrOf, Builder, Model, Prop, TypeRef, TypeString, TypeTimestamp } from '@anticrm/model'
import core, { TAttachedDoc, TDoc } from '@anticrm/model-core'
import type { EmailNotification, LastView, NotificationType, NotificationProvider, NotificationSetting, Notification, NotificationStatus } from '@anticrm/notification'
import type { IntlString } from '@anticrm/platform'
import notification from './plugin'
import setting from '@anticrm/setting'

export const DOMAIN_NOTIFICATION = 'notification' as Domain

@Model(notification.class.LastView, core.class.AttachedDoc, DOMAIN_NOTIFICATION)
export class TLastView extends TAttachedDoc implements LastView {
  @Prop(TypeTimestamp(), notification.string.LastView)
  lastView!: Timestamp

  @Prop(TypeRef(core.class.Account), core.string.ModifiedBy)
  user!: Ref<Account>
}

@Model(notification.class.Notification, core.class.AttachedDoc, DOMAIN_NOTIFICATION)
export class TNotification extends TAttachedDoc implements Notification {
  @Prop(TypeRef(core.class.Tx), 'TX' as IntlString)
  tx!: Ref<TxCUD<Doc>>

  @Prop(TypeString(), 'Status' as IntlString)
  status!: NotificationStatus
}

@Model(notification.class.EmailNotification, core.class.Doc, DOMAIN_NOTIFICATION)
export class TEmaiNotification extends TDoc implements EmailNotification {
  @Prop(TypeString(), 'Sender' as IntlString)
  sender!: string

  @Prop(ArrOf(TypeString()), 'Receivers' as IntlString)
  receivers!: string[]

  @Prop(TypeString(), 'Subject' as IntlString)
  subject!: string

  @Prop(TypeString(), 'Text' as IntlString)
  text!: string

  @Prop(TypeString(), 'Html' as IntlString)
  html?: string

  @Prop(TypeString(), 'Status' as IntlString)
  status!: 'new' | 'sent'
}

@Model(notification.class.NotificationType, core.class.Doc, DOMAIN_MODEL)
export class TNotificationType extends TDoc implements NotificationType {
  label!: IntlString
}

@Model(notification.class.NotificationProvider, core.class.Doc, DOMAIN_MODEL)
export class TNotificationProvider extends TDoc implements NotificationProvider {
  label!: IntlString
}

@Model(notification.class.NotificationSetting, core.class.Doc, DOMAIN_NOTIFICATION)
export class TNotificationSetting extends TDoc implements NotificationSetting {
  type!: Ref<TNotificationType>
  provider!: Ref<TNotificationProvider>
  enabled!: boolean
}

export function createModel (builder: Builder): void {
  builder.createModel(TLastView, TNotification, TEmaiNotification, TNotificationType, TNotificationProvider, TNotificationSetting)

  builder.createDoc(notification.class.NotificationType, core.space.Model, {
    label: notification.string.MentionNotification
  }, notification.ids.MentionNotification)

  builder.createDoc(notification.class.NotificationProvider, core.space.Model, {
    label: notification.string.PlatformNotification
  }, notification.ids.PlatformNotification)

  builder.createDoc(notification.class.NotificationProvider, core.space.Model, {
    label: notification.string.EmailNotification
  }, notification.ids.EmailNotification)

  builder.createDoc(setting.class.SettingsCategory, core.space.Model, {
    name: 'notifications',
    label: notification.string.Notifications,
    icon: notification.icon.Notifications,
    component: notification.component.NotificationSettings,
    order: 2500
  }, notification.ids.NotificationSettings)
}

export { notificationOperation } from './migration'
