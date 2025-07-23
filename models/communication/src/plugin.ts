//
// Copyright © 2025 Hardcore Engineering Inc.
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

import { communicationId, type Poll } from '@hcengineering/communication'
import communication from '@hcengineering/communication-resources/src/plugin'
import { type Attribute, type Ref } from '@hcengineering/core'
import {} from '@hcengineering/ui'
import { mergeIds, type Resource } from '@hcengineering/platform'
import { type ViewAction } from '@hcengineering/model-view'
import { type Card } from '@hcengineering/card'

export default mergeIds(communicationId, communication, {
  action: {
    Unsubscribe: '' as ViewAction,
    Subscribe: '' as ViewAction
  },
  function: {
    CanSubscribe: '' as Resource<(doc: Card | Card[] | undefined) => Promise<boolean>>,
    CanUnsubscribe: '' as Resource<(doc: Card | Card[] | undefined) => Promise<boolean>>
  },
  ids: {
    UserVotesAttribute: '' as Ref<Attribute<Poll>>
  }
})
