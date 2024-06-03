//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import type { Answer, Assessment, Question, QuestionOption } from '../base'

/** @public */
export interface SingleChoiceQuestionData {
  options: [QuestionOption, ...QuestionOption[]]
}

/** @public */
export interface SingleChoiceAnswerData {
  selectedIndex: number | null
}

/** @public */
export interface SingleChoiceAssessmentData {
  correctIndex: number
}

/** @public */
export type SingleChoiceQuestion = Question<SingleChoiceQuestionData>

/** @public */
export type SingleChoiceQuestionAnswer = Answer<SingleChoiceQuestion, SingleChoiceAnswerData>

/** @public */
export type SingleChoiceAssessment = Assessment<SingleChoiceQuestionData, SingleChoiceAssessmentData>

/** @public */
export type SingleChoiceAssessmentAnswer = Answer<SingleChoiceAssessment, SingleChoiceAnswerData>
