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
  type Account,
  type Class,
  type CollectionSize,
  type Domain,
  IndexKind,
  type Markup,
  type Ref,
  type Timestamp,
  type Type
} from '@hcengineering/core'
import core, { TAttachedDoc, TClass, TSpace, TType } from '@hcengineering/model-core'

import {
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
  TypeTimestamp,
  UX
} from '@hcengineering/model'
import survey from '../plugin'
import {
  type Answer,
  type AnswerDataOf,
  type AssessmentData,
  type Fraction,
  type Question,
  type QuestionOption,
  type QuestionType,
  type QuestionTypeEditorComponentType,
  type QuestionTypeInitAnswerDataFunction,
  type QuestionTypeInitAssessmentDataFunction,
  type QuestionTypeInitQuestionFunction,
  type QuestionTypePlayerComponentType,
  type Rank,
  type Survey,
  type SurveyResult
} from '@hcengineering/survey'
import attachment from '@hcengineering/model-attachment'
import { type Attachment } from '@hcengineering/attachment'
import { type Resource } from '@hcengineering/platform'

export const DOMAIN_SURVEY = 'survey' as Domain

/** @public */
@UX(survey.string.TypeRank)
@Model(survey.class.TypeRank, core.class.Type)
export class TTypeRank extends TType {}

/** @public */
export function TypeRank (): Type<Rank> {
  return { _class: survey.class.TypeRank, label: survey.string.TypeRank }
}

/** @public */
@UX(survey.string.TypeFraction)
@Model(survey.class.TypeFraction, core.class.Type)
export class TTypeFraction extends TType {}

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

  @Prop(Collection(survey.class.SurveyResult), survey.string.SurveyResults, { defaultValue: 0 })
    results: CollectionSize<SurveyResult> = 0
}

/** @public */
@Model(survey.class.Question, core.class.AttachedDoc, DOMAIN_SURVEY)
export class TQuestion<TAnswerData, TAssessmentData extends AssessmentData>
  extends TAttachedDoc
  implements Question<TAnswerData, TAssessmentData> {
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

  assessment: TAssessmentData | null = null
}

/** @public */
@UX(survey.string.Option)
@Model(survey.class.TypeQuestionOption, core.class.Type)
export class TTypeQuestionOption extends TType {}

/** @public */
export function TypeQuestionOption (): Type<QuestionOption> {
  return { _class: survey.class.TypeQuestionOption, label: survey.string.Option }
}

/** @public */
@Model(survey.class.SurveyResult, core.class.AttachedDoc, DOMAIN_SURVEY)
@UX(survey.string.SurveyResult)
export class TSurveyResult extends TAttachedDoc implements SurveyResult {
  @Prop(TypeRef(core.class.Doc), core.string.Id)
  @ReadOnly()
  declare _id: Ref<this>

  @Prop(TypeRef(survey.class.Survey), core.string.Space)
  @Index(IndexKind.Indexed)
  @Hidden()
  declare space: Ref<Survey>

  @Prop(TypeRef(survey.class.Survey), core.string.AttachedToClass)
  @Index(IndexKind.Indexed)
  @Hidden()
  declare attachedToClass: Ref<Class<Survey>>

  @Prop(TypeRef(survey.class.Survey), core.string.AttachedTo)
  @Index(IndexKind.Indexed)
  @ReadOnly()
  declare attachedTo: Ref<Survey>

  @Prop(TypeString(), core.string.Collection, { defaultValue: 'results' })
  @Hidden()
  override collection: 'results' = 'results'

  @Prop(Collection(survey.class.Answer), survey.string.Answers, { defaultValue: 0 })
  @Index(IndexKind.Indexed)
    answers: CollectionSize<Answer<any>> = 0

  @Prop(TypeTimestamp(), survey.string.SubmittedOn, { defaultValue: undefined })
  @Index(IndexKind.Indexed)
    submittedOn?: Timestamp

  @Prop(TypeRef(core.class.Account), survey.string.SubmittedBy, { defaultValue: undefined })
  @Index(IndexKind.Indexed)
    submittedBy?: Ref<Account>
}

/** @public */
@UX(survey.string.Answer)
@Model(survey.class.TypeAnswerData, core.class.Type)
export class TTypeAnswerData extends TType {}

/** @public */
export function TypeAnswerData (): Type<AnswerDataOf<any>> {
  return { _class: survey.class.TypeAnswerData, label: survey.string.Answer }
}

/** @public */
@Model(survey.class.Answer, core.class.AttachedDoc, DOMAIN_SURVEY)
@UX(survey.string.Answer)
export class TAnswer<TQuestion extends Question, TAnswerData extends AnswerDataOf<TQuestion> = AnswerDataOf<TQuestion>>
  extends TAttachedDoc
  implements Answer<TQuestion, TAnswerData> {
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
    questionClass!: Ref<Class<TQuestion>>

  @Prop(TypeRef(survey.class.Question), survey.string.Question)
  @Index(IndexKind.Indexed)
  @ReadOnly()
    question!: Ref<TQuestion>

  @Prop(TypeAnswerData(), survey.string.Answer)
    answer!: TAnswerData

  @Prop(TypeFraction(), survey.string.Score)
  @Index(IndexKind.Indexed)
    score?: Fraction
}

/** @public */
@Mixin(survey.mixin.QuestionType, core.class.Class)
export class TQuestionType<
    TQuestion extends Question,
    TAnswerData extends AnswerDataOf<TQuestion> = AnswerDataOf<TQuestion>
  >
  extends TClass
  implements QuestionType<TQuestion, TAnswerData> {
  initQuestion!: Resource<QuestionTypeInitQuestionFunction<TQuestion>>
  initAssessmentData?: Resource<QuestionTypeInitAssessmentDataFunction<TQuestion>>
  editor!: Resource<QuestionTypeEditorComponentType<TQuestion>>
  initAnswerData!: Resource<QuestionTypeInitAnswerDataFunction<TQuestion, TAnswerData>>
  player!: Resource<QuestionTypePlayerComponentType<TQuestion>>
}
