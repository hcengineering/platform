//
// Copyright © 2023 Hardcore Engineering Inc.
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

import {
  type Class,
  type CollectionSize,
  type Domain,
  IndexKind,
  type Markup,
  type Ref,
  type Type
} from '@hcengineering/core'
import core, { TAttachedDoc, TClass, TSpace } from '@hcengineering/model-core'

import {
  ArrOf,
  Collection,
  Hidden,
  Index,
  Mixin,
  Model,
  Prop,
  ReadOnly,
  TypeBoolean,
  TypeMarkup,
  TypeRef,
  TypeString,
  UX
} from '@hcengineering/model'
import survey from './plugin'
import {
  type Answer,
  type AnswerData,
  type AssessmentData,
  type Fraction,
  type MultipleChoiceQuestion,
  type Question,
  type QuestionEditor,
  type QuestionEditorComponentTypeRef,
  type QuestionOption,
  type Rank,
  type ReorderAssessmentData,
  type ReorderQuestion,
  type SingleChoiceAssessmentData,
  type SingleChoiceQuestion,
  type Survey,
  type SurveyRequest,
  type SurveyResult
} from '@hcengineering/survey'
import attachment from '@hcengineering/model-attachment'
import { type Attachment } from '@hcengineering/attachment'
import contact, { type Person } from '@hcengineering/contact'

export const DOMAIN_SURVEY = 'survey' as Domain

/** @public */
export function TypeRank (): Type<Rank> {
  return { _class: survey.class.TypeRank, label: survey.string.TypeRank }
}

/** @public */
export function TypeFraction (): Type<Fraction> {
  return { _class: survey.class.TypeFraction, label: survey.string.TypeFraction }
}

// FIXME: Currently, classes that extend TSpace and represent private spaces
//  cannot be stored in their own domain, as it breaks SpaceSecurityMiddleware.
//  @Model(survey.class.Survey, core.class.Space, DOMAIN_SURVEY)
/** @public */
@Model(survey.class.Survey, core.class.Space)
@UX(survey.string.Survey, survey.icon.Survey)
export class TSurvey extends TSpace implements Survey {
  @Prop(TypeString(), survey.string.SurveyName, { defaultValue: '' })
  @Index(IndexKind.FullText)
  override name: string = ''

  @Prop(TypeString(), core.string.Description, { defaultValue: '' })
  @Hidden()
  override description: Markup = ''

  @Prop(TypeBoolean(), core.string.Archived, { defaultValue: false })
  @Hidden()
  override archived: boolean = false

  @Prop(TypeBoolean(), core.string.Private, { defaultValue: true })
  @ReadOnly()
  override private: boolean = true

  @Prop(Collection(survey.class.Question), survey.string.Questions, { defaultValue: 0 })
    questions: CollectionSize<Question> = 0

  @Prop(Collection(survey.class.SurveyRequest), survey.string.SurveyRequests, { defaultValue: 0 })
    requests: CollectionSize<Question> = 0
}

/** @public */
@Model(survey.class.Question, core.class.AttachedDoc, DOMAIN_SURVEY)
export class TQuestion extends TAttachedDoc implements Question {
  @Prop(TypeRef(survey.class.Survey), core.string.Space)
  @Index(IndexKind.Indexed)
  @Hidden()
  declare space: Ref<Survey>

  @Prop(TypeRef(core.class.Class), core.string.AttachedToClass)
  @Index(IndexKind.Indexed)
  @Hidden()
  declare attachedToClass: Ref<Class<Survey>>

  @Prop(TypeRef(survey.class.Survey), core.string.AttachedTo)
  @Index(IndexKind.Indexed)
  @ReadOnly()
  declare attachedTo: Ref<Survey>

  @Prop(TypeString(), core.string.Collection, { defaultValue: 'questions' })
  @Hidden()
  override collection: 'questions' = 'questions'

  @Prop(TypeMarkup(), survey.string.Question)
  @Index(IndexKind.FullText)
    title: Markup = ''

  @Prop(TypeRank(), survey.string.Rank)
  @Index(IndexKind.Indexed)
  @Hidden()
    rank!: Rank

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments, {
    shortLabel: attachment.string.Files,
    defaultValue: 0
  })
    attachments: CollectionSize<Attachment> = 0

  assessment?: AssessmentData<this>
}

/** @public */
export function TypeQuestionOption (): Type<QuestionOption> {
  return { _class: survey.class.TypeQuestionOption, label: survey.string.Option }
}

/** @public */
@Model(survey.class.SingleChoiceQuestion, survey.class.Question)
@UX(survey.string.SingleChoice, survey.icon.RadioButton)
export class TSingleChoiceQuestion extends TQuestion implements SingleChoiceQuestion {
  @Prop(ArrOf(TypeQuestionOption()), survey.string.Options, { defaultValue: [] })
    options: QuestionOption[] = []

  @Prop(TypeBoolean(), survey.string.Shuffle, { defaultValue: false })
    shuffle: boolean = false

  @Prop({
    _class: survey.class.TypeSingleChoiceAssessmentData,
    label: survey.string.SingleChoice
  }, survey.string.Assessment)
  override assessment?: SingleChoiceAssessmentData = undefined
}

/** @public */
@Model(survey.class.MultipleChoiceQuestion, survey.class.Question)
@UX(survey.string.MultipleChoice, survey.icon.Checkbox)
export class TMultipleChoiceQuestion extends TQuestion implements MultipleChoiceQuestion {
  @Prop(ArrOf(TypeQuestionOption()), survey.string.Options, { defaultValue: [] })
    options: QuestionOption[] = []

