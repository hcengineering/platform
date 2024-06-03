//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import type { Answer, Assessment, Question, QuestionOption } from '../base'

// Position of the option in answer, counting from 1
export type OrderingPosition = number

/** @public */
export interface OrderingQuestionData {
  options: [QuestionOption, ...QuestionOption[]]
}

/** @public */
export interface OrderingAnswerData {
  order: [OrderingPosition, ...OrderingPosition[]]
}

/** @public */
export interface OrderingAssessmentData {
  // Each i-th item is a correct position (counting from 1) of the i-th option from question data,
  // e.g. [2,3,1] means that the first option should be on the second position,
  // the second option - on the third, and the last option - on the first
  correctOrder: [OrderingPosition, ...OrderingPosition[]]
}

/** @public */
export type OrderingQuestion = Question<OrderingQuestionData>

/** @public */
export type OrderingQuestionAnswer = Answer<OrderingQuestion, OrderingAnswerData>

/** @public */
export type OrderingAssessment = Assessment<OrderingQuestionData, OrderingAssessmentData>

/** @public */
export type OrderingAssessmentAnswer = Answer<OrderingAssessment, OrderingAnswerData>
