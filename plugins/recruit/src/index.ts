//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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

import { Calendar } from '@hcengineering/calendar'
import type { Attribute, Class, Doc, Mixin, Ref, Status } from '@hcengineering/core'
import type { Asset, IntlString, Plugin, Resource } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'
import type { ProjectTypeDescriptor, TaskType } from '@hcengineering/task'
import { AnyComponent, ResolvedLocation } from '@hcengineering/ui'
import type {
  Applicant,
  ApplicantMatch,
  Candidate,
  Candidates,
  Opinion,
  Review,
  ScriptTypedAttributeEditorMixin,
  ScriptTypedAttributeFactoryMixin,
  ScriptTypedPropertyEditorMixin,
  Vacancy,
  VacancyList
} from './types'

export * from './types'

/**
 * @public
 */
export const recruitId = 'recruit' as Plugin

/**
 * @public
 */
const recruit = plugin(recruitId, {
  app: {
    Recruit: '' as Ref<Doc>
  },
  class: {
    Applicant: '' as Ref<Class<Applicant>>,
    ApplicantMatch: '' as Ref<Class<ApplicantMatch>>,
    Candidates: '' as Ref<Class<Candidates>>,
    Vacancy: '' as Ref<Class<Vacancy>>,
    Review: '' as Ref<Class<Review>>,
    Opinion: '' as Ref<Class<Opinion>>
  },
  descriptors: {
    VacancyType: '' as Ref<ProjectTypeDescriptor>
  },
  mixin: {
    Candidate: '' as Ref<Mixin<Candidate>>,
    VacancyList: '' as Ref<Mixin<VacancyList>>,
    ScriptTypedAttributeEditor: '' as Ref<Mixin<ScriptTypedAttributeEditorMixin<any>>>,
    ScriptTypedAttributeFactory: '' as Ref<Mixin<ScriptTypedAttributeFactoryMixin<any>>>,
    ScriptTypedPropertyEditor: '' as Ref<Mixin<ScriptTypedPropertyEditorMixin<any>>>
  },
  attribute: {
    State: '' as Ref<Attribute<Status>>
  },
  component: {
    EditVacancy: '' as AnyComponent
  },
  string: {
    ConfigLabel: '' as IntlString
  },
  icon: {
    RecruitApplication: '' as Asset,
    Vacancy: '' as Asset,
    Location: '' as Asset,
    Calendar: '' as Asset,
    Create: '' as Asset,
    Application: '' as Asset,
    Review: '' as Asset,
    Opinion: '' as Asset,
    CreateCandidate: '' as Asset,
    AssignedToMe: '' as Asset,
    Reviews: '' as Asset,
    Skills: '' as Asset,
    Issue: '' as Asset,
    Schedule: '' as Asset,
    Talents: '' as Asset,
    Script: '' as Asset
  },
  resolver: {
    Location: '' as Resource<(loc: Location) => Promise<ResolvedLocation | undefined>>
  },
  space: {
    Reviews: '' as Ref<Calendar>
  },
  taskTypes: {
    Applicant: '' as Ref<TaskType>
  }
})

export default recruit
