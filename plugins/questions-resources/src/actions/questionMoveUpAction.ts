//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import { getClient } from '@hcengineering/presentation'
import type { Question } from '@hcengineering/questions'
import { canUpdateQuestion, findPreviousQuestion, updateQuestion } from '../utils'
import { focusActionWithAvailability } from './ActionWithAvailability'

export const questionMoveUpAction = focusActionWithAvailability<Question<unknown>>(
  async (object: Question<unknown>) => {
    if (!canUpdateQuestion(object)) {
      return false
    }
    const prevQuestion = await findPreviousQuestion(object)
    return prevQuestion !== undefined
  },
  async (object: Question<unknown>) => {
    const prevQuestion = await findPreviousQuestion(object)
    if (prevQuestion === undefined) {
      return
    }
    const ops = getClient().apply()
    await updateQuestion(ops, object, { rank: prevQuestion.rank })
    await updateQuestion(ops, prevQuestion, { rank: object.rank })
    await ops.commit()
  }
)
