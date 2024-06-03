//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import {
  type QuestionInitFunction,
  type QuestionInitFunctionResult,
  type SingleChoiceQuestion
} from '@hcengineering/questions'
import { type Hierarchy } from '@hcengineering/core'
import { translate } from '@hcengineering/platform'
import type { ThemeOptions } from '@hcengineering/theme'
import questions from '../plugin'

export const SingleChoiceQuestionInit: QuestionInitFunction<SingleChoiceQuestion> = async (
  language: ThemeOptions['language'],
  hierarchy: Hierarchy
): Promise<QuestionInitFunctionResult<SingleChoiceQuestion>> => {
  return {
    title: await translate(questions.string.SingleChoice, {}, language),
    questionData: {
      options: [{ label: '' }]
    }
  }
}
