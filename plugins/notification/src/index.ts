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

import type { Account, AttachedDoc, Class, Ref, Space, Timestamp } from '@anticrm/core'
import type { Plugin } from '@anticrm/platform'
import { plugin } from '@anticrm/platform'

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
export const notificationId = 'notification' as Plugin

/**
 * @public
 */
const notification = plugin(notificationId, {
  class: {
    LastView: '' as Ref<Class<LastView>>
  },
  space: {
    Notifications: '' as Ref<Space>
  }
})

export default notification
