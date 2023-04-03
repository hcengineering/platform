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

import { Account, Doc, Domain, DOMAIN_MODEL, IndexKind, Ref, TxCUD } from '@hcengineering/core'
import { ArrOf, Builder, Index, Mixin, Model, Prop, TypeRef, TypeString, UX } from '@hcengineering/model'
import core, { TAttachedDoc, TClass, TDoc } from '@hcengineering/model-core'
import type {
  AnotherUserNotifications,
  EmailNotification,
  LastView,
  Notification,
  NotificationProvider,
  NotificationSetting,
  NotificationStatus,
  NotificationType,
  SpaceLastEdit
} from '@hcengineering/notification'
import type { IntlString } from '@hcengineering/platform'
import setting from '@hcengineering/setting'
import notification from './plugin'

export const DOMAIN_NOTIFICATION = 'notification' as Domain

@Model(notification.class.LastView, core.class.Doc, DOMAIN_NOTIFICATION)
export class TLastView extends TDoc implements LastView {
  @Prop(TypeRef(core.class.Account), core.string.ModifiedBy)
  @Index(IndexKind.Indexed)
    user!: Ref<Account>
}

@Model(notification.class.Notification, core.class.AttachedDoc, DOMAIN_NOTIFICATION)
export class TNotification extends TAttachedDoc implements Notification {
  @Prop(TypeRef(core.class.Tx), 'TX' as IntlString)
    tx!: Ref<TxCUD<Doc>>

  @Prop(TypeString(), 'Status' as IntlString)
    status!: NotificationStatus

  text!: string

  type!: Ref<NotificationType>
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
    status!: 'new' | 'sent' | 'error'

  error?: string
}

@Model(notification.class.NotificationType, core.class.Doc, DOMAIN_MODEL)
export class TNotificationType extends TDoc implements NotificationType {
  label!: IntlString
  textTemplate!: string
  htmlTemplate!: string
  subjectTemplate!: string
  hidden!: boolean
}

@Model(notification.class.NotificationProvider, core.class.Doc, DOMAIN_MODEL)
export class TNotificationProvider extends TDoc implements NotificationProvider {
  label!: IntlString
  default!: boolean
}

@Model(notification.class.NotificationSetting, core.class.Doc, DOMAIN_NOTIFICATION)
export class TNotificationSetting extends TDoc implements NotificationSetting {
  type!: Ref<TNotificationType>
  provider!: Ref<TNotificationProvider>
  enabled!: boolean
}

@Mixin(notification.mixin.SpaceLastEdit, core.class.Class)
export class TSpaceLastEdit extends TClass implements SpaceLastEdit {
  lastEditField!: string
}

@Mixin(notification.mixin.AnotherUserNotifications, core.class.Class)
export class TAnotherUserNotifications extends TClass implements AnotherUserNotifications {
  fields!: string[]
}

@Mixin(notification.mixin.ClassCollaborators, core.class.Class)
export class TClassCollaborators extends TClass {
  fields!: string[]
}

@Mixin(notification.mixin.TrackedDoc, core.class.Class)
export class TTrackedDoc extends TClass {}

@Mixin(notification.mixin.Collaborators, core.class.Doc)
@UX(notification.string.Collaborators)
export class TCollaborators extends TDoc {
  @Prop(ArrOf(TypeRef(core.class.Account)), notification.string.Collaborators)
    collaborators!: Ref<Account>[]
}

export function createModel (builder: Builder): void {
  builder.createModel(
    TLastView,
    TNotification,
    TEmaiNotification,
    TNotificationType,
    TNotificationProvider,
    TNotificationSetting,
    TSpaceLastEdit,
    TAnotherUserNotifications,
    TClassCollaborators,
    TTrackedDoc,
    TCollaborators
  )

  builder.createDoc(
    notification.class.NotificationType,
    core.space.Model,
    {
      label: notification.string.MentionNotification,
      hidden: false,
      textTemplate: '{sender} mentioned you in {doc} {data}',
      htmlTemplate: '<p><b>{sender}</b> mentioned you in {doc}</p> {data}',
      subjectTemplate: 'You were mentioned in {doc}'
    },
    notification.ids.MentionNotification
  )

  builder.createDoc(
    notification.class.NotificationType,
    core.space.Model,
    {
      label: notification.string.DM,
      hidden: false,
      textTemplate: '{sender} has send you a message: {doc} {data}',
      htmlTemplate: '<p><b>{sender}</b> has send you a message {doc}</p> {data}',
      subjectTemplate: 'You have new DM message in {doc}'
    },
    notification.ids.DMNotification
  )

  builder.createDoc(
    notification.class.NotificationType,
    core.space.Model,
    {
      label: notification.string.Notification,
      hidden: true,
      textTemplate: '',
      htmlTemplate: '',
      subjectTemplate: ''
    },
    notification.ids.CollaboratorNotification
  )

  // Temporarily disabled, we should think about it
  // builder.createDoc(
  //   notification.class.NotificationProvider,
  //   core.space.Model,
  //   {
  //     label: notification.string.BrowserNotification,
  //     default: true
  //   },
  //   notification.ids.BrowserNotification
  // )

  builder.createDoc(
    notification.class.NotificationProvider,
    core.space.Model,
    {
      label: notification.string.EmailNotification,
      default: true
    },
    notification.ids.EmailNotification
  )

  builder.createDoc(
    setting.class.SettingsCategory,
    core.space.Model,
    {
      name: 'notifications',
      label: notification.string.Notifications,
      icon: notification.icon.Notifications,
      component: notification.component.NotificationSettings,
      group: 'settings',
      secured: false,
      order: 2500
    },
    notification.ids.NotificationSettings
  )
}

export { notificationOperation } from './migration'
export { notification as default }
