import {
  type MultipleChoiceAssessmentData,
  type MultipleChoiceQuestion,
  type QuestionTypeInitAssessmentDataFunction
} from '@hcengineering/survey'
import { type ThemeOptions } from '@hcengineering/theme'
import { type Hierarchy } from '@hcengineering/core'

export const multipleChoiceInitAssessmentData: QuestionTypeInitAssessmentDataFunction<MultipleChoiceQuestion> = async (
  language: ThemeOptions['language'],
  hierarchy: Hierarchy,
  question: MultipleChoiceQuestion
): Promise<MultipleChoiceAssessmentData> => {
  return {
    weight: 1,
    correctAnswer: {
      selections: question.options.length > 1 ? [0] : []
    }
  }
}