  @Prop(TypeBoolean(), survey.string.Shuffle, { defaultValue: false })
    shuffle: boolean = false

  @Prop({
    _class: survey.class.TypeMultipleChoiceAssessmentData,
    label: survey.string.SingleChoice
  }, survey.string.Assessment)
  override assessment?: SingleChoiceAssessmentData = undefined
}

/** @public */
@Model(survey.class.ReorderQuestion, survey.class.Question)
@UX(survey.string.Reorder, survey.icon.Drag)
export class TReorderQuestion extends TQuestion implements ReorderQuestion {
  @Prop(ArrOf(TypeQuestionOption()), survey.string.Options, { defaultValue: [] })
    options: QuestionOption[] = []

  @Prop(TypeBoolean(), survey.string.Shuffle, { defaultValue: false })
    shuffle: boolean = false

  @Prop({
    _class: survey.class.TypeReorderAssessmentData,
    label: survey.string.SingleChoice
  }, survey.string.Assessment)
  override assessment?: ReorderAssessmentData = undefined
}

/** @public */
@Model(survey.class.SurveyRequest, core.class.AttachedDoc, DOMAIN_SURVEY)
export class TSurveyRequest extends TAttachedDoc implements SurveyRequest {
  @Prop(TypeRef(survey.class.Survey), core.string.Space)
  @Index(IndexKind.Indexed)
  @Hidden()
  declare space: Ref<Survey>

  @Prop(TypeRef(core.class.Class), core.string.AttachedToClass)
  @Index(IndexKind.Indexed)
  @Hidden()
  declare attachedToClass: Ref<Class<Survey>>

  @Prop(TypeRef(survey.class.Survey), core.string.AttachedTo)
  @Index(IndexKind.Indexed)
  @ReadOnly()
  declare attachedTo: Ref<Survey>

  @Prop(TypeString(), core.string.Collection, { defaultValue: 'requests' })
  @Hidden()
  override collection: 'requests' = 'requests'

  @Prop(TypeRef(contact.class.Person), survey.string.Assignee)
  @ReadOnly()
    assignee!: Ref<Person>

  @Prop(Collection(survey.class.SurveyResult), survey.string.SurveyResult, { defaultValue: 0 })
  @Index(IndexKind.Indexed)
    results: CollectionSize<SurveyResult> = 0
}

/** @public */
@Model(survey.class.SurveyResult, core.class.AttachedDoc, DOMAIN_SURVEY)
@UX(survey.string.SurveyResult)
export class TSurveyResult extends TAttachedDoc implements SurveyResult {
  @Prop(TypeRef(survey.class.Survey), core.string.Space)
  @Index(IndexKind.Indexed)
  @Hidden()
  declare space: Ref<Survey>

  @Prop(TypeRef(core.class.Class), core.string.AttachedToClass)
  @Index(IndexKind.Indexed)
  @Hidden()
  declare attachedToClass: Ref<Class<SurveyRequest>>

  @Prop(TypeRef(survey.class.Survey), core.string.AttachedTo)
  @Index(IndexKind.Indexed)
  @ReadOnly()
  declare attachedTo: Ref<SurveyRequest>

  @Prop(TypeString(), core.string.Collection, { defaultValue: 'results' })
  @Hidden()
  override collection: 'results' = 'results'

  @Prop(Collection(survey.class.Answer), survey.string.Answers, { defaultValue: 0 })
  @Index(IndexKind.Indexed)
    answers: CollectionSize<Answer<any>> = 0
}

/** @public */
@Model(survey.class.Answer, core.class.AttachedDoc, DOMAIN_SURVEY)
@UX(survey.string.Answer)
export class TAnswer<Q extends Question> extends TAttachedDoc implements Answer<Q> {
  @Prop(TypeRef(survey.class.Survey), core.string.Space)
  @Index(IndexKind.Indexed)
  @Hidden()
  declare space: Ref<Survey>

  @Prop(TypeRef(core.class.Class), core.string.AttachedToClass)
  @Index(IndexKind.Indexed)
  @Hidden()
  declare attachedToClass: Ref<Class<SurveyResult>>

  @Prop(TypeRef(survey.class.Survey), core.string.AttachedTo)
  @Index(IndexKind.Indexed)
  @ReadOnly()
  declare attachedTo: Ref<SurveyResult>

  @Prop(TypeString(), core.string.Collection, { defaultValue: 'answers' })
  @Hidden()
  override collection: 'answers' = 'answers'

  @Prop(TypeRef(core.class.Class), survey.string.Question)
  @Index(IndexKind.Indexed)
  @Hidden()
    questionClass!: Ref<Class<Q>>

  @Prop(TypeRef(survey.class.Question), survey.string.Question)
  @Index(IndexKind.Indexed)
  @ReadOnly()
    question!: Ref<Q>

  @Prop({
    _class: survey.class.TypeAnswerData,
    label: survey.string.SingleChoice
  }, survey.string.Answer)
    answer!: AnswerData<Q>

  @Prop(TypeFraction(), survey.string.Score)
  @Index(IndexKind.Indexed)
    score?: Fraction
}

/** @public */
@Mixin(survey.mixin.QuestionEditor, core.class.Class)
export class TQuestionEditor<Q extends Question> extends TClass implements QuestionEditor<Q> {
  editor!: QuestionEditorComponentTypeRef<Q>
}
