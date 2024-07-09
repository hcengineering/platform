//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import type {
  AnswerDataAssessFunction,
  MultipleChoiceAssessment,
  MultipleChoiceAssessmentAnswer
} from '@hcengineering/questions'

/** @public */
export const MultipleChoiceAssessmentAssess: AnswerDataAssessFunction<
MultipleChoiceAssessment,
MultipleChoiceAssessmentAnswer
> = async (answerData, assessmentData) => {

  const adataIndexes = [...answerData.selectedIndices]
  adataIndexes.sort()

  const assembleData = assessmentData.correctIndices
  assembleData.sort()

  return {
    score:
      // eslint-disable-next-line @typescript-eslint/require-array-sort-compare
      adataIndexes.join('~') === assembleData.join('~') ? 100 : 0
  }
}
