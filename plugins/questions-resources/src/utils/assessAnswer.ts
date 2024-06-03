//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import type { Answer, Assessment, Percentage, Question } from '@hcengineering/questions'
import { getResource } from '@hcengineering/platform'
import { getQuestionMixin } from './getQuestionMixin'
import { isAssessment } from './isAssessment'

export async function assessAnswer<Q extends Question<any>, A extends Answer<Q, any>> (
  question: Q,
  answer: A
): Promise<
  | {
    score: Percentage
    passed: boolean
  }
  | undefined
  > {
  if (!isAssessment(question)) {
    return undefined
  }
  const mixin = getQuestionMixin<Assessment<unknown, unknown>>(question._class)
  if (mixin.answerDataAssess === null) {
    return undefined
  }
  const fn = await getResource(mixin.answerDataAssess)
  const result = await fn(answer.answerData, question.assessmentData)
  return {
    score: result.score,
    passed: result.score === 100
  }
}
