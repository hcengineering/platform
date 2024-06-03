//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import {
  type QuestionInitFunction,
  type QuestionInitFunctionResult,
  type MultipleChoiceAssessment
} from '@hcengineering/questions'
import { type Hierarchy } from '@hcengineering/core'
import type { ThemeOptions } from '@hcengineering/theme'
import { MultipleChoiceQuestionInit } from './MultipleChoiceQuestionInit'

export const MultipleChoiceAssessmentInit: QuestionInitFunction<MultipleChoiceAssessment> = async (
  language: ThemeOptions['language'],
  hierarchy: Hierarchy
): Promise<QuestionInitFunctionResult<MultipleChoiceAssessment>> => {
  return {
    ...(await MultipleChoiceQuestionInit(language, hierarchy)),
    assessmentData: {
      correctIndices: [0]
    }
  }
}
