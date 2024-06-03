//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import type { Answer, Assessment, Percentage, Question, QuestionOption, Rank } from '@hcengineering/questions'
import contact, { type Employee } from '@hcengineering/contact'
import { type Domain, IndexKind, type Ref, type Timestamp, type Type } from '@hcengineering/core'
import { Hidden, Index, Model, Prop, TypeRef, TypeString, TypeTimestamp, UX } from '@hcengineering/model'
import core, { TAttachedDoc, TType } from '@hcengineering/model-core'
import questions from '../plugin'

export const DOMAIN_QUESTIONS = 'questions' as Domain

/** @public */
@Model(questions.type.Rank, core.class.Type)
@UX(questions.string.TypeRank)
export class TTypeRank extends TType {}

/** @public */
export function TypeRank (): Type<Rank> {
  return { _class: questions.type.Rank, label: questions.string.TypeRank }
}

/** @public */
@Model(questions.type.Percentage, core.class.Type)
@UX(questions.string.TypePercentage)
export class TTypePercentage extends TType {}

/** @public */
export function TypePercentage (): Type<Percentage> {
  return { _class: questions.type.Percentage, label: questions.string.TypePercentage }
}

/** @public */
@Model(questions.type.QuestionOption, core.class.Type)
@UX(questions.string.Option)
export class TTypeQuestionOption extends TType {}

/** @public */
export function TypeQuestionOption (): Type<QuestionOption> {
  return { _class: questions.type.QuestionOption, label: questions.string.TypeQuestionOption }
}

/** @public */
@Model(questions.class.Question, core.class.AttachedDoc, DOMAIN_QUESTIONS)
export class TQuestion<QuestionData extends NonNullable<any>> extends TAttachedDoc implements Question<QuestionData> {
  @Prop(TypeRank(), questions.string.Rank)
  @Index(IndexKind.Indexed)
  @Hidden()
    rank!: Rank

  @Prop(TypeString(), questions.string.Question)
  @Index(IndexKind.FullText)
    title: string = ''

  @Prop(TypeRef(contact.mixin.Employee), questions.string.Owner)
  @Index(IndexKind.Indexed)
    owner!: Ref<Employee>

  @Prop(TypeTimestamp(), questions.string.ReleasedDate)
  @Index(IndexKind.Indexed)
    releasedOn: Timestamp | null = null

  @Prop(TypeRef(contact.mixin.Employee), questions.string.ReleasedBy)
    releasedBy: Ref<Employee> | null = null

  // Should be overridden and decorated in child classes
  questionData!: QuestionData
}

/** @public */
@Model(questions.class.Assessment, questions.class.Question)
export class TAssessment<QuestionData extends NonNullable<any>, AssessmentData extends NonNullable<any>>
  extends TQuestion<QuestionData>
  implements Assessment<QuestionData, AssessmentData> {
  // Should be overridden and decorated in child classes
  assessmentData!: AssessmentData
}

/** @public */
@Model(questions.class.Answer, core.class.AttachedDoc, DOMAIN_QUESTIONS)
export class TAnswer<Q extends Question<any>, AnswerData extends NonNullable<any>>
  extends TAttachedDoc
  implements Answer<Q, AnswerData> {
  // Should be overridden and decorated in child classes
  question!: Ref<Q>

  // Should be overridden and decorated in child classes
  answerData!: AnswerData
}
