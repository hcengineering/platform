//
// Copyright © 2020 Anticrm Platform Contributors.
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

import { Ref } from '@anticrm/core'
import type { IntlString, StatusCode } from '@anticrm/platform'
import { mergeIds } from '@anticrm/platform'
import recruit, { recruitId } from '@anticrm/recruit'
import { KanbanTemplateSpace } from '@anticrm/task'

export default mergeIds(recruitId, recruit, {
  status: {
    ApplicationExists: '' as StatusCode,
    CandidateRequired: '' as StatusCode,
    VacancyRequired: '' as StatusCode
  },
  string: {
    CreateVacancy: '' as IntlString,
    VacancyName: '' as IntlString,
    VacancyDescription: '' as IntlString,
    MakePrivate: '' as IntlString,
    MakePrivateDescription: '' as IntlString,
    CreateCandidates: '' as IntlString,
    CandidatesName: '' as IntlString,
    CandidatesDescription: '' as IntlString,
    CreateCandidate: '' as IntlString,
    CreateAnApplication: '' as IntlString,
    NoApplicationsForCandidate: '' as IntlString,
    FirstName: '' as IntlString,
    LastName: '' as IntlString
  },
  space: {
    VacancyTemplates: '' as Ref<KanbanTemplateSpace>
  }
})
