//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2022, 2023 Hardcore Engineering Inc.
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

import { ActivityMessage } from '@hcengineering/activity'
import { Employee, Person, PersonSpace } from '@hcengineering/contact'
import { PersonId, Class, Doc, Mixin, Ref, Tx, TxCUD } from '@hcengineering/core'
import {
  BaseNotificationType,
  InboxNotification,
  NotificationContent,
  NotificationProvider,
  NotificationType
} from '@hcengineering/notification'
import { Metadata, Plugin, Resource, plugin } from '@hcengineering/platform'
import type { TriggerControl, TriggerFunc } from '@hcengineering/server-core'

/**
 * @public
 */
export const serverNotificationId = 'server-notification' as Plugin
export { DOMAIN_USER_NOTIFY, DOMAIN_NOTIFICATION, DOMAIN_DOC_NOTIFY } from '@hcengineering/notification'

/**
 * @public
 */
export type Presenter<T extends Doc = any> = (doc: T, control: TriggerControl) => Promise<string>

/**
 * @public
 */
export interface HTMLPresenter<T extends Doc = any> extends Class<T> {
  presenter: Resource<Presenter<T>>
}

/**
 * @public
 */
export interface TextPresenter<T extends Doc = any> extends Class<T> {
  presenter: Resource<Presenter<T>>
}

/**
 * @public
 */
export type TypeMatchFunc = Resource<
(
  tx: Tx,
  doc: Doc,
  person: Person,
  socialIds: PersonId[],
  type: NotificationType,
  control: TriggerControl
) => boolean | Promise<boolean>
>

/**
 * @public
 */
export interface TypeMatch extends NotificationType {
  func: TypeMatchFunc
}

/**
 * @public
 */
export type NotificationContentProvider = (
  doc: Doc,
  tx: TxCUD<Doc>,
  target: PersonId,
  control: TriggerControl
) => Promise<NotificationContent>

/**
 * @public
 */
export interface NotificationPresenter extends Class<Doc> {
  presenter: Resource<NotificationContentProvider>
}

export interface ReceiverInfo {
  _id: PersonId
  person: Person
  socialStrings: PersonId[]

  space: Ref<PersonSpace>
  employee: Employee
}

export interface SenderInfo {
  _id: PersonId
  person?: Person
  socialStrings: PersonId[]
}

export type NotificationProviderFunc = (
  control: TriggerControl,
  types: BaseNotificationType[],
  object: Doc,
  data: InboxNotification,
  receiver: ReceiverInfo,
  sender: SenderInfo,
  message?: ActivityMessage
) => Promise<Tx[]>

export interface NotificationProviderResources extends Doc {
  provider: Ref<NotificationProvider>
  fn: Resource<NotificationProviderFunc>
}

export const NOTIFICATION_BODY_SIZE = 50
export const PUSH_NOTIFICATION_TITLE_SIZE = 80

/**
 * @public
 */
export default plugin(serverNotificationId, {
  metadata: {
    SesUrl: '' as Metadata<string>,
    SesAuthToken: '' as Metadata<string>,
    WebPushUrl: '' as Metadata<string>,
    InboxOnlyNotifications: '' as Metadata<boolean>
  },
  class: {
    NotificationProviderResources: '' as Ref<Class<NotificationProviderResources>>
  },
  mixin: {
    HTMLPresenter: '' as Ref<Mixin<HTMLPresenter>>,
    TextPresenter: '' as Ref<Mixin<TextPresenter>>,
    TypeMatch: '' as Ref<Mixin<TypeMatch>>,
    NotificationPresenter: '' as Ref<Mixin<NotificationPresenter>>
  },
  trigger: {
    OnAttributeCreate: '' as Resource<TriggerFunc>,
    OnAttributeUpdate: '' as Resource<TriggerFunc>,
    OnReactionChanged: '' as Resource<TriggerFunc>,
    OnDocRemove: '' as Resource<TriggerFunc>,
    OnEmployeeDeactivate: '' as Resource<TriggerFunc>,
    PushNotificationsHandler: '' as Resource<TriggerFunc>
  },
  function: {
    IsUserInFieldValueTypeMatch: '' as TypeMatchFunc,
    IsUserEmployeeInFieldValueTypeMatch: '' as TypeMatchFunc
  }
})
