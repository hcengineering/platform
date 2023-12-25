import {
  type QuestionTypeInitAssessmentDataFunction,
  type SingleChoiceAssessmentData,
  type SingleChoiceQuestion
} from '@hcengineering/survey'
import { type ThemeOptions } from '@hcengineering/theme'
import { type Hierarchy } from '@hcengineering/core'

export const singleChoiceInitAssessmentData: QuestionTypeInitAssessmentDataFunction<SingleChoiceQuestion> = async (
  language: ThemeOptions['language'],
  hierarchy: Hierarchy,
  question: SingleChoiceQuestion
): Promise<SingleChoiceAssessmentData> => {
  return {
    weight: 1,
    correctAnswer: {
      selection: question.options.length > 1 ? 0 : null
    }
  }
}
