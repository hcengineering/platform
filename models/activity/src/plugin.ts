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
import type { DisplayTx } from '@hcengineering/activity'
import { activityId } from '@hcengineering/activity'
import activity from '@hcengineering/activity-resources/src/plugin'
import type { Resource, IntlString } from '@hcengineering/platform'
import { mergeIds } from '@hcengineering/platform'
import { Doc, Ref } from '@hcengineering/core'

export default mergeIds(activityId, activity, {
  filter: {
    AttributeFilter: '' as Resource<(tx: DisplayTx, _class?: Ref<Doc>) => boolean>
  },
  string: {
    Attributes: '' as IntlString
  }
})
