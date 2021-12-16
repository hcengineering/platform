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

import type { Doc, Ref, Space } from '@anticrm/core'
import type { IntlString, Resource } from '@anticrm/platform'
import { mergeIds } from '@anticrm/platform'
import { recruitId } from '@anticrm/recruit'
import recruit from '@anticrm/recruit-resources/src/plugin'
import type { AnyComponent } from '@anticrm/ui'
import type { Action } from '@anticrm/view'
import { Application } from '@anticrm/workbench'
import '@anticrm/task'

export default mergeIds(recruitId, recruit, {
  app: {
    Recruit: '' as Ref<Application>
  },
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
    Candidates: '' as IntlString,
    Vacancy: '' as IntlString
  },
  component: {
    CreateVacancy: '' as AnyComponent,
    CreateCandidates: '' as AnyComponent,
    CreateCandidate: '' as AnyComponent,
    CreateApplication: '' as AnyComponent,
    EditCandidate: '' as AnyComponent,
    KanbanCard: '' as AnyComponent,
    ApplicationPresenter: '' as AnyComponent,
    ApplicationsPresenter: '' as AnyComponent,
    EditVacancy: '' as AnyComponent,
    EditApplication: '' as AnyComponent,
    TemplatesIcon: '' as AnyComponent,
    Applications: '' as AnyComponent
  },
  space: {
    CandidatesPublic: '' as Ref<Space>
  }
})
