//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import {
  type QuestionInitFunction,
  type QuestionInitFunctionResult,
  type OrderingQuestion
} from '@hcengineering/questions'
import { type Hierarchy } from '@hcengineering/core'
import { translate } from '@hcengineering/platform'
import type { ThemeOptions } from '@hcengineering/theme'
import questions from '../plugin'

export const OrderingQuestionInit: QuestionInitFunction<OrderingQuestion> = async (
  language: ThemeOptions['language'],
  hierarchy: Hierarchy
): Promise<QuestionInitFunctionResult<OrderingQuestion>> => {
  return {
    title: await translate(questions.string.Ordering, {}, language),
    questionData: {
      options: [{ label: '' }]
    }
  }
}
