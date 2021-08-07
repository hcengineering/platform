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

import { mergeIds } from '@anticrm/platform'
import type { IntlString } from '@anticrm/platform' 
import type { Ref, Class } from '@anticrm/core'
import type { Applicant, Candidate, Candidates, Vacancy } from '@anticrm/recruit'
import recruit, { recruitId } from '@anticrm/recruit'

export default mergeIds(recruitId, recruit, {
  class: {
    Vacancy: '' as Ref<Class<Vacancy>>,
    Candidates: '' as Ref<Class<Candidates>>,
    Candidate: '' as Ref<Class<Candidate>>,
    Applicant: '' as Ref<Class<Applicant>>,
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

    FirstName: '' as IntlString,
    LastName: '' as IntlString,
  }
})
