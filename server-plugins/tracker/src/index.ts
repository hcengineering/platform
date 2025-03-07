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

import { Doc } from '@hcengineering/core'
import type { Plugin, Resource } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'
import { TriggerFunc } from '@hcengineering/server-core'
import { Presenter, NotificationContentProvider } from '@hcengineering/server-notification'

/**
 * @public
 */
export const serverTrackerId = 'server-tracker' as Plugin

/**
 * @public
 */
export default plugin(serverTrackerId, {
  function: {
    IssueHTMLPresenter: '' as Resource<Presenter>,
    IssueTextPresenter: '' as Resource<Presenter>,
    IssueNotificationContentProvider: '' as Resource<NotificationContentProvider>,
    IssueLinkIdProvider: '' as Resource<(doc: Doc) => Promise<string>>
  },
  trigger: {
    OnEmployeeCreate: '' as Resource<TriggerFunc>,
    OnIssueUpdate: '' as Resource<TriggerFunc>,
    OnComponentRemove: '' as Resource<TriggerFunc>,
    OnProjectRemove: '' as Resource<TriggerFunc>
  }
})
