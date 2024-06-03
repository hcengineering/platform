//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import {
  type QuestionInitFunction,
  type QuestionInitFunctionResult,
  type SingleChoiceAssessment
} from '@hcengineering/questions'
import { type Hierarchy } from '@hcengineering/core'
import type { ThemeOptions } from '@hcengineering/theme'
import { SingleChoiceQuestionInit } from './SingleChoiceQuestionInit'

export const SingleChoiceAssessmentInit: QuestionInitFunction<SingleChoiceAssessment> = async (
  language: ThemeOptions['language'],
  hierarchy: Hierarchy
): Promise<QuestionInitFunctionResult<SingleChoiceAssessment>> => {
  return {
    ...(await SingleChoiceQuestionInit(language, hierarchy)),
    assessmentData: {
      correctIndex: 0
    }
  }
}
