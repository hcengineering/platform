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

import { Account, AttachedDoc, Class, Doc, Mixin, Ref, Space, Timestamp, TxCUD } from '@hcengineering/core'
import type { Asset, IntlString, Plugin, Resource } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'
import { IntegrationType } from '@hcengineering/setting'
import { AnyComponent } from '@hcengineering/ui'
import { Writable } from './types'
export * from './types'

/**
 * @public
 */
export interface LastView extends Doc {
  user: Ref<Account>
  [key: string]: any
}

/**
 * @public
 */
export interface Notification extends AttachedDoc {
  tx: Ref<TxCUD<Doc>>
  status: NotificationStatus
  text: string
  type: Ref<NotificationType>
}

/**
 * @public
 */
export interface EmailNotification extends Doc {
  sender: string
  receivers: string[]
  subject: string
  text: string
  html?: string
  status: 'new' | 'sent' | 'error'
  error?: string
}

/**
 * @public
 */
export enum NotificationStatus {
  New,
  Notified,
  Read
}

/**
 * @public
 */
export interface NotificationType extends Doc {
  hidden: boolean
  label: IntlString
  textTemplate: string
  htmlTemplate: string
  subjectTemplate: string
}

/**
 * @public
 */
export interface NotificationProvider extends Doc {
  label: IntlString
  default: boolean
}

/**
 * @public
 */
export interface NotificationSetting extends Doc {
  type: Ref<NotificationType>
  provider: Ref<NotificationProvider>
  enabled: boolean
}

/**
 * @public
 */
export interface SpaceLastEdit extends Class<Doc> {
  lastEditField: string
}

/**
 * @public
 */
export interface AnotherUserNotifications extends Class<Doc> {
  fields: string[]
}

/**
 * @public
 */
export interface ClassCollaborators extends Class<Doc> {
  fields: string[] // Ref<Account> | Ref<Employee> | Ref<Account>[] | Ref<Employee>[]
}

/**
 * @public
 */
export interface TrackedDoc extends Class<Doc> {}

/**
 * @public
 */
export interface NotificationObjectPresenter extends Class<Doc> {
  presenter: AnyComponent
}

/**
 * @public
 */
export interface Collaborators extends Doc {
  collaborators: Ref<Account>[]
}

/**
 * @public
 */
export interface DocUpdates extends Doc {
  user: Ref<Account>
  attachedTo: Ref<Doc>
  attachedToClass: Ref<Class<Doc>>
  hidden: boolean
  lastTx: Ref<TxCUD<Doc>>
  lastTxTime: Timestamp
  txes: [Ref<TxCUD<Doc>>, Timestamp][]
}

/**
 * @public
 */
export const notificationId = 'notification' as Plugin

/**
 * @public
 */
export interface NotificationClient {
  docUpdatesStore: Writable<Map<Ref<Doc>, DocUpdates>>
  getLastViews: () => Writable<LastView>
  updateLastView: (_id: Ref<Doc>, _class: Ref<Class<Doc>>, time?: Timestamp, force?: boolean) => Promise<void>
  unsubscribe: (_id: Ref<Doc>) => Promise<void>
}

/**
 * @public
 */
export type NotificationClientFactoy = () => NotificationClient

/**
 * @public
 */
const notification = plugin(notificationId, {
  mixin: {
    SpaceLastEdit: '' as Ref<Mixin<SpaceLastEdit>>,
    AnotherUserNotifications: '' as Ref<Mixin<AnotherUserNotifications>>,
    ClassCollaborators: '' as Ref<Mixin<ClassCollaborators>>,
    Collaborators: '' as Ref<Mixin<Collaborators>>,
    TrackedDoc: '' as Ref<Mixin<TrackedDoc>>,
    NotificationObjectPresenter: '' as Ref<Mixin<NotificationObjectPresenter>>
  },
  class: {
    LastView: '' as Ref<Class<LastView>>,
    Notification: '' as Ref<Class<Notification>>,
    EmailNotification: '' as Ref<Class<EmailNotification>>,
    NotificationType: '' as Ref<Class<NotificationType>>,
    NotificationProvider: '' as Ref<Class<NotificationProvider>>,
    NotificationSetting: '' as Ref<Class<NotificationSetting>>,
    DocUpdates: '' as Ref<Class<DocUpdates>>
  },
  ids: {
    MentionNotification: '' as Ref<NotificationType>,
    DMNotification: '' as Ref<NotificationType>,
    PlatformNotification: '' as Ref<NotificationProvider>,
    BrowserNotification: '' as Ref<NotificationProvider>,
    EmailNotification: '' as Ref<NotificationProvider>,
    NotificationSettings: '' as Ref<Doc>
  },
  integrationType: {
    MobileApp: '' as Ref<IntegrationType>
  },
  component: {
    Inbox: '' as AnyComponent,
    NotificationPresenter: '' as AnyComponent
  },
  icon: {
    Notifications: '' as Asset,
    Track: '' as Asset,
    DontTrack: '' as Asset,
    Hide: '' as Asset
  },
  space: {
    Notifications: '' as Ref<Space>
  },
  string: {
    Notification: '' as IntlString,
    Notifications: '' as IntlString,
    DontTrack: '' as IntlString,
    Inbox: '' as IntlString
  },
  function: {
    GetNotificationClient: '' as Resource<NotificationClientFactoy>
  }
})

export default notification
