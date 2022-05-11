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

import { Calendar, Event } from '@anticrm/calendar'
import type { Organization, Person } from '@anticrm/contact'
import type { AttachedDoc, Class, Doc, Mixin, Ref, Space, Timestamp } from '@anticrm/core'
import type { Asset, Plugin } from '@anticrm/platform'
import { plugin } from '@anticrm/platform'
import type { KanbanTemplateSpace, SpaceWithStates, Task } from '@anticrm/task'
import { AnyComponent } from '@anticrm/ui'

/**
 * @public
 */
export interface Vacancy extends SpaceWithStates {
  fullDescription?: string
  attachments?: number
  dueTo?: Timestamp
  location?: string
  company?: Ref<Organization>
}

/**
 * @public
 */
export interface ReviewCategory extends Calendar {
  fullDescription?: string
  attachments?: number
  comments?: number
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
export interface Applicant extends Task {
  attachedTo: Ref<Candidate>
  attachments?: number
  comments?: number
}

/**
 * @public
 */
export interface Review extends Event {
  attachedTo: Ref<Candidate>
  number: number

  verdict: string

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
    Candidates: '' as Ref<Class<Candidates>>,
    Vacancy: '' as Ref<Class<Vacancy>>,
    ReviewCategory: '' as Ref<Class<ReviewCategory>>,
    Review: '' as Ref<Class<Review>>,
    Opinion: '' as Ref<Class<Opinion>>
  },
  mixin: {
    Candidate: '' as Ref<Mixin<Candidate>>
  },
  component: {
    EditVacancy: '' as AnyComponent
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
    CreateCandidate: '' as Asset
  },
  space: {
    VacancyTemplates: '' as Ref<KanbanTemplateSpace>,
    ReviewTemplates: '' as Ref<KanbanTemplateSpace>
  }
})

export default recruit
