//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import { getClient } from '@hcengineering/presentation'
import type { Question } from '@hcengineering/questions'
import { canUpdateQuestion, findNextQuestion, updateQuestion } from '../utils'
import { focusActionWithAvailability } from './ActionWithAvailability'

export const questionMoveDownAction = focusActionWithAvailability<Question<unknown>>(
  async (object: Question<unknown>) => {
    if (!canUpdateQuestion(object)) {
      return false
    }
    const nextQuestion = await findNextQuestion(object)
    return nextQuestion !== undefined
  },
  async (object: Question<unknown>) => {
    const nextQuestion = await findNextQuestion(object)
    if (nextQuestion === undefined) {
      return
    }
    const ops = getClient().apply()
    await updateQuestion(ops, object, { rank: nextQuestion.rank })
    await updateQuestion(ops, nextQuestion, { rank: object.rank })
    await ops.commit()
  }
)
