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

import type { Account, AttachedDoc, Class, Doc, Ref, Space, Timestamp, TxCUD } from '@anticrm/core'
import type { Asset, IntlString, Plugin } from '@anticrm/platform'
import { plugin } from '@anticrm/platform'
import { AnyComponent } from '@anticrm/ui'

/**
 * @public
 */
export interface LastView extends AttachedDoc {
  lastView: Timestamp
  user: Ref<Account>
}

/**
 * @public
 */
export interface Notification extends AttachedDoc {
  tx: Ref<TxCUD<Doc>>
  status: NotificationStatus
}

/**
 * @public
 */
export enum NotificationStatus {
  New,
  EmailSent,
  Read
}

/**
 * @public
 */
export const notificationId = 'notification' as Plugin

/**
 * @public
 */
const notification = plugin(notificationId, {
  class: {
    LastView: '' as Ref<Class<LastView>>,
    Notification: '' as Ref<Class<Notification>>
  },
  component: {
    NotificationsPopup: '' as AnyComponent
  },
  icon: {
    Notifications: '' as Asset
  },
  space: {
    Notifications: '' as Ref<Space>
  },
  string: {
    Notification: '' as IntlString,
    Notifications: '' as IntlString
  }
})

export default notification
