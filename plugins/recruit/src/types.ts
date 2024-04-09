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
import type {
  AttachedData,
  AttachedDoc,
  BaseAttribute,
  Class,
  Markup,
  PropertyOfType,
  PropertyType,
  Rank,
  Ref,
  Space,
  Status,
  Timestamp,
  Type
} from '@hcengineering/core'
import type { Resource } from '@hcengineering/platform'
import { TagReference } from '@hcengineering/tags'
import type { Project, Task } from '@hcengineering/task'
import type { ComponentType, SvelteComponent } from 'svelte'

/** @public */
export interface Candidates extends Space {}

/** @public */
export interface Vacancy extends Project {
  fullDescription?: string
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

/**
 * @public
 *
 * Base attribute to use in scripts. For declarative use only, i.e.
 * it has no implementation class in models, because Platform doesn't
 * yet support inheritance for attribute classes
 * (see hardcoded checks like object._class === core.class.Attribute)
 */
export interface ScriptAttribute<T extends PropertyType = any> extends BaseAttribute<T> {
  title: string
  rank: Rank
  defaultValue: T
}

/** @public */
export interface ScriptTypedAttributeEditorComponentProps<T extends Type<any>> {
  object: ScriptAttribute<T extends Type<infer P> ? P : never>
  readonly: boolean
}

/** @public */
export type ScriptTypedAttributeEditorComponentType<T extends Type<any>> = ComponentType<
SvelteComponent<ScriptTypedAttributeEditorComponentProps<T>>
>

/** @public */
export interface ScriptTypedAttributeEditorMixin<T extends Type<any>> extends Class<T> {
  editor: Resource<ScriptTypedAttributeEditorComponentType<T>>
}

/** @public */
export type ScriptTypedAttributeFactoryFn<T extends Type<any>> = () => Promise<
Pick<ScriptAttribute<PropertyOfType<T>>, 'defaultValue'>
>

/** @public */
export interface ScriptTypedAttributeFactoryMixin<T extends Type<any>> extends Class<T> {
  factory: Resource<ScriptTypedAttributeFactoryFn<T>>
}

/** @public */
export type ScriptTypedPropertyEditorComponentChange<T extends Type<any>> =
  | ((value: PropertyOfType<T>) => Promise<boolean>)
  | null

/** @public */
export interface ScriptTypedPropertyEditorComponentProps<T extends Type<any>> {
  attribute: ScriptAttribute<T>
  value: PropertyOfType<T>
  change: ScriptTypedPropertyEditorComponentChange<T>
}

/** @public */
export type ScriptTypedPropertyEditorComponentType<T extends Type<any>> = ComponentType<
SvelteComponent<ScriptTypedPropertyEditorComponentProps<T>>
>

/** @public */
export interface ScriptTypedPropertyEditorMixin<T extends Type<any>> extends Class<T> {
  editor: Resource<ScriptTypedPropertyEditorComponentType<T>>
}
