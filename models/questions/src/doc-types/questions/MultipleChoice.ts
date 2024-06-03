//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import type {
  MultipleChoiceAnswerData,
  MultipleChoiceAssessment,
  MultipleChoiceAssessmentAnswer,
  MultipleChoiceAssessmentData,
  MultipleChoiceQuestion,
  MultipleChoiceQuestionAnswer,
  MultipleChoiceQuestionData
} from '@hcengineering/questions'
import { IndexKind, type Ref, type Type } from '@hcengineering/core'
import { Hidden, Index, Model, Prop, TypeRef, UX } from '@hcengineering/model'
import core, { TType } from '@hcengineering/model-core'
import questions from '../../plugin'
import { TAnswer, TAssessment, TQuestion } from '../base'

/** @public */
@Model(questions.class.MultipleChoiceQuestionData, core.class.Type)
@UX(questions.string.Question)
export class TMultipleChoiceQuestionData extends TType {}

/** @public */
export function TypeMultipleChoiceQuestionData (): Type<MultipleChoiceQuestionData> {
  return {
    _class: questions.class.MultipleChoiceQuestionData,
    label: questions.string.MultipleChoiceQuestion
  }
}

/** @public */
@Model(questions.class.MultipleChoiceAssessmentData, core.class.Type)
@UX(questions.string.Assessment)
export class TMultipleChoiceAssessmentData extends TType {}

/** @public */
export function TypeMultipleChoiceAssessmentData (): Type<MultipleChoiceAssessmentData> {
  return {
    _class: questions.class.MultipleChoiceAssessmentData,
    label: questions.string.MultipleChoiceAssessment
  }
}

/** @public */
@Model(questions.class.MultipleChoiceAnswerData, core.class.Type)
@UX(questions.string.Answer)
export class TMultipleChoiceAnswerData extends TType {}

/** @public */
export function TypeMultipleChoiceAnswerData (): Type<MultipleChoiceAnswerData> {
  return {
    _class: questions.class.MultipleChoiceAnswerData,
    label: questions.string.MultipleChoice
  }
}

/** @public */
@Model(questions.class.MultipleChoiceQuestion, questions.class.Question)
@UX(questions.string.MultipleChoiceQuestion)
export class TMultipleChoiceQuestion extends TQuestion<MultipleChoiceQuestionData> implements MultipleChoiceQuestion {
  @Prop(TypeMultipleChoiceQuestionData(), questions.string.Question)
  declare questionData: MultipleChoiceQuestionData
}

/** @public */
@Model(questions.class.MultipleChoiceQuestionAnswer, questions.class.Answer)
@UX(questions.string.MultipleChoice)
export class TMultipleChoiceQuestionAnswer
  extends TAnswer<MultipleChoiceQuestion, MultipleChoiceAnswerData>
  implements MultipleChoiceQuestionAnswer {
  @Prop(TypeRef(questions.class.MultipleChoiceQuestion), questions.string.Question)
  @Index(IndexKind.Indexed)
  @Hidden()
  declare question: Ref<MultipleChoiceQuestion>

  @Prop(TypeMultipleChoiceAnswerData(), questions.string.Answer)
  declare answerData: MultipleChoiceAnswerData
}

/** @public */
@Model(questions.class.MultipleChoiceAssessment, questions.class.Assessment)
@UX(questions.string.MultipleChoiceAssessment)
export class TMultipleChoiceAssessment
  extends TAssessment<MultipleChoiceQuestionData, MultipleChoiceAssessmentData>
  implements MultipleChoiceAssessment {
  @Prop(TypeMultipleChoiceAssessmentData(), questions.string.Assessment)
  declare assessmentData: MultipleChoiceAssessmentData
}

/** @public */
@Model(questions.class.MultipleChoiceAssessmentAnswer, questions.class.Answer)
@UX(questions.string.MultipleChoice)
export class TMultipleChoiceAssessmentAnswer
  extends TAnswer<MultipleChoiceAssessment, MultipleChoiceAnswerData>
  implements MultipleChoiceAssessmentAnswer {
  @Prop(TypeRef(questions.class.MultipleChoiceAssessment), questions.string.Question)
  @Index(IndexKind.Indexed)
  @Hidden()
  declare question: Ref<MultipleChoiceAssessment>

  @Prop(TypeMultipleChoiceAnswerData(), questions.string.Answer)
  declare answerData: MultipleChoiceAnswerData
}
