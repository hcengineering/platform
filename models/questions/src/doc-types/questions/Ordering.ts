//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import type {
  OrderingAnswerData,
  OrderingAssessment,
  OrderingAssessmentAnswer,
  OrderingAssessmentData,
  OrderingQuestion,
  OrderingQuestionAnswer,
  OrderingQuestionData
} from '@hcengineering/questions'
import { IndexKind, type Ref, type Type } from '@hcengineering/core'
import { Hidden, Index, Model, Prop, TypeRef, UX } from '@hcengineering/model'
import core, { TType } from '@hcengineering/model-core'
import questions from '../../plugin'
import { TAnswer, TAssessment, TQuestion } from '../base'

/** @public */
@Model(questions.class.OrderingQuestionData, core.class.Type)
@UX(questions.string.Question)
export class TOrderingQuestionData extends TType {}

/** @public */
export function TypeOrderingQuestionData (): Type<OrderingQuestionData> {
  return {
    _class: questions.class.OrderingQuestionData,
    label: questions.string.OrderingQuestion
  }
}

/** @public */
@Model(questions.class.OrderingAssessmentData, core.class.Type)
@UX(questions.string.Assessment)
export class TOrderingAssessmentData extends TType {}

/** @public */
export function TypeOrderingAssessmentData (): Type<OrderingAssessmentData> {
  return {
    _class: questions.class.OrderingAssessmentData,
    label: questions.string.OrderingAssessment
  }
}

/** @public */
@Model(questions.class.OrderingAnswerData, core.class.Type)
@UX(questions.string.Answer)
export class TOrderingAnswerData extends TType {}

/** @public */
export function TypeOrderingAnswerData (): Type<OrderingAnswerData> {
  return {
    _class: questions.class.OrderingAnswerData,
    label: questions.string.Ordering
  }
}

/** @public */
@Model(questions.class.OrderingQuestion, questions.class.Question)
@UX(questions.string.OrderingQuestion)
export class TOrderingQuestion extends TQuestion<OrderingQuestionData> implements OrderingQuestion {
  @Prop(TypeOrderingQuestionData(), questions.string.Question)
  declare questionData: OrderingQuestionData
}

/** @public */
@Model(questions.class.OrderingQuestionAnswer, questions.class.Answer)
@UX(questions.string.Ordering)
export class TOrderingQuestionAnswer
  extends TAnswer<OrderingQuestion, OrderingAnswerData>
  implements OrderingQuestionAnswer {
  @Prop(TypeRef(questions.class.OrderingQuestion), questions.string.Question)
  @Index(IndexKind.Indexed)
  @Hidden()
  declare question: Ref<OrderingQuestion>

  @Prop(TypeOrderingAnswerData(), questions.string.Answer)
  declare answerData: OrderingAnswerData
}

/** @public */
@Model(questions.class.OrderingAssessment, questions.class.Assessment)
@UX(questions.string.OrderingAssessment)
export class TOrderingAssessment
  extends TAssessment<OrderingQuestionData, OrderingAssessmentData>
  implements OrderingAssessment {
  @Prop(TypeOrderingAssessmentData(), questions.string.Assessment)
  declare assessmentData: OrderingAssessmentData
}

/** @public */
@Model(questions.class.OrderingAssessmentAnswer, questions.class.Answer)
@UX(questions.string.Ordering)
export class TOrderingAssessmentAnswer
  extends TAnswer<OrderingAssessment, OrderingAnswerData>
  implements OrderingAssessmentAnswer {
  @Prop(TypeRef(questions.class.OrderingAssessment), questions.string.Question)
  @Index(IndexKind.Indexed)
  @Hidden()
  declare question: Ref<OrderingAssessment>

  @Prop(TypeOrderingAnswerData(), questions.string.Answer)
  declare answerData: OrderingAnswerData
}
