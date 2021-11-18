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
import type { IntlString, Resource } from '@anticrm/platform'
import type { Ref, Space, Doc } from '@anticrm/core'
import type { AnyComponent } from '@anticrm/ui'
import type { Action } from '@anticrm/view'
import { recruitId } from '@anticrm/recruit'
import recruit from '@anticrm/recruit-resources/src/plugin'
import { TxViewlet } from '../../chunter/node_modules/@anticrm/activity/lib'

export default mergeIds(recruitId, recruit, {
  action: {
    CreateApplication: '' as Ref<Action>
  },
  actionImpl: {
    CreateApplication: '' as Resource<(object: Doc) => Promise<void>>
  },
  string: {
    RecruitApplication: '' as IntlString,
    Vacancies: '' as IntlString,
    CandidatePools: '' as IntlString,
    Vacancy: '' as IntlString,
    TxApplicantCreate: '' as IntlString,
    TxCandidateCreate: '' as IntlString,
    TxApplicantUpdate: '' as IntlString
  },
  component: {
    CreateVacancy: '' as AnyComponent,
    CreateCandidates: '' as AnyComponent,
    CreateCandidate: '' as AnyComponent,
    CreateApplication: '' as AnyComponent,
    EditCandidate: '' as AnyComponent,
    KanbanCard: '' as AnyComponent,
    ApplicationPresenter: '' as AnyComponent,
    ApplicationsPresenter: '' as AnyComponent
  },
  space: {
    CandidatesPublic: '' as Ref<Space>
  },
  ids: {
    TxApplicantCreate: '' as Ref<TxViewlet>,
    TxCandidateCreate: '' as Ref<TxViewlet>,
    TxApplicantUpdate: '' as Ref<TxViewlet>
  },
  activity: {
    TxApplicantCreate: '' as AnyComponent,
    TxApplicantUpdate: '' as AnyComponent
  }
})
