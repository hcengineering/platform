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

import { Event } from '@hcengineering/calendar'
import type { Channel, Organization, Person } from '@hcengineering/contact'
import type { AttachedData, AttachedDoc, CollaborativeDoc, Markup, Ref, Status, Timestamp } from '@hcengineering/core'
import { TagReference } from '@hcengineering/tags'
import type { Project, Task } from '@hcengineering/task'

/** @public */
export interface Vacancy extends Project {
  fullDescription?: CollaborativeDoc
  attachments?: number
  dueTo?: Timestamp
  location?: string
  company?: Ref<Organization>
  comments?: number
  number: number
}

/** @public */
export interface VacancyList extends Organization {
  vacancies: number
}

/** @public */
export interface Candidate extends Person {
  title?: string
  applications?: number
  onsite?: boolean
  remote?: boolean
  source?: string
  skills?: number
  reviews?: number
}

/** @public */
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

/** @public */
export interface Applicant extends Task {
  space: Ref<Vacancy>
  attachedTo: Ref<Candidate>
  status: Ref<Status>
  startDate: Timestamp | null
}

/** @public */
export interface ApplicantMatch extends AttachedDoc {
  attachedTo: Ref<Candidate>

  complete: boolean
  vacancy: string
  summary: string
  response: string
}

/** @public */
export interface Review extends Event {
  attachedTo: Ref<Candidate>
  number: number
  verdict: string
  application?: Ref<Applicant>
  company?: Ref<Organization>
  opinions?: number
}

/** @public */
export interface Opinion extends AttachedDoc {
  number: number
  attachedTo: Ref<Review>
  comments?: number
  attachments?: number
  description: Markup
  value: string
}
