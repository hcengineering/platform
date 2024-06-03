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
  return {
    score:
      // eslint-disable-next-line @typescript-eslint/require-array-sort-compare
      answerData.selectedIndices.toSorted().join('~') === assessmentData.correctIndices.toSorted().join('~') ? 100 : 0
  }
}
