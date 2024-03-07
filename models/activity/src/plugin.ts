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
import { activityId, type ActivityMessage, type DocUpdateMessageViewlet } from '@hcengineering/activity'
import activity from '@hcengineering/activity-resources/src/plugin'
import { type IntlString, mergeIds, type Resource } from '@hcengineering/platform'
import { type Doc, type Ref } from '@hcengineering/core'
import type { Location } from '@hcengineering/ui'
import { type ActionCategory } from '@hcengineering/view'
import { type NotificationGroup, type NotificationType } from '@hcengineering/notification'

export default mergeIds(activityId, activity, {
  string: {
    Attributes: '' as IntlString,
    Pinned: '' as IntlString,
    Emoji: '' as IntlString,
    Replies: '' as IntlString
  },
  filter: {
    AttributesFilter: '' as Resource<(message: ActivityMessage, _class?: Ref<Doc>) => boolean>,
    PinnedFilter: '' as Resource<(message: ActivityMessage, _class?: Ref<Doc>) => boolean>,
    AllFilter: '' as Resource<(message: ActivityMessage, _class?: Ref<Doc>) => boolean>,
    ReferencesFilter: '' as Resource<(message: ActivityMessage, _class?: Ref<Doc>) => boolean>
  },
  ids: {
    ReactionAddedActivityViewlet: '' as Ref<DocUpdateMessageViewlet>,
    ActivityNotificationGroup: '' as Ref<NotificationGroup>,
    AddReactionNotification: '' as Ref<NotificationType>
  },
  function: {
    GetFragment: '' as Resource<(doc: Doc, props: Record<string, any>) => Promise<Location>>
  },
  category: {
    Activity: '' as Ref<ActionCategory>
  }
})
