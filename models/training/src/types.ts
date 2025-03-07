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

import type { Attachment } from '@hcengineering/attachment'
import attachments from '@hcengineering/model-attachment'
import questions, { TypePercentage } from '@hcengineering/model-questions'
import type { Answer, Percentage, Question } from '@hcengineering/questions'
import {
  type Training,
  type TrainingAttempt,
  TrainingAttemptState,
  type TrainingRequest,
  TrainingState
} from '@hcengineering/training'
import contact, { type Employee } from '@hcengineering/contact'
import core, {
  type Class,
  type CollectionSize,
  type Domain,
  IndexKind,
  type Markup,
  type Ref,
  type Timestamp,
  type Type,
  type TypedSpace,
  RolesAssignment,
  Role,
  type AccountUuid
} from '@hcengineering/core'
import {
  ArrOf,
  Collection,
  Hidden,
  Index,
  Mixin,
  Model,
  Prop,
  TypeMarkup,
  TypeNumber,
  TypeRef,
  TypeString,
  TypeTimestamp,
  UX
} from '@hcengineering/model'
import { TAttachedDoc, TDoc, TType, TTypedSpace } from '@hcengineering/model-core'
import training from './plugin'
import { getEmbeddedLabel } from '@hcengineering/platform'

export const DOMAIN_TRAINING = 'training' as Domain

/** @public */
export function TypeTrainingState (): Type<TrainingState> {
  return { _class: training.class.TypeTrainingState, label: training.string.State }
}

@UX(training.string.State)
@Model(training.class.TypeTrainingState, core.class.Type)
export class TTrainingState extends TType {}

/** @public */
export function TypeTrainingAttemptState (): Type<TrainingAttemptState> {
  return { _class: training.class.TypeTrainingAttemptState, label: training.string.State }
}

@UX(training.string.State)
@Model(training.class.TypeTrainingAttemptState, core.class.Type)
export class TTrainingAttemptState extends TType {}

/** @public */
@Model(training.class.Training, core.class.Doc, DOMAIN_TRAINING)
@UX(training.string.Training, training.icon.Training)
export class TTraining extends TDoc implements Training {
  @Prop(TypeRef(core.class.TypedSpace), core.string.Space)
  @Index(IndexKind.Indexed)
  @Hidden()
  declare space: Ref<TypedSpace>

  @Prop(TypeString(), training.string.TrainingTitle)
  @Index(IndexKind.FullText)
    title!: string

  @Prop(TypeString(), core.string.Id)
  @Index(IndexKind.FullText)
    code!: string

  @Prop(TypeNumber(), training.string.Revision)
  @Index(IndexKind.Indexed)
    revision!: number

  @Prop(TypeRef(contact.mixin.Employee), training.string.TrainingAuthor, {
    editor: training.component.EmployeeEditor
  })
    author!: Ref<Employee>

  @Prop(TypeRef(contact.mixin.Employee), training.string.Owner, {
    editor: training.component.EmployeeEditor
  })
    owner!: Ref<Employee>

  @Prop(TypeTrainingState(), training.string.State)
    state!: TrainingState

  @Prop(TypeMarkup(), core.string.Description, { defaultValue: 0 })
  @Index(IndexKind.Indexed)
    description: Markup = ''

  @Prop(Collection(attachments.class.Attachment), attachments.string.Attachments, { defaultValue: 0 })
    attachments: CollectionSize<Attachment> = 0

  @Prop(TypePercentage(), training.string.TrainingPassingScore, { defaultValue: 100 })
  @Index(IndexKind.Indexed)
    passingScore: Percentage = 100

  @Prop(TypeTimestamp(), training.string.TrainingReleasedOn, { defaultValue: null })
  @Index(IndexKind.Indexed)
    releasedOn: Timestamp | null = null

  @Prop(TypeRef(contact.mixin.Employee), training.string.TrainingReleasedBy, {
    defaultValue: null,
    editor: training.component.EmployeeEditor
  })
    releasedBy: Ref<Employee> | null = null

  @Prop(Collection(questions.class.Question), training.string.TrainingQuestions, { defaultValue: 0 })
    questions: CollectionSize<Question<any>> = 0

  @Prop(Collection(training.class.TrainingRequest), training.string.TrainingRequests, { defaultValue: 0 })
    requests: CollectionSize<TrainingRequest> = 0
}

@Model(training.class.TrainingRequest, core.class.AttachedDoc, DOMAIN_TRAINING)
@UX(training.string.TrainingRequest, training.icon.TrainingRequest)
export class TTrainingRequest extends TAttachedDoc implements TrainingRequest {
  @Prop(TypeRef(core.class.TypedSpace), core.string.Space)
  @Index(IndexKind.Indexed)
  @Hidden()
  declare space: Ref<TypedSpace>

