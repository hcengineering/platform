//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import type {
  SingleChoiceAnswerData,
  SingleChoiceAssessment,
  SingleChoiceAssessmentAnswer,
  SingleChoiceAssessmentData,
  SingleChoiceQuestion,
  SingleChoiceQuestionAnswer,
  SingleChoiceQuestionData
} from '@hcengineering/questions'
import { IndexKind, type Ref, type Type } from '@hcengineering/core'
import { Hidden, Index, Model, Prop, TypeRef, UX } from '@hcengineering/model'
import core, { TType } from '@hcengineering/model-core'
import questions from '../../plugin'
import { TAnswer, TAssessment, TQuestion } from '../base'

/** @public */
@Model(questions.class.SingleChoiceQuestionData, core.class.Type)
@UX(questions.string.Question)
export class TSingleChoiceQuestionData extends TType {}

/** @public */
export function TypeSingleChoiceQuestionData (): Type<SingleChoiceQuestionData> {
  return {
    _class: questions.class.SingleChoiceQuestionData,
    label: questions.string.SingleChoiceQuestion
  }
}

/** @public */
@Model(questions.class.SingleChoiceAssessmentData, core.class.Type)
@UX(questions.string.Assessment)
export class TSingleChoiceAssessmentData extends TType {}

/** @public */
export function TypeSingleChoiceAssessmentData (): Type<SingleChoiceAssessmentData> {
  return {
    _class: questions.class.SingleChoiceAssessmentData,
    label: questions.string.SingleChoiceAssessment
  }
}

/** @public */
@Model(questions.class.SingleChoiceAnswerData, core.class.Type)
@UX(questions.string.Answer)
export class TSingleChoiceAnswerData extends TType {}

/** @public */
export function TypeSingleChoiceAnswerData (): Type<SingleChoiceAnswerData> {
  return {
    _class: questions.class.SingleChoiceAnswerData,
    label: questions.string.SingleChoice
  }
}

/** @public */
@Model(questions.class.SingleChoiceQuestion, questions.class.Question)
@UX(questions.string.SingleChoiceQuestion)
export class TSingleChoiceQuestion extends TQuestion<SingleChoiceQuestionData> implements SingleChoiceQuestion {
  @Prop(TypeSingleChoiceQuestionData(), questions.string.Question)
  declare questionData: SingleChoiceQuestionData
}

/** @public */
@Model(questions.class.SingleChoiceQuestionAnswer, questions.class.Answer)
@UX(questions.string.SingleChoice)
export class TSingleChoiceQuestionAnswer
  extends TAnswer<SingleChoiceQuestion, SingleChoiceAnswerData>
  implements SingleChoiceQuestionAnswer {
  @Prop(TypeRef(questions.class.SingleChoiceQuestion), questions.string.Question)
  @Index(IndexKind.Indexed)
  @Hidden()
  declare question: Ref<SingleChoiceQuestion>

  @Prop(TypeSingleChoiceAnswerData(), questions.string.Answer)
  declare answerData: SingleChoiceAnswerData
}

/** @public */
@Model(questions.class.SingleChoiceAssessment, questions.class.Assessment)
@UX(questions.string.SingleChoiceAssessment)
export class TSingleChoiceAssessment
  extends TAssessment<SingleChoiceQuestionData, SingleChoiceAssessmentData>
  implements SingleChoiceAssessment {
  @Prop(TypeSingleChoiceAssessmentData(), questions.string.Assessment)
  declare assessmentData: SingleChoiceAssessmentData
}

/** @public */
@Model(questions.class.SingleChoiceAssessmentAnswer, questions.class.Answer)
@UX(questions.string.SingleChoice)
export class TSingleChoiceAssessmentAnswer
  extends TAnswer<SingleChoiceAssessment, SingleChoiceAnswerData>
  implements SingleChoiceAssessmentAnswer {
  @Prop(TypeRef(questions.class.SingleChoiceAssessment), questions.string.Question)
  @Index(IndexKind.Indexed)
  @Hidden()
  declare question: Ref<SingleChoiceAssessment>

  @Prop(TypeSingleChoiceAnswerData(), questions.string.Answer)
  declare answerData: SingleChoiceAnswerData
}
