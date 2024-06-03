//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import {
  type QuestionInitFunction,
  type QuestionInitFunctionResult,
  type MultipleChoiceQuestion
} from '@hcengineering/questions'
import { type Hierarchy } from '@hcengineering/core'
import { translate } from '@hcengineering/platform'
import type { ThemeOptions } from '@hcengineering/theme'
import questions from '../plugin'

export const MultipleChoiceQuestionInit: QuestionInitFunction<MultipleChoiceQuestion> = async (
  language: ThemeOptions['language'],
  hierarchy: Hierarchy
): Promise<QuestionInitFunctionResult<MultipleChoiceQuestion>> => {
  return {
    title: await translate(questions.string.MultipleChoice, {}, language),
    questionData: {
      options: [{ label: '' }]
    }
  }
}
