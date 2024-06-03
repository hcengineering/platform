//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import type { Employee } from '@hcengineering/contact'
import { type AttachedDoc, type Ref, type Timestamp } from '@hcengineering/core'

/**
 * @public
 *
 * Value in percents. Typically, ∈ [0.0, 100.0],
 * but in some use-cases might be out of this range.
 *
 * TODO: Move to platform?
 */
export type Percentage = number

/**
 * @public
 *
 * @link https://www.npmjs.com/package/lexorank
 *
 * TODO: Move to platform?
 */
export type Rank = string

/** @public */
export interface Question<QuestionData extends NonNullable<any>> extends AttachedDoc {
  rank: Rank
  title: string
  owner: Ref<Employee>
  questionData: QuestionData
  releasedOn: Timestamp | null
  releasedBy: Ref<Employee> | null
}

/** @public */
export type QuestionDataOf<Q extends Question<any>> = Q extends Question<infer R> ? R : never

/** @public */
export interface Assessment<QuestionData extends NonNullable<any>, AssessmentData extends NonNullable<any>>
  extends Question<QuestionData> {
  assessmentData: AssessmentData
}

/** @public */
export type AssessmentDataOf<Q extends Assessment<any, any>> = Q extends Assessment<any, infer R> ? R : never

/** @public */
export interface Answer<Q extends Question<any>, AnswerData extends NonNullable<any>> extends AttachedDoc {
  question: Ref<Q>
  answerData: AnswerData
}

/** @public */
export type AnswerDataOf<A extends Answer<any, any>> = A extends Answer<any, infer R> ? R : never

/** @public */
export interface QuestionOption {
  label: string
}
