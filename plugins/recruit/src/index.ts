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

import { Calendar, Event } from '@hcengineering/calendar'
import type { Channel, Organization, Person } from '@hcengineering/contact'
import type {
  AttachedData,
  AttachedDoc,
  Attribute,
  Class,
  Doc,
  Mixin,
  Ref,
  Space,
  Timestamp
} from '@hcengineering/core'
import type { Asset, IntlString, Plugin, Resource } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'
import { TagReference } from '@hcengineering/tags'
import type { DoneState, KanbanTemplateSpace, SpaceWithStates, State, Task } from '@hcengineering/task'
import { AnyComponent, ResolvedLocation } from '@hcengineering/ui'

/**
 * @public
 */
export interface Vacancy extends SpaceWithStates {
  fullDescription?: string
  attachments?: number
  dueTo?: Timestamp
  location?: string
  company?: Ref<Organization>
  comments?: number
  number: number
}

/**
 * @public
 */
export interface VacancyList extends Organization {
  vacancies: number
}

/**
 * @public
 */
export interface Candidates extends Space {}

/**
 * @public
 */
export interface Candidate extends Person {
  title?: string
  applications?: number
  onsite?: boolean
  remote?: boolean
  source?: string
  skills?: number
  reviews?: number
}

/**
 * @public
 */
export interface CandidateDraft {
  _id: Ref<Candidate>
  firstName?: string
  lastName?: string
  title?: string
  city: string
  resumeUuid?: string
  resumeName?: string
  resumeSize?: number
  resumeType?: string
  resumeLastModified?: number
  avatar?: File | undefined
  channels: AttachedData<Channel>[]
  onsite?: boolean
  remote?: boolean
  skills: TagReference[]
}

/**
 * @public
 */
export interface Applicant extends Task {
  space: Ref<Vacancy>
  attachedTo: Ref<Candidate>
  status: Ref<State>
  startDate: Timestamp | null
}

/**
 * @public
 */
export interface ApplicantMatch extends AttachedDoc {
  attachedTo: Ref<Candidate>

  complete: boolean
  vacancy: string
  summary: string
  response: string
}

/**
 * @public
 */
export interface Review extends Event {
  attachedTo: Ref<Candidate>
  number: number

  verdict: string

  application?: Ref<Applicant>

  company?: Ref<Organization>

  opinions?: number
}

/**
 * @public
 */
export interface Opinion extends AttachedDoc {
  number: number
  attachedTo: Ref<Review>
  comments?: number
  attachments?: number
  description: string
  value: string
}

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
  mixin: {
    Candidate: '' as Ref<Mixin<Candidate>>,
    VacancyList: '' as Ref<Mixin<VacancyList>>
  },
  attribute: {
    State: '' as Ref<Attribute<State>>,
    DoneState: '' as Ref<Attribute<DoneState>>
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
    Talents: '' as Asset
  },
  resolver: {
    Location: '' as Resource<(loc: Location) => Promise<ResolvedLocation | undefined>>
  },
  space: {
    VacancyTemplates: '' as Ref<KanbanTemplateSpace>,
    Reviews: '' as Ref<Calendar>
  }
})

export default recruit
