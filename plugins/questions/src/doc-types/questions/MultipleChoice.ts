//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import type { Answer, Assessment, Question, QuestionOption } from '../base'

/** @public */
export interface MultipleChoiceQuestionData {
  options: [QuestionOption, ...QuestionOption[]]
}

/** @public */
export interface MultipleChoiceAnswerData {
  selectedIndices: number[]
}

/** @public */
export interface MultipleChoiceAssessmentData {
  correctIndices: [number, ...number[]]
}

/** @public */
export type MultipleChoiceQuestion = Question<MultipleChoiceQuestionData>

/** @public */
export type MultipleChoiceQuestionAnswer = Answer<MultipleChoiceQuestion, MultipleChoiceAnswerData>

/** @public */
export type MultipleChoiceAssessment = Assessment<MultipleChoiceQuestionData, MultipleChoiceAssessmentData>

/** @public */
export type MultipleChoiceAssessmentAnswer = Answer<MultipleChoiceAssessment, MultipleChoiceAnswerData>
