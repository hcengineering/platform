//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import type { Answer, Assessment, Percentage, Question } from '@hcengineering/questions'
import type { Ref } from '@hcengineering/core'
import { assessAnswer } from './assessAnswer'
import { isAssessment } from './isAssessment'

export async function assessAnswers (
  questionsCollection: Array<Question<unknown>>,
  answersCollection: Array<Answer<Question<unknown>, unknown>>
): Promise<{
    assessmentsPassed: number
    assessmentsTotal: number
    score: Percentage
  }> {
  if (questionsCollection.length === 0) {
    return {
      assessmentsPassed: 0,
      assessmentsTotal: 0,
      score: 0
    }
  }

  const assessments = questionsCollection.filter(isAssessment)
  const assessmentsTotal = assessments.length
  if (assessmentsTotal === 0) {
    return {
      assessmentsPassed: 0,
      assessmentsTotal: 0,
      score: 0
    }
  }

  const answersMap = new Map<Ref<Question<unknown>>, Answer<Question<unknown>, unknown>>(
    answersCollection.map((answer) => [answer.question, answer])
  )

  let assessmentsPassed = 0

  for (const assessment of assessments) {
    const answer = answersMap.get(assessment._id)
    if (answer !== undefined) {
      const result = await assessAnswer(assessment, answer as Answer<Assessment<unknown, unknown>, unknown>)
      assessmentsPassed += result?.passed === true ? 1 : 0
    }
  }

  return {
    assessmentsPassed,
    assessmentsTotal,
    score: Math.ceil(100 * (assessmentsPassed / assessmentsTotal))
  }
}