  @Prop(TypeRef(training.class.Training), core.string.AttachedTo)
  @Index(IndexKind.Indexed)
  @Hidden()
  declare attachedTo: Ref<Training>

  @Prop(TypeRef(training.class.Training), core.string.AttachedToClass)
  @Index(IndexKind.Indexed)
  @Hidden()
  declare attachedToClass: Ref<Class<Training>>

  @Prop(TypeString(), core.string.Collection)
  @Hidden()
  override collection: 'requests' = 'requests'

  @Prop(TypeRef(contact.mixin.Employee), training.string.Owner, {
    editor: training.component.EmployeeEditor
  })
  @Index(IndexKind.Indexed)
    owner!: Ref<Employee>

  @Prop(ArrOf(TypeRef(contact.mixin.Employee)), training.string.TrainingRequestTrainees, {
    editor: training.component.TrainingRequestTraineesEditor
  })
    trainees: Ref<Employee>[] = []

  @Prop(TypeTimestamp(), training.string.TrainingRequestDueDate, {
    defaultValue: null,
    editor: training.component.TrainingRequestDueDateEditor
  })
  @Index(IndexKind.Indexed)
    dueDate: Timestamp | null = null

  @Prop(TypeNumber(), training.string.TrainingRequestMaxAttempts, {
    defaultValue: null,
    editor: training.component.TrainingRequestMaxAttemptsEditor
  })
    maxAttempts: number | null = null

  @Prop(Collection(training.class.TrainingAttempt), training.string.TrainingAttempts, { defaultValue: 0 })
    attempts: CollectionSize<TrainingAttempt> = 0

  @Prop(TypeTimestamp(), training.string.TrainingRequestCanceledDate, { defaultValue: null })
    canceledOn: Timestamp | null = null

  @Prop(TypeRef(contact.mixin.Employee), training.string.TrainingRequestCanceledBy, {
    defaultValue: null,
    editor: training.component.EmployeeEditor
  })
    canceledBy: Ref<Employee> | null = null
}

@Model(training.class.TrainingAttempt, core.class.AttachedDoc, DOMAIN_TRAINING)
@UX(training.string.TrainingAttempt, training.icon.TrainingAttempt)
export class TTrainingAttempt extends TAttachedDoc implements TrainingAttempt {
  @Prop(TypeRef(core.class.TypedSpace), core.string.Space)
  @Index(IndexKind.Indexed)
  @Hidden()
  declare space: Ref<TypedSpace>

  @Prop(TypeRef(training.class.TrainingRequest), core.string.AttachedTo)
  @Index(IndexKind.Indexed)
  @Hidden()
  declare attachedTo: Ref<TrainingRequest>

  @Prop(TypeRef(training.class.TrainingRequest), core.string.AttachedToClass)
  @Index(IndexKind.Indexed)
  @Hidden()
  declare attachedToClass: Ref<Class<TrainingRequest>>

  @Prop(TypeString(), core.string.Collection)
  @Hidden()
  override collection: 'attempts' = 'attempts'

  @Prop(TypeRef(contact.mixin.Employee), training.string.Owner, {
    editor: training.component.EmployeeEditor
  })
  @Index(IndexKind.Indexed)
    owner!: Ref<Employee>

  @Prop(TypeNumber(), training.string.TrainingAttempt, { defaultValue: 1 })
  @Index(IndexKind.Indexed)
    seqNumber: number = 1

  @Prop(TypeTrainingAttemptState(), training.string.State)
  @Index(IndexKind.Indexed)
    state: TrainingAttemptState = TrainingAttemptState.Draft

  @Prop(Collection(questions.class.Answer), questions.string.Answers, { defaultValue: 0 })
    answers: CollectionSize<Answer<any, any>> = 0

  @Prop(TypeTimestamp(), training.string.TrainingAttemptSubmittedDate, { defaultValue: null })
  @Index(IndexKind.Indexed)
    submittedOn: Timestamp | null = null

  @Prop(TypeRef(contact.mixin.Employee), training.string.TrainingAttemptSubmittedBy, {
    defaultValue: null,
    editor: training.component.EmployeeEditor
  })
    submittedBy: Ref<Employee> | null = null

  @Prop(TypePercentage(), questions.string.Score, { defaultValue: null })
  @Index(IndexKind.Indexed)
    score: Percentage | null = null

  @Prop(TypeNumber(), training.string.TrainingAttemptAssessmentsTotal, { defaultValue: null })
    assessmentsTotal: number | null = null

  @Prop(TypeNumber(), training.string.TrainingAttemptAssessmentsPassed, { defaultValue: null })
    assessmentsPassed: number | null = null
}

@Mixin(training.mixin.TrainingsTypeData, core.class.TypedSpace)
@UX(getEmbeddedLabel('Default Trainings'), training.icon.TrainingApplication)
export class TTrainingsTypeData extends TTypedSpace implements RolesAssignment {
  [key: Ref<Role>]: AccountUuid[]
}
