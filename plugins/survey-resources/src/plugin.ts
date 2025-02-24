//
// Copyright © 2024 Hardcore Engineering Inc.
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

import type { Client, Doc, Ref } from '@hcengineering/core'
import { type Resource, mergeIds } from '@hcengineering/platform'
import survey, { surveyId } from '@hcengineering/survey'
import type { Location, ResolvedLocation } from '@hcengineering/ui/src/types'
import type { Action, ActionCategory, ViewAction } from '@hcengineering/view'

export default mergeIds(surveyId, survey, {
  resolver: {
    Location: '' as Resource<(loc: Location) => Promise<ResolvedLocation | undefined>>
  },
  function: {
    GetPollLink: '' as Resource<(doc: Doc, props: Record<string, any>) => Promise<Location>>,
    GetSurveyLink: '' as Resource<(doc: Doc, props: Record<string, any>) => Promise<Location>>,
    PollTitleProvider: '' as Resource<(client: Client, ref: Ref<Doc>, doc?: Doc) => Promise<string>>,
    SurveyTitleProvider: '' as Resource<(client: Client, ref: Ref<Doc>, doc?: Doc) => Promise<string>>
  },
  actionImpl: {
    DeletePoll: '' as ViewAction
  },
  action: {
    DeletePoll: '' as Ref<Action<Doc, any>>
  },
  category: {
    Survey: '' as Ref<ActionCategory>
  }
})
