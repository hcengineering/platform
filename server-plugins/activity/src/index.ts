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

import { Plugin, Resource, plugin } from '@hcengineering/platform'
import type { TriggerFunc } from '@hcengineering/server-core'
import { NotificationContentProvider, Presenter } from '@hcengineering/server-notification'

export * from './types'
export * from './utils'

/**
 * @public
 */
export const serverActivityId = 'server-activity' as Plugin

/**
 * @public
 */
export default plugin(serverActivityId, {
  trigger: {
    ActivityMessagesHandler: '' as Resource<TriggerFunc>,
    OnDocRemoved: '' as Resource<TriggerFunc>,
    OnReactionChanged: '' as Resource<TriggerFunc>,
    ReferenceTrigger: '' as Resource<TriggerFunc>,
    HandleCardActivity: '' as Resource<TriggerFunc>
  },
  function: {
    ReactionNotificationContentProvider: '' as Resource<NotificationContentProvider>,
    DocUpdateMessageTextPresenter: '' as Resource<Presenter>
  }
})
